import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum CheckInType {
  GPS = 'GPS',
  WIFI = 'WIFI',
  QR_CODE = 'QR_CODE',
  FIELD = 'FIELD',
}

export enum AttendanceStatus {
  ON_TIME = 'on_time',
  LATE = 'late',
  EARLY_LEAVE = 'early_leave',
  ABSENT = 'absent',
  OVERTIME = 'overtime',
}

@Entity('attendance_records')
@Index(['employeeId', 'checkInTime'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'employee_id', type: 'bigint' })
  @Index()
  employeeId: number;

  @Column({ name: 'shift_schedule_id', type: 'bigint', nullable: true })
  shiftScheduleId: number | null;

  /** GPS / WIFI / QR_CODE / FIELD */
  @Column({
    type: 'varchar',
    length: 20,
    default: CheckInType.GPS,
    enum: CheckInType,
  })
  type: CheckInType;

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date | null;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime: Date | null;

  /** Latitude of check-in location */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  /** Longitude of check-in location */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  /** Workplace/store latitude for distance validation */
  @Column({ name: 'workplace_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  workplaceLatitude: number | null;

  /** Workplace/store longitude for distance validation */
  @Column({ name: 'workplace_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  workplaceLongitude: number | null;

  /** Distance from workplace in meters at check-in */
  @Column({ name: 'distance_meters', type: 'int', nullable: true })
  distanceMeters: number | null;

  /** Minutes late (positive) or early (negative) relative to shift start */
  @Column({ name: 'late_minutes', type: 'int', default: 0 })
  lateMinutes: number;

  /** Overtime hours worked beyond shift end */
  @Column({
    name: 'overtime_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  overtimeHours: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: AttendanceStatus.ON_TIME,
    enum: AttendanceStatus,
  })
  status: AttendanceStatus;

  /** Device identifier / user-agent */
  @Column({ type: 'varchar', length: 200, nullable: true })
  device: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
