import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShiftType } from './shift-type.entity';

export enum ScheduleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('shift_schedules')
@Index(['employeeId', 'date'])
export class ShiftSchedule {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'employee_id', type: 'bigint' })
  @Index()
  employeeId: number;

  @Column({ name: 'shift_type_id', type: 'bigint' })
  shiftTypeId: number;

  @ManyToOne(() => ShiftType, { eager: false, nullable: false })
  @JoinColumn({ name: 'shift_type_id' })
  shiftType: ShiftType;

  /** Scheduled work date (YYYY-MM-DD) */
  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ScheduleStatus.DRAFT,
    enum: ScheduleStatus,
  })
  status: ScheduleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
