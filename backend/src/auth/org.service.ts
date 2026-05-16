import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { CreateDepartmentDto, UpdateDepartmentDto, CreatePositionDto, UpdatePositionDto } from './dto/org.dto';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Position) private readonly posRepo: Repository<Position>,
  ) {}

  // ─── Department ────────────────────────────────────────────────────────────

  listDepartments(): Promise<Department[]> {
    return this.deptRepo.find({ order: { name: 'ASC' } });
  }

  async getDepartment(id: number): Promise<Department> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`Department #${id} not found`);
    return dept;
  }

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    const dept = this.deptRepo.create({
      name: dto.name,
      code: dto.code ?? null,
      managerId: dto.managerId ?? null,
      parentId: dto.parentId ?? null,
    });
    return this.deptRepo.save(dept);
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.getDepartment(id);
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.code !== undefined) dept.code = dto.code ?? null;
    if (dto.managerId !== undefined) dept.managerId = dto.managerId ?? null;
    if (dto.parentId !== undefined) dept.parentId = dto.parentId ?? null;
    return this.deptRepo.save(dept);
  }

  async deleteDepartment(id: number): Promise<void> {
    const dept = await this.getDepartment(id);
    await this.deptRepo.remove(dept);
  }

  // ─── Position ──────────────────────────────────────────────────────────────

  listPositions(departmentId?: number): Promise<Position[]> {
    return this.posRepo.find({
      where: departmentId ? { departmentId } : {},
      order: { level: 'ASC', name: 'ASC' },
    });
  }

  async getPosition(id: number): Promise<Position> {
    const pos = await this.posRepo.findOne({ where: { id } });
    if (!pos) throw new NotFoundException(`Position #${id} not found`);
    return pos;
  }

  async createPosition(dto: CreatePositionDto): Promise<Position> {
    const pos = this.posRepo.create({
      name: dto.name,
      departmentId: dto.departmentId ?? null,
      level: dto.level ?? 1,
    });
    return this.posRepo.save(pos);
  }

  async updatePosition(id: number, dto: UpdatePositionDto): Promise<Position> {
    const pos = await this.getPosition(id);
    if (dto.name !== undefined) pos.name = dto.name;
    if (dto.departmentId !== undefined) pos.departmentId = dto.departmentId ?? null;
    if (dto.level !== undefined) pos.level = dto.level;
    return this.posRepo.save(pos);
  }

  async deletePosition(id: number): Promise<void> {
    const pos = await this.getPosition(id);
    await this.posRepo.remove(pos);
  }
}
