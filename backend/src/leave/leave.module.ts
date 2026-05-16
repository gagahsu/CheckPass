import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveType } from './entities/leave-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, LeaveType])],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
