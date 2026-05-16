import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { CreateDepartmentDto, UpdateDepartmentDto, CreatePositionDto, UpdatePositionDto } from './dto/org.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('org')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('departments')
  @ApiOperation({ summary: '部門列表' })
  listDepartments() { return this.orgService.listDepartments(); }

  @Get('departments/:id')
  @ApiOperation({ summary: '部門詳情' })
  @ApiParam({ name: 'id', type: Number })
  getDepartment(@Param('id', ParseIntPipe) id: number) { return this.orgService.getDepartment(id); }

  @Post('departments')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新增部門（HR）' })
  createDepartment(@Body() dto: CreateDepartmentDto) { return this.orgService.createDepartment(dto); }

  @Patch('departments/:id')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @ApiOperation({ summary: '更新部門（HR）' })
  @ApiParam({ name: 'id', type: Number })
  updateDepartment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.orgService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '刪除部門（admin）' })
  @ApiParam({ name: 'id', type: Number })
  async deleteDepartment(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.orgService.deleteDepartment(id);
  }

  @Get('positions')
  @ApiOperation({ summary: '職位列表' })
  @ApiQuery({ name: 'departmentId', required: false, type: Number })
  listPositions(@Query('departmentId') departmentId?: string) {
    return this.orgService.listPositions(departmentId ? +departmentId : undefined);
  }

  @Post('positions')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新增職位（HR）' })
  createPosition(@Body() dto: CreatePositionDto) { return this.orgService.createPosition(dto); }

  @Patch('positions/:id')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @ApiOperation({ summary: '更新職位（HR）' })
  @ApiParam({ name: 'id', type: Number })
  updatePosition(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePositionDto) {
    return this.orgService.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '刪除職位（admin）' })
  @ApiParam({ name: 'id', type: Number })
  async deletePosition(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.orgService.deletePosition(id);
  }
}
