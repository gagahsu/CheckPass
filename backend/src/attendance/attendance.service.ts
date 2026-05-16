import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import {
  AttendanceRecord,
  AttendanceStatus,
  CheckInType,
} from './entities/attendance-record.entity';
import { WorkplaceSetting } from './entities/workplace-setting.entity';
import { CheckInDto, CheckOutDto, AttendanceQueryDto, CreateWorkplaceDto, UpdateWorkplaceDto } from './dto/check-in.dto';
import { NotificationService } from '../notification/notification.service';
import { SseService } from '../sse/sse.service';
import { Employee } from '../auth/entities/employee.entity';
import { ShiftSchedule } from '../shift/entities/shift-schedule.entity';
import { AuditService } from '../audit/audit.service';

/** Grace period in minutes before a check-in is flagged as late. */
const GRACE_MINUTES = 5;

/** Speed threshold km/h — above this the check-in is flagged as suspicious. */
const MAX_SPEED_KMH = 300;

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface DepartmentSummary {
  date: string;
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  records: Partial<AttendanceRecord>[];
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(WorkplaceSetting)
    private readonly workplaceRepo: Repository<WorkplaceSetting>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(ShiftSchedule)
    private readonly shiftScheduleRepo: Repository<ShiftSchedule>,
    private readonly notificationService: NotificationService,
    private readonly sseService: SseService,
    private readonly auditService: AuditService,
  ) {}

  async checkIn(employeeId: number, dto: CheckInDto): Promise<AttendanceRecord> {
    const todayStart = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(new Date());

    // Prevent duplicate check-in
    const existing = await this.attendanceRepo.findOne({
      where: { employeeId, checkInTime: Between(todayStart, todayEnd) },
    });
    if (existing) {
      throw new BadRequestException('今日已打過上班卡，請先打下班卡。');
    }

    const now = new Date();
    let distanceMeters: number | null = null;
    let workplaceLat: number | null = null;
    let workplaceLon: number | null = null;

    // GPS validation
    if (dto.type === CheckInType.GPS) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException('GPS 打卡需要提供座標。');
      }

      const workplace = await this.resolveWorkplace(dto.shiftScheduleId);
      workplaceLat = Number(workplace.latitude);
      workplaceLon = Number(workplace.longitude);

      distanceMeters = this.haversineDistance(
        dto.latitude,
        dto.longitude,
        workplaceLat,
        workplaceLon,
      );

      if (distanceMeters > workplace.gpsRadiusMeters) {
        throw new BadRequestException(
          `距離工作地點太遠（${Math.round(distanceMeters)} 公尺），允許範圍 ${workplace.gpsRadiusMeters} 公尺。`,
        );
      }
    }

    // WiFi validation
    if (dto.type === CheckInType.WIFI) {
      if (!dto.wifiSsid) {
        throw new BadRequestException('WiFi 打卡需要提供 SSID。');
      }
      const workplace = await this.resolveWorkplace(dto.shiftScheduleId);
      const allowed = workplace.getAllowedSsids();
      if (allowed.length > 0 && !allowed.includes(dto.wifiSsid)) {
        throw new BadRequestException(`WiFi「${dto.wifiSsid}」不在允許的打卡網路清單中。`);
      }
    }

    // Speed anomaly: check last check-out location
    if (dto.latitude != null && dto.longitude != null) {
      await this.checkSpeedAnomaly(employeeId, dto.latitude, dto.longitude, now);
    }

    // Tardiness calculation from shift schedule
    const { lateMinutes, status } = await this.calcLateMinutes(
      employeeId,
      now,
      dto.shiftScheduleId,
    );

    const record = this.attendanceRepo.create({
      employeeId,
      shiftScheduleId: dto.shiftScheduleId ?? null,
      type: dto.type,
      checkInTime: now,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      workplaceLatitude: workplaceLat,
      workplaceLongitude: workplaceLon,
      distanceMeters,
      device: dto.device ?? null,
      note: dto.note ?? null,
      lateMinutes,
      overtimeHours: 0,
      status,
    });

    const saved = await this.attendanceRepo.save(record);
    this.logger.log(`Employee ${employeeId} checked in — status: ${status}, late: ${lateMinutes}m`);

    void this.afterCheckIn(employeeId, saved);
    void this.auditService.log(employeeId, 'check_in', 'attendance', Number(saved.id), {
      type: dto.type,
      status,
      lateMinutes,
    });

    return saved;
  }

  async checkOut(employeeId: number, dto: CheckOutDto): Promise<AttendanceRecord> {
    const todayStart = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(new Date());

    const record = await this.attendanceRepo.findOne({
      where: { employeeId, checkInTime: Between(todayStart, todayEnd) },
      order: { checkInTime: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException('今日尚未打上班卡。');
    }
    if (record.checkOutTime) {
      throw new BadRequestException('今日已打過下班卡。');
    }

    const now = new Date();
    record.checkOutTime = now;

    if (dto.latitude != null) record.latitude = dto.latitude;
    if (dto.longitude != null) record.longitude = dto.longitude;
    if (dto.note) record.note = dto.note;

    // Early leave / overtime detection from shift schedule
    const { overtimeHours, earlyLeaveMinutes } = await this.calcCheckOutMetrics(record, now);
    record.overtimeHours = overtimeHours;

    if (earlyLeaveMinutes > 0) {
      record.status = AttendanceStatus.EARLY_LEAVE;
    } else if (overtimeHours > 0 && record.status === AttendanceStatus.ON_TIME) {
      record.status = AttendanceStatus.OVERTIME;
    }

    const saved = await this.attendanceRepo.save(record);
    this.logger.log(`Employee ${employeeId} checked out — overtime: ${overtimeHours}h`);

    void this.afterCheckOut(employeeId, saved);
    void this.auditService.log(employeeId, 'check_out', 'attendance', Number(saved.id), {
      status: record.status,
      overtimeHours,
    });

    return saved;
  }

  async getRecords(
    employeeId: number,
    query: AttendanceQueryDto,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindManyOptions<AttendanceRecord>['where'] = { employeeId };

    if (query.startDate && query.endDate) {
      const start = new Date(`${query.startDate}T00:00:00`);
      const end = new Date(`${query.endDate}T23:59:59`);
      (where as Record<string, unknown>)['checkInTime'] = Between(start, end);
    }

    const [data, total] = await this.attendanceRepo.findAndCount({
      where,
      order: { checkInTime: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getTodayRecord(employeeId: number): Promise<AttendanceRecord | null> {
    return this.attendanceRepo.findOne({
      where: {
        employeeId,
        checkInTime: Between(this.startOfDay(new Date()), this.endOfDay(new Date())),
      },
      order: { checkInTime: 'DESC' },
    });
  }

  async getDepartmentSummary(managerId: number, date: string): Promise<DepartmentSummary> {
    if (!date) {
      throw new BadRequestException('date 參數為必填（YYYY-MM-DD）。');
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const records = await this.attendanceRepo.find({
      where: { checkInTime: Between(dayStart, dayEnd) },
      order: { employeeId: 'ASC', checkInTime: 'ASC' },
    });

    // Enrich records with employee names
    const employeeIds = [...new Set(records.map((r) => r.employeeId))];
    const employees = employeeIds.length
      ? await this.employeeRepo.findByIds(employeeIds)
      : [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const enriched = records.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId)?.name ?? '—',
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      status: r.status,
      lateMinutes: r.lateMinutes,
      overtimeHours: r.overtimeHours,
    }));

    this.logger.log(`Manager ${managerId} fetched department summary for ${date}`);

    return {
      date,
      totalEmployees: employeeIds.length,
      presentCount: records.length,
      absentCount: 0,
      lateCount: records.filter((r) => r.lateMinutes > GRACE_MINUTES).length,
      records: enriched,
    };
  }

  async exportCsv(
    employeeId: number,
    query: { startDate?: string; endDate?: string },
    includeAll: boolean,
  ): Promise<string> {
    const where: FindManyOptions<AttendanceRecord>['where'] = includeAll ? {} : { employeeId };

    if (query.startDate && query.endDate) {
      (where as Record<string, unknown>)['checkInTime'] = Between(
        new Date(`${query.startDate}T00:00:00`),
        new Date(`${query.endDate}T23:59:59`),
      );
    }

    const records = await this.attendanceRepo.find({
      where,
      order: { checkInTime: 'DESC' },
      take: 10_000,
    });

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fmt = (d: Date | null) =>
      d ? d.toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }) : '';

    const header = ['ID', '員工ID', '日期', '上班時間', '下班時間', '狀態', '遲到(分)', '加班時數', '打卡類型', '備註'];
    const rows = records.map((r) => [
      r.id,
      r.employeeId,
      r.checkInTime ? r.checkInTime.toISOString().slice(0, 10) : '',
      fmt(r.checkInTime),
      fmt(r.checkOutTime),
      r.status,
      r.lateMinutes,
      Number(r.overtimeHours).toFixed(2),
      r.type,
      r.note ?? '',
    ]);

    return [header.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))].join('\r\n');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveWorkplace(shiftScheduleId?: number): Promise<WorkplaceSetting> {
    // TODO Phase 2: look up storeId from shift schedule
    const workplace = await this.workplaceRepo.findOne({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
    if (!workplace) {
      throw new BadRequestException('尚未設定打卡地點，請聯絡管理員。');
    }
    return workplace;
  }

  private async calcLateMinutes(
    employeeId: number,
    checkInTime: Date,
    shiftScheduleId?: number,
  ): Promise<{ lateMinutes: number; status: AttendanceStatus }> {
    if (!shiftScheduleId) {
      return { lateMinutes: 0, status: AttendanceStatus.ON_TIME };
    }

    const schedule = await this.shiftScheduleRepo.findOne({
      where: { id: shiftScheduleId },
      relations: ['shiftType'],
    });

    if (!schedule?.shiftType) {
      return { lateMinutes: 0, status: AttendanceStatus.ON_TIME };
    }

    const [startHour, startMin] = schedule.shiftType.startTime.split(':').map(Number);
    const shiftStart = new Date(checkInTime);
    shiftStart.setHours(startHour, startMin, 0, 0);

    const diffMinutes = Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60_000);
    const lateMinutes = Math.max(0, diffMinutes);
    const status =
      lateMinutes > GRACE_MINUTES ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME;

    return { lateMinutes, status };
  }

  private async calcCheckOutMetrics(
    record: AttendanceRecord,
    checkOutTime: Date,
  ): Promise<{ overtimeHours: number; earlyLeaveMinutes: number }> {
    if (!record.checkInTime) return { overtimeHours: 0, earlyLeaveMinutes: 0 };

    if (record.shiftScheduleId) {
      const schedule = await this.shiftScheduleRepo.findOne({
        where: { id: record.shiftScheduleId },
        relations: ['shiftType'],
      });

      if (schedule?.shiftType) {
        const [endHour, endMin] = schedule.shiftType.endTime.split(':').map(Number);
        const shiftEnd = new Date(checkOutTime);
        shiftEnd.setHours(endHour, endMin, 0, 0);

        const diffMs = checkOutTime.getTime() - shiftEnd.getTime();
        if (diffMs > 0) {
          return { overtimeHours: parseFloat((diffMs / 3_600_000).toFixed(2)), earlyLeaveMinutes: 0 };
        }
        // Early leave: more than grace period before shift end
        const earlyMs = -diffMs;
        const earlyLeaveMinutes = earlyMs > GRACE_MINUTES * 60_000
          ? Math.floor(earlyMs / 60_000)
          : 0;
        return { overtimeHours: 0, earlyLeaveMinutes };
      }
    }

    // Fallback: 8-hour standard shift
    const workedMs = checkOutTime.getTime() - record.checkInTime.getTime();
    const extraMs = workedMs - 8 * 3_600_000;
    return {
      overtimeHours: extraMs > 0 ? parseFloat((extraMs / 3_600_000).toFixed(2)) : 0,
      earlyLeaveMinutes: 0,
    };
  }

  /** Personal work-hours summary for week or month. */
  async getWorkHoursSummary(
    employeeId: number,
    period: 'week' | 'month',
  ): Promise<{
    totalHours: number;
    overtimeHours: number;
    lateCount: number;
    absentCount: number;
    earlyLeaveCount: number;
    workDays: number;
  }> {
    const now = new Date();
    let start: Date;

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const records = await this.attendanceRepo.find({
      where: { employeeId, checkInTime: Between(start, this.endOfDay(now)) },
    });

    const totalMs = records.reduce((sum, r) => {
      if (r.checkInTime && r.checkOutTime) {
        return sum + (r.checkOutTime.getTime() - r.checkInTime.getTime());
      }
      return sum;
    }, 0);

    return {
      totalHours: parseFloat((totalMs / 3_600_000).toFixed(1)),
      overtimeHours: parseFloat(
        records.reduce((s, r) => s + Number(r.overtimeHours), 0).toFixed(1),
      ),
      lateCount: records.filter((r) => r.status === AttendanceStatus.LATE).length,
      absentCount: records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      earlyLeaveCount: records.filter((r) => r.status === AttendanceStatus.EARLY_LEAVE).length,
      workDays: records.filter((r) => r.status !== AttendanceStatus.ABSENT).length,
    };
  }

  /** Combined dashboard stats for the authenticated employee. */
  async getDashboardStats(employeeId: number): Promise<{
    todayRecord: AttendanceRecord | null;
    weekSummary: Awaited<ReturnType<AttendanceService['getWorkHoursSummary']>>;
    monthSummary: Awaited<ReturnType<AttendanceService['getWorkHoursSummary']>>;
  }> {
    const [todayRecord, weekSummary, monthSummary] = await Promise.all([
      this.getTodayRecord(employeeId),
      this.getWorkHoursSummary(employeeId, 'week'),
      this.getWorkHoursSummary(employeeId, 'month'),
    ]);
    return { todayRecord, weekSummary, monthSummary };
  }

  // ---------------------------------------------------------------------------
  // BI Trend Analytics
  // ---------------------------------------------------------------------------

  /**
   * Returns per-day attendance counts for the past `days` calendar days.
   * Requires manager / hr / admin — accessible via GET /attendance/trend.
   */
  async getAttendanceTrend(days: number): Promise<{
    date: string;
    present: number;
    late: number;
    absent: number;
    total: number;
  }[]> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = this.endOfDay(now);

    // Fetch all records in range in one query
    const records = await this.attendanceRepo.find({
      where: { checkInTime: Between(startDate, endDate) },
      select: ['checkInTime', 'status'] as (keyof AttendanceRecord)[],
    });

    // Group by date string
    const byDate = new Map<string, { present: number; late: number }>();
    for (const r of records) {
      if (!r.checkInTime) continue;
      const dateStr = (r.checkInTime as Date).toISOString().split('T')[0];
      if (!byDate.has(dateStr)) byDate.set(dateStr, { present: 0, late: 0 });
      const bucket = byDate.get(dateStr)!;
      if (r.status === AttendanceStatus.LATE) {
        bucket.late++;
      } else {
        bucket.present++;
      }
    }

    // Active employee headcount (denominator for absent)
    const totalEmployees = await this.employeeRepo.count({
      where: { status: 'active' as any },
    });

    // Emit one entry per day
    const result: { date: string; present: number; late: number; absent: number; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const bucket = byDate.get(dateStr) ?? { present: 0, late: 0 };
      const checkedIn = bucket.present + bucket.late;
      result.push({
        date: dateStr,
        present: bucket.present,
        late: bucket.late,
        absent: Math.max(0, totalEmployees - checkedIn),
        total: totalEmployees,
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Workplace Settings
  // ---------------------------------------------------------------------------

  async listWorkplaces(): Promise<WorkplaceSetting[]> {
    return this.workplaceRepo.find({ order: { name: 'ASC' } });
  }

  async createWorkplace(dto: CreateWorkplaceDto): Promise<WorkplaceSetting> {
    const wp = this.workplaceRepo.create({
      name: dto.name,
      latitude: dto.latitude,
      longitude: dto.longitude,
      gpsRadiusMeters: dto.gpsRadiusMeters ?? 200,
      wifiSsids: dto.wifiSsids ?? null,
      isActive: true,
      storeId: null,
    });
    return this.workplaceRepo.save(wp);
  }

  async updateWorkplace(id: number, dto: UpdateWorkplaceDto): Promise<WorkplaceSetting> {
    const wp = await this.workplaceRepo.findOne({ where: { id } });
    if (!wp) throw new NotFoundException(`Workplace #${id} not found`);
    if (dto.name !== undefined) wp.name = dto.name;
    if (dto.latitude !== undefined) wp.latitude = dto.latitude;
    if (dto.longitude !== undefined) wp.longitude = dto.longitude;
    if (dto.gpsRadiusMeters !== undefined) wp.gpsRadiusMeters = dto.gpsRadiusMeters;
    if (dto.wifiSsids !== undefined) wp.wifiSsids = dto.wifiSsids ?? null;
    if (dto.isActive !== undefined) wp.isActive = dto.isActive;
    return this.workplaceRepo.save(wp);
  }

  async deleteWorkplace(id: number): Promise<void> {
    const wp = await this.workplaceRepo.findOne({ where: { id } });
    if (!wp) throw new NotFoundException(`Workplace #${id} not found`);
    await this.workplaceRepo.remove(wp);
  }

  /** Mark an employee as absent for a given date (called by scheduler). */
  async markAbsent(employeeId: number, date: Date): Promise<void> {
    const dayStart = this.startOfDay(date);
    const dayEnd = this.endOfDay(date);

    const existing = await this.attendanceRepo.findOne({
      where: { employeeId, checkInTime: Between(dayStart, dayEnd) },
    });
    if (existing) return; // already has a record

    const record = this.attendanceRepo.create({
      employeeId,
      checkInTime: dayStart,
      status: AttendanceStatus.ABSENT,
      lateMinutes: 0,
      overtimeHours: 0,
      note: '系統自動標記缺勤',
    });
    await this.attendanceRepo.save(record);
    this.logger.log(`Marked employee ${employeeId} as absent for ${date.toISOString().split('T')[0]}`);
  }

  private async checkSpeedAnomaly(
    employeeId: number,
    lat: number,
    lon: number,
    now: Date,
  ): Promise<void> {
    const lastRecord = await this.attendanceRepo.findOne({
      where: { employeeId },
      order: { checkInTime: 'DESC' },
    });

    if (
      !lastRecord?.checkOutTime ||
      lastRecord.latitude == null ||
      lastRecord.longitude == null
    ) {
      return;
    }

    const distM = this.haversineDistance(
      lat,
      lon,
      Number(lastRecord.latitude),
      Number(lastRecord.longitude),
    );

    const elapsedHours =
      (now.getTime() - lastRecord.checkOutTime.getTime()) / 3_600_000;

    if (elapsedHours > 0) {
      const speedKmh = distM / 1000 / elapsedHours;
      if (speedKmh > MAX_SPEED_KMH) {
        this.logger.warn(
          `Speed anomaly: employee ${employeeId} moved ${Math.round(distM)}m ` +
          `in ${(elapsedHours * 60).toFixed(1)}min (${Math.round(speedKmh)} km/h)`,
        );
        // Flag as suspicious note — don't block check-in
      }
    }
  }

  private async afterCheckIn(employeeId: number, record: AttendanceRecord): Promise<void> {
    try {
      const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
      if (!employee) return;

      // LINE push to employee
      if (employee.lineUserId) {
        const msg = this.notificationService.buildCheckInMessage(
          employee.name,
          record.checkInTime!,
          record.status,
        );
        await this.notificationService.sendLinePush(employee.lineUserId, msg);
      }

      // SSE push to HR/manager dashboards
      this.sseService.sendToAll({
        type: 'check-in',
        data: {
          employeeId,
          employeeName: employee.name,
          checkInTime: record.checkInTime,
          status: record.status,
          lateMinutes: record.lateMinutes,
        },
      });
    } catch (err) {
      this.logger.error('afterCheckIn notification failed', err);
    }
  }

  private async afterCheckOut(employeeId: number, record: AttendanceRecord): Promise<void> {
    try {
      const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
      if (!employee) return;

      if (employee.lineUserId) {
        const msg = this.notificationService.buildCheckOutMessage(
          employee.name,
          record.checkOutTime!,
          record.overtimeHours,
        );
        await this.notificationService.sendLinePush(employee.lineUserId, msg);
      }

      this.sseService.sendToAll({
        type: 'check-out',
        data: {
          employeeId,
          employeeName: employee.name,
          checkOutTime: record.checkOutTime,
          overtimeHours: record.overtimeHours,
        },
      });
    } catch (err) {
      this.logger.error('afterCheckOut notification failed', err);
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
