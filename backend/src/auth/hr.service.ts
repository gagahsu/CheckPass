import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Role } from './entities/role.entity';
import { UpdateEmployeeDto, AssignRolesDto } from './dto/hr.dto';

export interface EmployeeRow {
  id: number;
  empNo: string;
  name: string;
  email: string | null;
  lineUserId: string | null;
  departmentId: number | null;
  positionId: number | null;
  hireDate: string | null;
  status: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async listEmployees(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
  }): Promise<{
    data: EmployeeRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page, pageSize, search, status } = params;
    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.roles', 'roles')
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (search) {
      qb.andWhere(
        '(e.name ILIKE :s OR e.empNo ILIKE :s OR e.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (status) {
      qb.andWhere('e.status = :status', { status });
    }

    const [employees, total] = await qb.getManyAndCount();
    return {
      data: employees.map((e) => this.toRow(e)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getEmployee(id: number): Promise<EmployeeRow> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);
    return this.toRow(employee);
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<EmployeeRow> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);

    if (dto.name !== undefined) employee.name = dto.name;
    if (dto.email !== undefined) employee.email = dto.email || null;
    if (dto.hireDate !== undefined)
      employee.hireDate = dto.hireDate ? (new Date(dto.hireDate) as unknown as Date) : null;
    if (dto.status !== undefined) employee.status = dto.status;

    await this.employeeRepo.save(employee);
    return this.toRow(employee);
  }

  async assignRoles(id: number, dto: AssignRolesDto): Promise<EmployeeRow> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);

    const allRoles = await this.roleRepo.find();
    const roleMap = new Map(allRoles.map((r) => [r.name, r]));
    const newRoles: Role[] = [];

    for (const roleName of dto.roleNames) {
      const role = roleMap.get(roleName);
      if (!role) throw new BadRequestException(`Role '${roleName}' not found`);
      newRoles.push(role);
    }

    employee.roles = newRoles;
    await this.employeeRepo.save(employee);
    return this.toRow(employee);
  }

  private toRow(e: Employee): EmployeeRow {
    return {
      id: Number(e.id),
      empNo: e.empNo,
      name: e.name,
      email: e.email,
      lineUserId: e.lineUserId,
      departmentId: e.departmentId ? Number(e.departmentId) : null,
      positionId: e.positionId ? Number(e.positionId) : null,
      hireDate: e.hireDate
        ? new Date(e.hireDate as unknown as string).toISOString().split('T')[0]
        : null,
      status: e.status,
      roles: (e.roles ?? []).map((r) => r.name),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
