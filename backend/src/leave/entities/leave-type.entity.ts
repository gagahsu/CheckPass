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
}

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 30,
    unique: true,
    enum: LeaveCode,
  })
  code: LeaveCode;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
