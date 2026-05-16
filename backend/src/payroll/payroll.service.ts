import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Employee } from '../auth/entities/employee.entity';
import { CalculatePayrollDto } from './dto/payroll.dto';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';

/** Default overtime pay rate multiplier per Taiwan Labour Standards Act Article 24 */
const DEFAULT_OVERTIME_MULTIPLIER = 1.33;

/** Standard monthly working hours (8h × 22 workdays) */
const STANDARD_MONTHLY_HOURS = 176;

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Calculate payroll for an employee for a given year/month.
   *
   * Formula (Phase-0 stub — Phase 2 will add NHI, labour insurance, etc.):
   *   hourly_rate   = base_salary / STANDARD_MONTHLY_HOURS
   *   overtime_pay  = hourly_rate × overtime_hours × multiplier
   *   deduction     = 0  (Phase-0; full deduction logic in Phase 2)
   *   total_salary  = base_salary + overtime_pay - deduction
   *
   * If a payroll record already exists for the period it is recalculated
   * (overwritten) unless its status is 'confirmed'.
   */
  async calculate(dto: CalculatePayrollDto, actorId?: number): Promise<Payroll> {
    const { employeeId, year, month } = dto;
    const baseSalary = dto.baseSalary ?? 45_000; // Phase-0 default; replace with HR lookup
    const multiplier = dto.overtimeMultiplier ?? DEFAULT_OVERTIME_MULTIPLIER;

    // Validate period
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }

    // Check for existing confirmed payroll
    const existing = await this.payrollRepo.findOne({
      where: { employeeId, year, month },
    });
    if (existing?.status === PayrollStatus.CONFIRMED) {
      throw new ConflictException(
        `Payroll for employee #${employeeId} (${year}/${month}) is already confirmed and cannot be recalculated.`,
      );
    }

    // Fetch attendance records for the period
    const periodStart = new Date(year, month - 1, 1, 0, 0, 0);
    const periodEnd = new Date(year, month, 0, 23, 59, 59); // last day of month

    const records = await this.attendanceRepo.find({
      where: {
        employeeId,
        checkInTime: Between(periodStart, periodEnd),
      },
    });

    // Aggregate attendance stats
    const workingDays = records.filter((r) => r.checkInTime !== null).length;
    const totalOvertimeHours = records.reduce(
      (sum, r) => sum + Number(r.overtimeHours ?? 0),
      0,
    );
    const totalLateMinutes = records.reduce(
      (sum, r) => sum + Number(r.lateMinutes ?? 0),
      0,
    );

    // Payroll calculation
    const hourlyRate = baseSalary / STANDARD_MONTHLY_HOURS;
    const overtimePay = parseFloat(
      (hourlyRate * totalOvertimeHours * multiplier).toFixed(2),
    );
    // Taiwan NHI: premium rate 5.17%, employee bears 30% → 1.551% of salary
    // Taiwan Labor Insurance: premium rate 12%, employee bears 20% → 2.4% of salary
    const nhiDeduction = parseFloat((baseSalary * 0.01551).toFixed(0)) * 1; // round to integer TWD
    const laborDeduction = parseFloat((baseSalary * 0.024).toFixed(0)) * 1;
    const deduction = nhiDeduction + laborDeduction;
    const totalSalary = parseFloat((baseSalary + overtimePay - deduction).toFixed(2));

    // Upsert payroll record
    const payroll = existing ?? this.payrollRepo.create({ employeeId, year, month });
    payroll.baseSalary = baseSalary;
    payroll.overtimePay = overtimePay;
    payroll.overtimeHours = parseFloat(totalOvertimeHours.toFixed(2));
    payroll.nhiDeduction = nhiDeduction;
    payroll.laborDeduction = laborDeduction;
    payroll.deduction = deduction;
    payroll.totalSalary = totalSalary;
    payroll.workingDays = workingDays;
    payroll.lateMinutes = totalLateMinutes;
    payroll.status = PayrollStatus.DRAFT;

    const saved = await this.payrollRepo.save(payroll);
    this.logger.log(
      `Calculated payroll for employee #${employeeId} ${year}/${month}: ` +
        `base=${baseSalary}, ot=${overtimePay}, nhi=${nhiDeduction}, labor=${laborDeduction}, total=${totalSalary}`,
    );
    if (actorId) {
      void this.auditService.log(actorId, 'payroll_calculate', 'payroll', Number(saved.id), {
        employeeId,
        year,
        month,
        totalSalary,
      });
    }
    return saved;
  }

  /**
   * HR confirms a payroll record (status: draft → confirmed).
   */
  async confirm(payrollId: number, hrEmployeeId: number): Promise<Payroll> {
    const payroll = await this.payrollRepo.findOne({ where: { id: payrollId } });
    if (!payroll) {
      throw new NotFoundException(`Payroll #${payrollId} not found`);
    }
    if (payroll.status === PayrollStatus.CONFIRMED) {
      throw new ConflictException(`Payroll #${payrollId} is already confirmed`);
    }

    payroll.status = PayrollStatus.CONFIRMED;
    payroll.confirmedBy = hrEmployeeId;
    payroll.confirmedAt = new Date();

    const saved = await this.payrollRepo.save(payroll);
    this.logger.log(
      `HR #${hrEmployeeId} confirmed payroll #${payrollId} for employee #${payroll.employeeId}`,
    );

    this.afterConfirm(saved).catch(() => {});
    void this.auditService.log(hrEmployeeId, 'payroll_confirm', 'payroll', Number(saved.id), {
      employeeId: payroll.employeeId,
      year: payroll.year,
      month: payroll.month,
    });

    return saved;
  }

  private async afterConfirm(payroll: Payroll): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id: payroll.employeeId } });
    if (!employee) return;

    const year = payroll.year;
    const month = payroll.month;
    const summary = `NT$ ${Number(payroll.totalSalary).toLocaleString('zh-TW')}`;

    // LINE push (summary)
    if (employee.lineUserId) {
      const text = `${employee.name} 您好！\n${year}年${month}月薪資已確認 💰\n實領金額：${summary}\n詳情請查收 Email。`;
      await this.notificationService.sendLinePush(employee.lineUserId, text).catch(() => {});
    }

    // Email (detailed)
    if (employee.email) {
      const html = this.notificationService.buildPayrollEmail(employee.name, year, month, {
        baseSalary: Number(payroll.baseSalary),
        overtimePay: Number(payroll.overtimePay),
        deduction: Number(payroll.deduction),
        totalSalary: Number(payroll.totalSalary),
        workingDays: payroll.workingDays,
        overtimeHours: Number(payroll.overtimeHours),
        lateMinutes: payroll.lateMinutes,
      });
      await this.notificationService.sendEmail(
        employee.email,
        `${year}年${month}月薪資通知 - CheckPass`,
        html,
      ).catch(() => {});
    }
  }

  /**
   * Send payroll notifications to all employees with confirmed payrolls for the period.
   */
  async batchNotify(year: number, month: number): Promise<{ notified: number }> {
    const payrolls = await this.payrollRepo.find({
      where: { year, month, status: PayrollStatus.CONFIRMED },
    });
    let notified = 0;
    for (const payroll of payrolls) {
      await this.afterConfirm(payroll).catch(() => {});
      notified++;
    }
    this.logger.log(`Batch notify: sent payroll notifications for ${notified} employees (${year}/${month})`);
    return { notified };
  }

  /**
   * List all payroll records for a given year/month (HR view).
   */
  async listPayrolls(year: number, month: number): Promise<Payroll[]> {
    return this.payrollRepo.find({
      where: { year, month },
      order: { employeeId: 'ASC' },
    });
  }

  /**
   * Returns monthly payroll aggregates for the past `months` calendar months.
   * Used by the BI dashboard HR section.
   */
  async getPayrollTrend(months: number): Promise<{
    year: number;
    month: number;
    totalPayout: number;
    confirmedCount: number;
    draftCount: number;
    avgSalary: number;
  }[]> {
    const now = new Date();
    const result: {
      year: number; month: number; totalPayout: number;
      confirmedCount: number; draftCount: number; avgSalary: number;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const payrolls = await this.payrollRepo.find({ where: { year, month } });
      const confirmed = payrolls.filter((p) => p.status === PayrollStatus.CONFIRMED);
      const totalPayout = confirmed.reduce((sum, p) => sum + Number(p.totalSalary), 0);

      result.push({
        year,
        month,
        totalPayout,
        confirmedCount: confirmed.length,
        draftCount: payrolls.length - confirmed.length,
        avgSalary: confirmed.length > 0 ? Math.round(totalPayout / confirmed.length) : 0,
      });
    }
    return result;
  }

  /**
   * Retrieve a payroll record for a specific employee / year / month.
   */
  async getPayroll(
    employeeId: number,
    year: number,
    month: number,
  ): Promise<Payroll> {
    const payroll = await this.payrollRepo.findOne({
      where: { employeeId, year, month },
    });
    if (!payroll) {
      throw new NotFoundException(
        `No payroll record found for employee #${employeeId} (${year}/${month})`,
      );
    }
    return payroll;
  }

  async exportCsv(year: number, month: number): Promise<string> {
    const payrolls = await this.payrollRepo.find({
      where: { year, month },
      order: { employeeId: 'ASC' },
    });

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'ID', '員工ID', '年', '月',
      '底薪', '加班費', '健保扣費', '勞保扣費', '總扣款', '實領薪資',
      '出勤天數', '加班時數', '遲到(分)', '狀態',
    ];
    const rows = payrolls.map((p) => [
      p.id,
      p.employeeId,
      p.year,
      p.month,
      Number(p.baseSalary).toFixed(0),
      Number(p.overtimePay).toFixed(0),
      Number(p.nhiDeduction).toFixed(0),
      Number(p.laborDeduction).toFixed(0),
      Number(p.deduction).toFixed(0),
      Number(p.totalSalary).toFixed(0),
      p.workingDays,
      Number(p.overtimeHours).toFixed(2),
      p.lateMinutes,
      p.status,
    ]);

    return [header.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))].join('\r\n');
  }
}
