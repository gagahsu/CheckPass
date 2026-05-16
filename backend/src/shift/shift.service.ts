import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftType } from './entities/shift-type.entity';
import { ShiftSchedule, ScheduleStatus } from './entities/shift-schedule.entity';
import { CreateShiftTypeDto, AssignShiftDto, PublishScheduleDto } from './dto/shift.dto';
import { Employee } from '../auth/entities/employee.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ShiftService {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    @InjectRepository(ShiftType)
    private readonly shiftTypeRepo: Repository<ShiftType>,
    @InjectRepository(ShiftSchedule)
    private readonly scheduleRepo: Repository<ShiftSchedule>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Shift Types
  // ---------------------------------------------------------------------------

  /**
   * Return all shift types for a given store (or company-wide if storeId is null).
   */
  async getShiftTypes(storeId?: number): Promise<ShiftType[]> {
    if (storeId != null) {
      return this.shiftTypeRepo.find({
        where: { storeId },
        order: { startTime: 'ASC' },
      });
    }
    return this.shiftTypeRepo.find({ order: { startTime: 'ASC' } });
  }

  /**
   * Create a new shift type.
   */
  async createShiftType(dto: CreateShiftTypeDto): Promise<ShiftType> {
    this.validateTimeRange(dto.startTime, dto.endTime);

    const shiftType = this.shiftTypeRepo.create({
      storeId: dto.storeId ?? null,
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      breakMinutes: dto.breakMinutes ?? 60,
      graceMinutes: dto.graceMinutes ?? 5,
      color: dto.color ?? '#06b6d4',
      minStaff: dto.minStaff ?? 1,
      maxStaff: dto.maxStaff ?? 10,
    });

    const saved = await this.shiftTypeRepo.save(shiftType);
    this.logger.log(`Created shift type "${saved.name}" (id=${saved.id})`);
    return saved;
  }

  // ---------------------------------------------------------------------------
  // Shift Schedules
  // ---------------------------------------------------------------------------

  /**
   * Assign an employee to a shift (creates a draft schedule entry).
   */
  async assignShift(dto: AssignShiftDto): Promise<ShiftSchedule> {
    // Validate shift type exists
    const shiftType = await this.shiftTypeRepo.findOne({
      where: { id: dto.shiftTypeId },
    });
    if (!shiftType) {
      throw new NotFoundException(`Shift type #${dto.shiftTypeId} not found`);
    }

    // Prevent duplicate assignment
    const existing = await this.scheduleRepo.findOne({
      where: { employeeId: dto.employeeId, date: dto.date },
    });
    if (existing) {
      throw new BadRequestException(
        `Employee #${dto.employeeId} already has a shift assignment on ${dto.date}`,
      );
    }

    const schedule = this.scheduleRepo.create({
      employeeId: dto.employeeId,
      shiftTypeId: dto.shiftTypeId,
      date: dto.date,
      status: ScheduleStatus.DRAFT,
    });

    const saved = await this.scheduleRepo.save(schedule);
    this.logger.log(
      `Assigned employee #${dto.employeeId} to shift #${dto.shiftTypeId} on ${dto.date}`,
    );
    return saved;
  }

  /**
   * Remove a shift schedule entry (draft or published).
   */
  async removeShift(scheduleId: number): Promise<void> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException(`Shift schedule #${scheduleId} not found`);
    }
    await this.scheduleRepo.remove(schedule);
    this.logger.log(`Removed shift schedule #${scheduleId}`);
  }

  /**
   * Publish all draft schedules for a store in a given week.
   * weekStart must be a Monday (YYYY-MM-DD).
   */
  async publishSchedule(dto: PublishScheduleDto): Promise<{ published: number }> {
    const weekEnd = this.addDays(dto.weekStart, 6);

    const drafts = await this.scheduleRepo
      .createQueryBuilder('s')
      .innerJoin(ShiftType, 'st', 's.shiftTypeId = st.id AND st.storeId = :storeId', {
        storeId: dto.storeId,
      })
      .where('s.status = :status', { status: ScheduleStatus.DRAFT })
      .andWhere('s.date >= :weekStart AND s.date <= :weekEnd', {
        weekStart: dto.weekStart,
        weekEnd,
      })
      .getMany();

    if (drafts.length === 0) {
      throw new BadRequestException(
        `No draft schedules found for store #${dto.storeId} in the week of ${dto.weekStart}`,
      );
    }

    await Promise.all(
      drafts.map((d) => {
        d.status = ScheduleStatus.PUBLISHED;
        return this.scheduleRepo.save(d);
      }),
    );

    this.logger.log(
      `Published ${drafts.length} schedules for store #${dto.storeId}, week of ${dto.weekStart}`,
    );

    // Notify affected employees via LINE (async, don't block response)
    void this.afterPublish(dto.storeId, drafts);

    return { published: drafts.length };
  }

  /**
   * Retrieve the weekly schedule for a store, optionally filtered by weekStart.
   */
  async getSchedule(
    storeId: number,
    weekStart: string,
  ): Promise<ShiftSchedule[]> {
    const weekEnd = this.addDays(weekStart, 6);

    return this.scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.shiftType', 'st')
      .where('st.storeId = :storeId', { storeId })
      .andWhere('s.date >= :weekStart AND s.date <= :weekEnd', {
        weekStart,
        weekEnd,
      })
      .orderBy('s.date', 'ASC')
      .addOrderBy('st.startTime', 'ASC')
      .getMany();
  }

  /**
   * Retrieve the weekly schedule for a specific employee.
   */
  async getMySchedule(employeeId: number, weekStart: string): Promise<ShiftSchedule[]> {
    const weekEnd = this.addDays(weekStart, 6);
    return this.scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.shiftType', 'st')
      .where('s.employeeId = :employeeId', { employeeId })
      .andWhere('s.date >= :weekStart AND s.date <= :weekEnd', { weekStart, weekEnd })
      .orderBy('s.date', 'ASC')
      .getMany();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async afterPublish(storeId: number, drafts: ShiftSchedule[]): Promise<void> {
    const uniqueEmployeeIds = [...new Set(drafts.map(s => s.employeeId))];
    for (const empId of uniqueEmployeeIds) {
      const employee = await this.employeeRepo.findOne({ where: { id: empId } });
      if (employee?.lineUserId) {
        await this.notificationService
          .sendLinePush(employee.lineUserId, `${employee.name} 您好！\n本週班表已發布，請確認您的排班。`)
          .catch(() => {});
      }
    }
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Allow overnight shifts (e.g. 22:00 → 06:00)
    if (startMinutes === endMinutes) {
      throw new BadRequestException('Start time and end time cannot be identical');
    }
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
