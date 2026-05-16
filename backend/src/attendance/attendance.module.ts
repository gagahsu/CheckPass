import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { WorkplaceSetting } from './entities/workplace-setting.entity';
import { Employee } from '../auth/entities/employee.entity';
import { ShiftSchedule } from '../shift/entities/shift-schedule.entity';
import { NotificationModule } from '../notification/notification.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, WorkplaceSetting, Employee, ShiftSchedule]),
    NotificationModule,
    SseModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
