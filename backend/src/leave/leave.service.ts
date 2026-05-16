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
import { Employee } from '../auth/entities/employee.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepo: Repository<LeaveType>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly notificationService: NotificationService,
  ) {}

  async getLeaveTypes(): Promise<LeaveType[]> {
    return this.leaveTypeRepo.find({ order: { id: 'ASC' } });
  }

  async apply(employeeId: number, dto: ApplyLeaveDto): Promise<LeaveRequest> {
    const leaveType = await this.leaveTypeRepo.findOne({ where: { id: dto.leaveTypeId } });
    if (!leaveType) {
      throw new NotFoundException(`Leave type #${dto.leaveTypeId} not found`);
    }

    const start = new Date(`${dto.startDate}T00:00:00`);
    const end = new Date(`${dto.endDate}T23:59:59`);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }

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

  async approve(requestId: number, managerId: number, comment?: string): Promise<LeaveRequest> {
    const request = await this.findOrFail(requestId);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request #${requestId} is already ${request.status} and cannot be approved.`,
      );
    }

    request.status = LeaveRequestStatus.APPROVED;
    request.approvedBy = managerId;
    request.approvedAt = new Date();
    if (comment) request.rejectReason = null;

    const saved = await this.leaveRequestRepo.save(request);
    this.logger.log(`Manager #${managerId} approved leave request #${requestId}`);
    this.afterDecision(request.employeeId, request.leaveType.name, true).catch(() => {});
    return saved;
  }

  async reject(requestId: number, managerId: number, dto: RejectLeaveDto): Promise<LeaveRequest> {
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
    this.logger.log(`Manager #${managerId} rejected leave request #${requestId}: ${dto.reason}`);
    this.afterDecision(request.employeeId, request.leaveType.name, false).catch(() => {});
    return saved;
  }

  async cancelLeave(requestId: number, employeeId: number): Promise<LeaveRequest> {
    const request = await this.findOrFail(requestId);

    if (Number(request.employeeId) !== employeeId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request #${requestId} is already ${request.status} and cannot be cancelled.`,
      );
    }

    request.status = LeaveRequestStatus.CANCELLED;
    const saved = await this.leaveRequestRepo.save(request);
    this.logger.log(`Employee #${employeeId} cancelled leave request #${requestId}`);
    return saved;
  }

  async getMyRequests(employeeId: number): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.find({
      where: { employeeId },
      relations: ['leaveType'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingApprovals(_managerId: number): Promise<LeaveRequest[]> {
    return this.leaveRequestRepo.find({
      where: { status: LeaveRequestStatus.PENDING },
      relations: ['leaveType'],
      order: { createdAt: 'ASC' },
    });
  }

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

  private async afterDecision(
    employeeId: number,
    leaveTypeName: string,
    approved: boolean,
  ): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
    if (!employee?.lineUserId) return;
    const text = this.notificationService.buildLeaveResultMessage(
      employee.name,
      leaveTypeName,
      approved,
    );
    await this.notificationService.sendLinePush(employee.lineUserId, text);
  }
}
