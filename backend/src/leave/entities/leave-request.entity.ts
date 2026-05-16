import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LeaveType } from './leave-type.entity';

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('leave_requests')
@Index(['employeeId', 'startDate'])
export class LeaveRequest {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'employee_id', type: 'bigint' })
  @Index()
  employeeId: number;

  @Column({ name: 'leave_type_id', type: 'bigint' })
  leaveTypeId: number;

  @ManyToOne(() => LeaveType, { eager: true, nullable: false })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;

  /** Inclusive start date of the leave period */
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  /** Inclusive end date of the leave period */
  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: LeaveRequestStatus.PENDING,
    enum: LeaveRequestStatus,
  })
  status: LeaveRequestStatus;

  /** Employee ID of the approver (manager / HR) */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  /** Optional rejection reason */
  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
