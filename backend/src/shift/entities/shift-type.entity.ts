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

  /** Store / location identifier — null means company-wide */
  @Column({ name: 'store_id', type: 'bigint', nullable: true })
  @Index()
  storeId: number | null;

  @Column({ name: 'shift_name', type: 'varchar', length: 100 })
  shiftName: string;

  /** Shift start time stored as HH:MM string (e.g. "09:00") */
  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  /** Shift end time stored as HH:MM string (e.g. "18:00") */
  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  /** Break duration in minutes */
  @Column({ name: 'break_minutes', type: 'int', default: 60 })
  breakMinutes: number;

  /** Minimum staff required for this shift */
  @Column({ name: 'min_staff', type: 'int', default: 1 })
  minStaff: number;

  /** Maximum staff allowed for this shift */
  @Column({ name: 'max_staff', type: 'int', default: 10 })
  maxStaff: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
