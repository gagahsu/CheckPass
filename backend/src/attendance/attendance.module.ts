import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceSchedulerService } from './attendance-scheduler.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { WorkplaceSetting } from './entities/workplace-setting.entity';
import { Employee } from '../auth/entities/employee.entity';
import { ShiftSchedule } from '../shift/entities/shift-schedule.entity';
import { NotificationModule } from '../notification/notification.module';
import { SseModule } from '../sse/sse.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AttendanceRecord, WorkplaceSetting, Employee, ShiftSchedule]),
    NotificationModule,
    SseModule,
    AuditModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceSchedulerService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
