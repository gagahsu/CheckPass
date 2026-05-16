import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { ShiftType } from './entities/shift-type.entity';
import { ShiftSchedule } from './entities/shift-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftType, ShiftSchedule])],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
