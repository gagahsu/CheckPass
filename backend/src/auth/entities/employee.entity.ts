import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'emp_no', type: 'varchar', length: 20, unique: true })
  empNo: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true, nullable: true })
  email: string | null;

  @Column({ name: 'line_user_id', type: 'varchar', length: 100, unique: true, nullable: true })
  lineUserId: string | null;

  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  @Column({ name: 'position_id', type: 'bigint', nullable: true })
  positionId: number | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'employee_roles',
    joinColumn: { name: 'employee_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
