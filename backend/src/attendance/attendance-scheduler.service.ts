import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { ShiftSchedule } from '../shift/entities/shift-schedule.entity';

@Injectable()
export class AttendanceSchedulerService {
  private readonly logger = new Logger(AttendanceSchedulerService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    @InjectRepository(ShiftSchedule)
    private readonly shiftScheduleRepo: Repository<ShiftSchedule>,
  ) {}

  /**
   * Run at 23:30 every day.
   * Find all employees who had a shift today but never checked in, and mark them absent.
   */
  @Cron('30 23 * * *', { timeZone: 'Asia/Taipei' })
  async markDailyAbsences(): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    this.logger.log(`Running daily absence check for ${dateStr}`);

    // Find published shift schedules for today
    const schedules = await this.shiftScheduleRepo.find({
      where: {
        date: today as unknown as string,
        status: 'published',
      },
    });

    this.logger.log(`Found ${schedules.length} shifts scheduled for today`);

    let markedCount = 0;
    for (const schedule of schedules) {
      try {
        await this.attendanceService.markAbsent(schedule.employeeId, today);
        markedCount++;
      } catch (err) {
        this.logger.error(`Failed to mark absence for employee ${schedule.employeeId}`, err);
      }
    }

    this.logger.log(`Absence marking complete: ${markedCount} records created`);
  }
}
