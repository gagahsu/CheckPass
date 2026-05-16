import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('shift_types')
export class ShiftType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'store_id', type: 'bigint', nullable: true })
  @Index()
  storeId: number | null;

  /** Display name of the shift (stored as shift_name in DB) */
  @Column({ name: 'shift_name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'break_minutes', type: 'int', default: 60 })
  breakMinutes: number;

  /** Tardiness grace period in minutes */
  @Column({ name: 'grace_minutes', type: 'int', default: 5 })
  graceMinutes: number;

  @Column({ name: 'min_staff', type: 'int', default: 1 })
  minStaff: number;

  @Column({ name: 'max_staff', type: 'int', default: 10 })
  maxStaff: number;

  /** Hex color for calendar display */
  @Column({ type: 'varchar', length: 20, default: '#06b6d4' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
