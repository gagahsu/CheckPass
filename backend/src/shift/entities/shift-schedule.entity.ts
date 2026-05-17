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
  @Column({
    type: 'date',
    transformer: {
      to: (v: string) => v,
      from: (v: string | Date) => {
        if (v instanceof Date) {
          const y = v.getFullYear()
          const m = String(v.getMonth() + 1).padStart(2, '0')
          const d = String(v.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
        return String(v).slice(0, 10)
      },
    },
  })
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
