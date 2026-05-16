import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
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
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, AttendanceQueryDto, CreateWorkplaceDto, UpdateWorkplaceDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, JwtPayload } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('attendance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '上班打卡' })
  @ApiResponse({ status: 201, description: '打卡成功' })
  @ApiResponse({ status: 400, description: '已打卡或距離過遠' })
  async checkIn(@CurrentUser() user: JwtPayload, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user.employeeId, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '下班打卡' })
  @ApiResponse({ status: 200, description: '下班打卡成功，含加班計算結果' })
  @ApiResponse({ status: 400, description: '尚未打上班卡或已打過下班卡' })
  async checkOut(@CurrentUser() user: JwtPayload, @Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(user.employeeId, dto);
  }

  @Get('records')
  @ApiOperation({ summary: '出勤記錄查詢（分頁）' })
  @ApiResponse({ status: 200, description: '分頁出勤記錄' })
  async getRecords(@CurrentUser() user: JwtPayload, @Query() query: AttendanceQueryDto) {
    return this.attendanceService.getRecords(user.employeeId, query);
  }

  @Get('today')
  @ApiOperation({ summary: '今日打卡狀態' })
  @ApiResponse({ status: 200, description: '今日打卡記錄（未打卡時回傳 null）' })
  async getToday(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.getTodayRecord(user.employeeId);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: '個人儀表板統計（今日打卡 + 週/月工時）' })
  @ApiResponse({ status: 200, description: '儀表板統計資料' })
  async getDashboardStats(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.getDashboardStats(user.employeeId);
  }

  @Get('summary')
  @ApiOperation({ summary: '個人工時摘要' })
  @ApiQuery({ name: 'period', enum: ['week', 'month'], description: '統計週期' })
  @ApiResponse({ status: 200, description: '工時統計' })
  async getWorkHoursSummary(
    @CurrentUser() user: JwtPayload,
    @Query('period') period: 'week' | 'month' = 'month',
  ) {
    return this.attendanceService.getWorkHoursSummary(user.employeeId, period);
  }

  @Get('department-summary')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({ summary: '部門出勤摘要（主管）' })
  @ApiQuery({ name: 'date', description: 'YYYY-MM-DD', example: '2026-05-16' })
  @ApiResponse({ status: 200, description: '部門出勤摘要' })
  @ApiResponse({ status: 403, description: '需要主管以上權限' })
  async getDepartmentSummary(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDepartmentSummary(user.employeeId, date);
  }

  @Get('trend')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({ summary: '出勤趨勢（N 天，manager+）' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: '天數，預設 30' })
  @ApiResponse({ status: 200, description: '每日出勤人數統計陣列' })
  async getAttendanceTrend(@Query('days') days?: string) {
    const n = Math.min(90, Math.max(7, parseInt(days ?? '30', 10) || 30));
    return this.attendanceService.getAttendanceTrend(n);
  }

  // ─── Workplace Settings (admin) ──────────────────────────────────────────────

  @Get('workplaces')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '工作地點列表（admin）' })
  async listWorkplaces() {
    return this.attendanceService.listWorkplaces();
  }

  @Post('workplaces')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新增工作地點（admin）' })
  async createWorkplace(@Body() dto: CreateWorkplaceDto) {
    return this.attendanceService.createWorkplace(dto);
  }

  @Patch('workplaces/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新工作地點（admin）' })
  @ApiParam({ name: 'id', type: Number })
  async updateWorkplace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkplaceDto,
  ) {
    return this.attendanceService.updateWorkplace(id, dto);
  }

  @Delete('workplaces/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '刪除工作地點（admin）' })
  @ApiParam({ name: 'id', type: Number })
  async deleteWorkplace(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attendanceService.deleteWorkplace(id);
  }
}
