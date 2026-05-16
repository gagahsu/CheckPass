import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import {
  AttendanceRecord,
  AttendanceStatus,
  CheckInType,
} from './entities/attendance-record.entity';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceQueryDto,
} from './dto/check-in.dto';

/** Maximum allowed distance from the workplace for GPS check-in (metres). */
const GPS_MAX_DISTANCE_METERS = 200;

/** Grace period in minutes before a check-in is considered late. */
const GRACE_MINUTES = 5;

/** Overtime threshold: minutes beyond shift end before counting overtime. */
const OVERTIME_THRESHOLD_MINUTES = 0;

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
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Record an employee check-in.
   * For GPS type, validates that the employee is within the allowed radius of
   * the configured workplace coordinates.
   */
  async checkIn(
    employeeId: number,
    dto: CheckInDto,
  ): Promise<AttendanceRecord> {
    // Prevent double check-in: look for an open record today
    const todayStart = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(new Date());

    const existing = await this.attendanceRepo.findOne({
      where: {
        employeeId,
        checkInTime: Between(todayStart, todayEnd),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already checked in today. Please check out first.',
      );
    }

    let distanceMeters: number | null = null;

    if (dto.type === CheckInType.GPS) {
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException(
          'GPS check-in requires latitude and longitude.',
        );
      }

      // Phase-0: workplace coordinates are hard-coded or fetched from config.
      // Phase 1 will look them up from the shift schedule / store settings.
      const workplaceLat = 25.033964;
      const workplaceLon = 121.564468;

      distanceMeters = this.haversineDistance(
        dto.latitude,
        dto.longitude,
        workplaceLat,
        workplaceLon,
      );

      if (distanceMeters > GPS_MAX_DISTANCE_METERS) {
        throw new BadRequestException(
          `You are too far from the workplace. ` +
            `Distance: ${Math.round(distanceMeters)} m, max allowed: ${GPS_MAX_DISTANCE_METERS} m.`,
        );
      }
    }

    const now = new Date();

    const record = this.attendanceRepo.create({
      employeeId,
      shiftScheduleId: dto.shiftScheduleId ?? null,
      type: dto.type,
      checkInTime: now,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      distanceMeters,
      device: dto.device ?? null,
      note: dto.note ?? null,
      lateMinutes: 0, // Will be recalculated when shift info is available
      overtimeHours: 0,
      status: AttendanceStatus.ON_TIME,
    });

    const saved = await this.attendanceRepo.save(record);
    this.logger.log(`Employee ${employeeId} checked in at ${now.toISOString()}`);
    return saved;
  }

  /**
   * Record an employee check-out and calculate overtime.
   * Finds the most recent open (no check_out_time) record for the employee today.
   */
  async checkOut(
    employeeId: number,
    dto: CheckOutDto,
  ): Promise<AttendanceRecord> {
    const todayStart = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(new Date());

    const record = await this.attendanceRepo.findOne({
      where: {
        employeeId,
        checkInTime: Between(todayStart, todayEnd),
      },
      order: { checkInTime: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException(
        'No check-in record found for today. Please check in first.',
      );
    }

    if (record.checkOutTime) {
      throw new BadRequestException('You have already checked out today.');
    }

    const now = new Date();
    record.checkOutTime = now;

    // Update location if provided at check-out
    if (dto.latitude != null) {
      record.latitude = dto.latitude;
    }
    if (dto.longitude != null) {
      record.longitude = dto.longitude;
    }
    if (dto.note) {
      record.note = dto.note;
    }

    // Calculate overtime hours (Phase-0: assumes 8-hour standard shift)
    if (record.checkInTime) {
      const workedMs = now.getTime() - record.checkInTime.getTime();
      const workedMinutes = Math.floor(workedMs / 60_000);
      const standardMinutes = 8 * 60; // 480 minutes
      const extraMinutes = workedMinutes - standardMinutes;

      if (extraMinutes > OVERTIME_THRESHOLD_MINUTES) {
        record.overtimeHours = parseFloat((extraMinutes / 60).toFixed(2));
        record.status = AttendanceStatus.OVERTIME;
      }
    }

    const saved = await this.attendanceRepo.save(record);
    this.logger.log(
      `Employee ${employeeId} checked out at ${now.toISOString()}, overtime: ${saved.overtimeHours}h`,
    );
    return saved;
  }

  /**
   * Retrieve paginated attendance records for the given employee.
   */
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

  /**
   * Return a daily attendance summary for a manager's department.
   * Phase-0: returns all records for the given date regardless of department
   * (department filtering will be added once the HR module is wired up).
   */
  async getDepartmentSummary(
    managerId: number,
    date: string,
  ): Promise<DepartmentSummary> {
    if (!date) {
      throw new BadRequestException('date query parameter is required (YYYY-MM-DD)');
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const records = await this.attendanceRepo.find({
      where: { checkInTime: Between(dayStart, dayEnd) },
      order: { employeeId: 'ASC', checkInTime: 'ASC' },
    });

    const presentCount = records.length;
    const lateCount = records.filter((r) => r.lateMinutes > GRACE_MINUTES).length;

    // Phase-0: totalEmployees comes from the count of distinct employees in records.
    const uniqueEmployees = new Set(records.map((r) => r.employeeId)).size;

    this.logger.log(
      `Manager ${managerId} requested department summary for ${date}`,
    );

    return {
      date,
      totalEmployees: uniqueEmployees,
      presentCount,
      absentCount: 0, // Phase-0: absent calculation requires HR roster
      lateCount,
      records: records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        status: r.status,
        lateMinutes: r.lateMinutes,
        overtimeHours: r.overtimeHours,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Haversine formula — calculate the great-circle distance between two points
   * on Earth given their latitude/longitude in decimal degrees.
   * Returns distance in metres.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6_371_000; // Earth radius in metres
    const toRad = (deg: number): number => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
