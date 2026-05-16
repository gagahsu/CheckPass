import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { Payroll } from './entities/payroll.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payroll, AttendanceRecord])],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
