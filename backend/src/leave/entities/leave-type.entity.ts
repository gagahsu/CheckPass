import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum LeaveCode {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  MARRIAGE = 'MARRIAGE',
  BEREAVEMENT = 'BEREAVEMENT',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  OTHER = 'OTHER',
}

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 30, unique: true, enum: LeaveCode })
  code: LeaveCode;

  @Column({ name: 'max_days_per_year', type: 'int', nullable: true })
  maxDaysPerYear: number | null;

  @Column({ name: 'is_paid', type: 'boolean', default: true })
  isPaid: boolean;

  @Column({ name: 'requires_attachment', type: 'boolean', default: false })
  requiresAttachment: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
