import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ShiftService } from './shift.service';
import { CreateShiftTypeDto, AssignShiftDto, PublishScheduleDto } from './dto/shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';

@ApiTags('shift')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  /**
   * List all shift types for a store.
   */
  @Get('types')
  @ApiOperation({
    summary: 'List shift types',
    description: 'Returns all shift type definitions. Filter by storeId to get store-specific shifts.',
  })
  @ApiQuery({
    name: 'storeId',
    description: 'Store ID to filter shift types',
    required: false,
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'List of shift types' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShiftTypes(@Query('storeId') storeId?: string) {
    const id = storeId != null ? parseInt(storeId, 10) : undefined;
    return this.shiftService.getShiftTypes(id);
  }

  /**
   * Create a new shift type (manager / admin only).
   */
  @Post('types')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create shift type',
    description: 'Create a new shift type definition. Requires manager, hr, or admin role.',
  })
  @ApiResponse({ status: 201, description: 'Shift type created' })
  @ApiResponse({ status: 400, description: 'Invalid time range' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires manager role' })
  async createShiftType(@Body() dto: CreateShiftTypeDto) {
    return this.shiftService.createShiftType(dto);
  }

  /**
   * Get the weekly schedule for a store.
   */
  @Get('schedule')
  @ApiOperation({
    summary: 'Get weekly schedule',
    description: 'Returns all shift assignments for the given store and week.',
  })
  @ApiQuery({ name: 'storeId', description: 'Store ID', type: Number })
  @ApiQuery({
    name: 'weekStart',
    description: 'Start of the work week (Monday) in YYYY-MM-DD',
    example: '2026-05-18',
  })
  @ApiResponse({ status: 200, description: 'Weekly shift schedule' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSchedule(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Query('weekStart') weekStart: string,
  ) {
    return this.shiftService.getSchedule(storeId, weekStart);
  }

  /**
   * Get the full monthly schedule for a store.
   */
  @Get('schedule/month')
  @ApiOperation({ summary: '月班表' })
  @ApiQuery({ name: 'storeId', type: Number })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'month', type: Number })
  @ApiResponse({ status: 200, description: '月班表排班記錄' })
  async getMonthSchedule(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.shiftService.getMonthSchedule(storeId, year, month);
  }

  /**
   * Get the current employee's weekly schedule.
   */
  @Get('my-schedule')
  @ApiOperation({ summary: '我的本週班表' })
  @ApiQuery({ name: 'weekStart', description: 'YYYY-MM-DD (Monday)', example: '2026-05-18' })
  @ApiResponse({ status: 200, description: '個人班表' })
  async getMySchedule(
    @CurrentUser() user: JwtPayload,
    @Query('weekStart') weekStart: string,
  ) {
    return this.shiftService.getMySchedule(user.employeeId, weekStart);
  }

  /**
   * Assign an employee to a shift (draft).
   */
  @Post('schedule')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign employee to shift',
    description:
      'Create a draft shift assignment for an employee. Requires manager, hr, or admin role.',
  })
  @ApiResponse({ status: 201, description: 'Shift assignment created (draft)' })
  @ApiResponse({ status: 400, description: 'Employee already has a shift on that date' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires manager role' })
  async assignShift(@Body() dto: AssignShiftDto) {
    return this.shiftService.assignShift(dto);
  }

  /**
   * Remove a shift assignment.
   */
  @Delete('schedule/:id')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove shift assignment',
    description: 'Delete a shift schedule entry. Requires manager, hr, or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Schedule entry ID', type: Number })
  @ApiResponse({ status: 204, description: 'Shift assignment removed' })
  @ApiResponse({ status: 404, description: 'Schedule entry not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async removeShift(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.shiftService.removeShift(id);
  }

  /**
   * Publish a week's schedule (changes all draft entries to published).
   */
  @Post('schedule/publish')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish weekly schedule',
    description:
      'Mark all draft shift assignments for a store and week as published. ' +
      'Requires manager, hr, or admin role.',
  })
  @ApiResponse({ status: 200, description: 'Published count returned' })
  @ApiResponse({ status: 400, description: 'No draft schedules found for the given period' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async publishSchedule(@Body() dto: PublishScheduleDto) {
    return this.shiftService.publishSchedule(dto);
  }
}
