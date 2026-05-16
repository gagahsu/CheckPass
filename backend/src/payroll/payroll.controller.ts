import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { CalculatePayrollDto, GetPayrollDto } from './dto/payroll.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';

@ApiTags('payroll')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /**
   * View a payroll slip. Employees see their own; HR/admin can view any.
   */
  @Get()
  @ApiOperation({
    summary: 'Get payroll slip',
    description:
      'Returns the payroll record for the given year/month. ' +
      'Employees always see their own payroll. ' +
      'HR and admin may supply employeeId to view any employee\'s record.',
  })
  @ApiQuery({ name: 'year', type: Number, description: 'Payroll year', example: 2026 })
  @ApiQuery({ name: 'month', type: Number, description: 'Payroll month (1–12)', example: 5 })
  @ApiQuery({
    name: 'employeeId',
    type: Number,
    required: false,
    description: 'Target employee ID (HR/admin only)',
  })
  @ApiResponse({ status: 200, description: 'Payroll slip' })
  @ApiResponse({ status: 404, description: 'No payroll record found for the period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPayroll(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetPayrollDto,
  ) {
    // Employees can only view their own payroll
    const isHrOrAdmin = user.roles.some((r) => ['hr', 'admin'].includes(r));
    const targetEmployeeId =
      isHrOrAdmin && query.employeeId ? query.employeeId : user.employeeId;

    return this.payrollService.getPayroll(targetEmployeeId, query.year, query.month);
  }

  /**
   * HR lists all employees' payroll for a given month.
   */
  @Get('list')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @ApiOperation({ summary: '全員薪資列表（HR）' })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'month', type: Number })
  async listPayrolls(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.payrollService.listPayrolls(year, month);
  }

  /**
   * HR triggers payroll calculation for an employee.
   */
  @Post('calculate')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate payroll (HR)',
    description:
      'Calculates (or recalculates) the payroll for the given employee and period. ' +
      'Requires hr or admin role. Cannot recalculate a confirmed payroll.',
  })
  @ApiResponse({ status: 200, description: 'Payroll calculated/updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid period' })
  @ApiResponse({ status: 409, description: 'Payroll is already confirmed' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires HR role' })
  async calculate(@Body() dto: CalculatePayrollDto) {
    return this.payrollService.calculate(dto);
  }

  /**
   * HR sends payroll notifications to all employees with confirmed payrolls for a month.
   */
  @Post('batch-notify')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '全員薪資通知（HR）' })
  @ApiResponse({ status: 200, description: '通知已發送，返回通知人數' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async batchNotify(
    @Body('year', ParseIntPipe) year: number,
    @Body('month', ParseIntPipe) month: number,
  ) {
    return this.payrollService.batchNotify(year, month);
  }

  /**
   * HR confirms a calculated payroll record.
   */
  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm payroll (HR)',
    description:
      'Marks a payroll record as confirmed (finalised). ' +
      'Once confirmed it cannot be recalculated. Requires hr or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Payroll record ID', type: Number })
  @ApiResponse({ status: 200, description: 'Payroll confirmed' })
  @ApiResponse({ status: 404, description: 'Payroll not found' })
  @ApiResponse({ status: 409, description: 'Already confirmed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async confirm(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.payrollService.confirm(id, user.employeeId);
  }
}
