import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { HrService } from './hr.service';
import { UpdateEmployeeDto, AssignRolesDto } from './dto/hr.dto';

@ApiTags('hr')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({ summary: '員工清單（分頁）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: '分頁員工清單' })
  @ApiResponse({ status: 403, description: '需要主管以上權限' })
  async listEmployees(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.hrService.listEmployees({ page, pageSize, search, status });
  }

  @Get('employees/:id')
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({ summary: '員工詳情' })
  @ApiResponse({ status: 200, description: '員工資料' })
  @ApiResponse({ status: 404, description: '找不到員工' })
  async getEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.hrService.getEmployee(id);
  }

  @Patch('employees/:id')
  @Roles('hr', 'admin')
  @ApiOperation({ summary: '更新員工基本資料（HR / 管理員）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '找不到員工' })
  async updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrService.updateEmployee(id, dto);
  }

  @Patch('employees/:id/roles')
  @Roles('admin')
  @ApiOperation({ summary: '指派角色（管理員）' })
  @ApiResponse({ status: 200, description: '角色更新成功' })
  @ApiResponse({ status: 400, description: '無效角色名稱' })
  @ApiResponse({ status: 404, description: '找不到員工' })
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ) {
    return this.hrService.assignRoles(id, dto);
  }
}
