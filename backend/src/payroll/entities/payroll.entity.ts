import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PayrollStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}

@Entity('payrolls')
@Index(['employeeId', 'year', 'month'], { unique: true })
export class Payroll {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'employee_id', type: 'bigint' })
  @Index()
  employeeId: number;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'smallint' })
  month: number;

  /** Base monthly salary in TWD */
  @Column({
    name: 'base_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  baseSalary: number;

  /** Overtime pay in TWD */
  @Column({
    name: 'overtime_pay',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  overtimePay: number;

  /** Total deductions (NHI, labor insurance, income tax advance, etc.) */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deduction: number;

  /** Net pay: base_salary + overtime_pay - deduction */
  @Column({
    name: 'total_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalSalary: number;

  /** Overtime hours worked in the month */
  @Column({
    name: 'overtime_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
  })
  overtimeHours: number;

  /** Working days present in the month */
  @Column({ name: 'working_days', type: 'int', default: 0 })
  workingDays: number;

  /** Late-arrival minutes total */
  @Column({ name: 'late_minutes', type: 'int', default: 0 })
  lateMinutes: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: PayrollStatus.DRAFT,
    enum: PayrollStatus,
  })
  status: PayrollStatus;

  /** HR employee ID who confirmed the payroll */
  @Column({ name: 'confirmed_by', type: 'bigint', nullable: true })
  confirmedBy: number | null;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
