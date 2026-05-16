import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditQuery {
  entityType?: string;
  actorId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    actorId: number,
    action: string,
    entityType: string,
    entityId?: number,
    payload?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const entry = this.repo.create({
        actorId,
        action,
        entityType,
        entityId: entityId ?? null,
        payload: payload ?? null,
        ipAddress: ipAddress ?? null,
      });
      await this.repo.save(entry);
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async findAll(query: AuditQuery): Promise<{ data: AuditLog[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const skip = (page - 1) * pageSize;

    const qb = this.repo.createQueryBuilder('al').orderBy('al.createdAt', 'DESC');

    if (query.entityType) qb.andWhere('al.entityType = :et', { et: query.entityType });
    if (query.actorId)    qb.andWhere('al.actorId = :aid', { aid: query.actorId });

    if (query.startDate && query.endDate) {
      qb.andWhere('al.createdAt BETWEEN :start AND :end', {
        start: new Date(`${query.startDate}T00:00:00`),
        end:   new Date(`${query.endDate}T23:59:59`),
      });
    }

    const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
    return { data, total, page, pageSize };
  }
}
