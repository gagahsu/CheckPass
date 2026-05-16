import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, LeaveRequestStatus } from './entities/leave-request.entity';
import { LeaveType } from './entities/leave-type.entity';
import { ApplyLeaveDto, RejectLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepo: Repository<LeaveType>,
  ) {}

  /**
   * Submit a new leave application.
   */
  async apply(employeeId: number, dto: ApplyLeaveDto): Promise<LeaveRequest> {
    // Validate leave type
    const leaveType = await this.leaveTypeRepo.findOne({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) {
      throw new NotFoundException(`Leave type #${dto.leaveTypeId} not found`);
    }

    // Validate date range
    const start = new Date(`${dto.startDate}T00:00:00`);
    const end = new Date(`${dto.endDate}T23:59:59`);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

    // Check for overlapping pending/approved leaves
    const overlapping = await this.leaveRequestRepo
      .createQueryBuilder('lr')
      .where('lr.employeeId = :employeeId', { employeeId })
      .andWhere('lr.status IN (:...statuses)', {
        statuses: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED],
      })
      .andWhere('lr.startDate <= :endDate AND lr.endDate >= :startDate', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getCount();

    if (overlapping > 0) {
      throw new BadRequestException(
        'You have an existing pending or approved leave that overlaps with the requested period.',
      );
    }

    const request = this.leaveRequestRepo.create({
      employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason ?? null,
      status: LeaveRequestStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
    });

    const saved = await this.leaveRequestRepo.save(request);
    this.logger.log(
      `Employee #${employeeId} applied for ${leaveType.code} leave from ${dto.startDate} to ${dto.endDate}`,
    );
    return saved;
  }

  /**
   * Manager / HR approves a leave request.
   */
  async approve(
    requestId: number,
    managerId: number,
    comment?: string,
  ): Promise<LeaveRequest> {
    const request = await this.findOrFail(requestId);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request #${requestId} is already ${request.status} and cannot be approved again.`,
      );
    }

    request.status = LeaveRequestStatus.APPROVED;
    request.approvedBy = managerId;
    request.approvedAt = new Date();
    if (comment) {
      request.rejectReason = null; // clear any previous rejection reason
    }

    const saved = await this.leaveRequestRepo.save(request);
    this.logger.log(`Manager #${managerId} approved leave request #${requestId}`);
    return saved;
  }

  /**
   * Manager / HR rejects a leave request.
   */
  async reject(
    requestId: number,
    managerId: number,
    dto: RejectLeaveDto,
  ): Promise<LeaveRequest> {
    const request = await this.findOrFail(requestId);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request #${requestId} is already ${request.status} and cannot be rejected.`,
      );
    }

    request.status = LeaveRequestStatus.REJECTED;
    request.approvedBy = managerId;
    request.approvedAt = new Date();
    request.rejectReason = dto.reason;

    const saved = await this.leaveRequestRepo.save(request);
    this.logger.log(
      `Manager #${managerId} rejected leave request #${requestId}: ${dto.reason}`,
    );
    return saved;
  }

  /**
   * Return all leave requests submitted by the authenticated employee.
   */
  async getMyRequests(employeeId: number): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.find({
      where: { employeeId },
      relations: ['leaveType'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Return all pending leave requests for the manager to review.
   * Phase-0: returns all pending requests; Phase 1 will filter by department.
   */
  async getPendingApprovals(_managerId: number): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.find({
      where: { status: LeaveRequestStatus.PENDING },
      relations: ['leaveType'],
      order: { createdAt: 'ASC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findOrFail(requestId: number): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findOne({
      where: { id: requestId },
      relations: ['leaveType'],
    });
    if (!request) {
      throw new NotFoundException(`Leave request #${requestId} not found`);
    }
    return request;
  }
}
