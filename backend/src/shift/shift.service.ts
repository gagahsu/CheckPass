import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftType } from './entities/shift-type.entity';
import { ShiftSchedule, ScheduleStatus } from './entities/shift-schedule.entity';
import { CreateShiftTypeDto, UpdateShiftTypeDto, AssignShiftDto, PublishScheduleDto } from './dto/shift.dto';
import { Employee } from '../auth/entities/employee.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
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
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
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

  async updateShiftType(id: number, dto: UpdateShiftTypeDto): Promise<ShiftType> {
    const shiftType = await this.shiftTypeRepo.findOne({ where: { id } });
    if (!shiftType) throw new NotFoundException(`ShiftType #${id} not found`);

    if (dto.startTime || dto.endTime) {
      this.validateTimeRange(dto.startTime ?? shiftType.startTime, dto.endTime ?? shiftType.endTime);
    }

    if (dto.name !== undefined) shiftType.name = dto.name;
    if (dto.startTime !== undefined) shiftType.startTime = dto.startTime;
    if (dto.endTime !== undefined) shiftType.endTime = dto.endTime;
    if (dto.breakMinutes !== undefined) shiftType.breakMinutes = dto.breakMinutes;
    if (dto.graceMinutes !== undefined) shiftType.graceMinutes = dto.graceMinutes;
    if (dto.minStaff !== undefined) shiftType.minStaff = dto.minStaff;
    if (dto.maxStaff !== undefined) shiftType.maxStaff = dto.maxStaff;
    if (dto.color !== undefined) shiftType.color = dto.color;

    const saved = await this.shiftTypeRepo.save(shiftType);
    this.logger.log(`Updated shift type "${saved.name}" (id=${saved.id})`);
    return saved;
  }

  async deleteShiftType(id: number): Promise<void> {
    const shiftType = await this.shiftTypeRepo.findOne({ where: { id } });
    if (!shiftType) throw new NotFoundException(`ShiftType #${id} not found`);

    const inUse = await this.scheduleRepo.count({ where: { shiftTypeId: id } });
    if (inUse > 0) {
      throw new BadRequestException(`此班別已有 ${inUse} 筆排班記錄，無法刪除。請先移除所有排班再刪除班別。`);
    }

    await this.shiftTypeRepo.remove(shiftType);
    this.logger.log(`Deleted shift type #${id}`);
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

    // Check for leave conflicts (pending, manager_approved, or approved leave)
    const leaveConflict = await this.leaveRequestRepo
      .createQueryBuilder('lr')
      .where('lr.employeeId = :employeeId', { employeeId: dto.employeeId })
      .andWhere('lr.status IN (:...statuses)', {
        statuses: ['pending', 'manager_approved', 'approved'],
      })
      .andWhere('lr.startDate <= :date AND lr.endDate >= :date', { date: dto.date })
      .getCount();

    if (leaveConflict > 0) {
      throw new ConflictException(
        `Employee #${dto.employeeId} has an active leave request on ${dto.date}`,
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
   * Retrieve the full monthly schedule for a store.
   */
  async getMonthSchedule(storeId: number, year: number, month: number): Promise<ShiftSchedule[]> {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.shiftType', 'st')
      .where('st.storeId = :storeId', { storeId })
      .andWhere('s.date >= :monthStart AND s.date <= :monthEnd', { monthStart, monthEnd })
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
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
}
