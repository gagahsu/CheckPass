import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
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
  ApiParam,
} from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { ApplyLeaveDto, ApproveLeaveDto, RejectLeaveDto } from './dto/leave.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/guards/roles.guard';

@ApiTags('leave')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /**
   * Return all available leave types.
   */
  @Get('types')
  @ApiOperation({ summary: '假別列表' })
  @ApiResponse({ status: 200, description: '所有假別' })
  async getLeaveTypes() {
    return this.leaveService.getLeaveTypes();
  }

  /**
   * Submit a new leave application.
   */
  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply for leave',
    description: 'Submit a new leave request for the authenticated employee.',
  })
  @ApiResponse({ status: 201, description: 'Leave request submitted' })
  @ApiResponse({ status: 400, description: 'Invalid dates or overlapping leave period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async apply(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApplyLeaveDto,
  ) {
    return this.leaveService.apply(user.employeeId, dto);
  }

  /**
   * Get all leave requests for the current employee.
   */
  @Get('my-requests')
  @ApiOperation({
    summary: 'My leave requests',
    description: 'Returns all leave applications submitted by the authenticated employee.',
  })
  @ApiResponse({ status: 200, description: 'List of leave requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRequests(@CurrentUser() user: JwtPayload) {
    return this.leaveService.getMyRequests(user.employeeId);
  }

  /**
   * List all pending approvals (manager / HR only).
   */
  @Get('pending-approvals')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({
    summary: 'Pending leave approvals (manager)',
    description:
      'Returns all pending leave requests awaiting manager or HR review. ' +
      'Requires manager, hr, or admin role.',
  })
  @ApiResponse({ status: 200, description: 'List of pending leave requests' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires manager role' })
  async getPendingApprovals(@CurrentUser() user: JwtPayload) {
    return this.leaveService.getPendingApprovals(user.employeeId);
  }

  /**
   * Approve a leave request (manager / HR only).
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({
    summary: 'Approve leave request',
    description: 'Approve a pending leave request. Requires manager, hr, or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID', type: Number })
  @ApiResponse({ status: 200, description: 'Leave request approved' })
  @ApiResponse({ status: 400, description: 'Request is not pending' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.approve(id, user.employeeId, dto.comment);
  }

  /**
   * Cancel a pending leave request (own only).
   */
  @Patch(':id/cancel')
  @ApiOperation({ summary: '取消假單（本人）' })
  @ApiParam({ name: 'id', description: 'Leave request ID', type: Number })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  @ApiResponse({ status: 400, description: 'Request is not pending' })
  @ApiResponse({ status: 403, description: 'Not your leave request' })
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveService.cancelLeave(id, user.employeeId);
  }

  /**
   * Reject a leave request (manager / HR only).
   */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('manager', 'hr', 'admin')
  @ApiOperation({
    summary: 'Reject leave request',
    description: 'Reject a pending leave request with a reason. Requires manager, hr, or admin role.',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID', type: Number })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  @ApiResponse({ status: 400, description: 'Request is not pending' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectLeaveDto,
  ) {
    return this.leaveService.reject(id, user.employeeId, dto);
  }
}
