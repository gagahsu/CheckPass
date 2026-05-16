import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr', 'admin')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: '稽核日誌列表（hr/admin）' })
  @ApiQuery({ name: 'entityType', required: false, description: 'attendance | payroll' })
  @ApiQuery({ name: 'actorId',    required: false, type: Number })
  @ApiQuery({ name: 'startDate',  required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate',    required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page',       required: false, type: Number })
  @ApiQuery({ name: 'pageSize',   required: false, type: Number })
  @ApiResponse({ status: 200, description: '分頁稽核日誌' })
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('actorId')    actorId?: string,
    @Query('startDate')  startDate?: string,
    @Query('endDate')    endDate?: string,
    @Query('page')       page?: string,
    @Query('pageSize')   pageSize?: string,
  ) {
    return this.auditService.findAll({
      entityType,
      actorId:  actorId  ? parseInt(actorId,  10) : undefined,
      startDate,
      endDate,
      page:     page     ? parseInt(page,     10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
