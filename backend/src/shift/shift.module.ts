import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { ShiftType } from './entities/shift-type.entity';
import { ShiftSchedule } from './entities/shift-schedule.entity';
import { Employee } from '../auth/entities/employee.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftType, ShiftSchedule, Employee, LeaveRequest]), NotificationModule],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
