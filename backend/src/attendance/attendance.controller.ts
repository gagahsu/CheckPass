import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, AttendanceQueryDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';

@ApiTags('attendance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Employee checks in for the day.
   */
  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Check in',
    description:
      'Record the authenticated employee\'s check-in. ' +
      'For GPS type, latitude and longitude are required and the distance ' +
      'from the workplace must be within the allowed radius.',
  })
  @ApiResponse({ status: 201, description: 'Check-in recorded successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in or too far from workplace' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkIn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.employeeId, dto);
  }

  /**
   * Employee checks out for the day.
   */
  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check out',
    description:
      'Record the authenticated employee\'s check-out. ' +
      'Overtime is calculated automatically based on worked hours.',
  })
  @ApiResponse({ status: 200, description: 'Check-out recorded, returns updated record' })
  @ApiResponse({ status: 400, description: 'No open check-in record found, or already checked out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkOut(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(user.employeeId, dto);
  }

  /**
   * Retrieve attendance records (paginated).
   */
  @Get('records')
  @ApiOperation({
    summary: 'List attendance records',
    description: 'Returns paginated attendance records for the authenticated employee.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of attendance records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecords(
    @CurrentUser() user: JwtPayload,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendanceService.getRecords(user.employeeId, query);
  }

  /**
   * Manager-only: department attendance summary for a specific date.
   */
  @Get('department-summary')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({
    summary: 'Department attendance summary (manager)',
    description:
      'Returns an attendance summary for the manager\'s department on a given date. ' +
      'Requires manager, hr, or admin role.',
  })
  @ApiQuery({ name: 'date', description: 'Date in YYYY-MM-DD format', example: '2026-05-16' })
  @ApiResponse({ status: 200, description: 'Department attendance summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires manager role' })
  async getDepartmentSummary(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDepartmentSummary(user.employeeId, date);
  }
}
