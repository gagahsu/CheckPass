// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── API Error ─────────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}

// ─── RBAC ──────────────────────────────────────────────────────────────────────

export type RoleName = 'employee' | 'manager' | 'hr' | 'admin'

export interface Role {
  id: number
  name: RoleName
  displayName: string
  permissions: Permission[]
}

export interface Permission {
  module: string
  actions: ('view' | 'create' | 'edit' | 'delete')[]
}

// ─── Organization ──────────────────────────────────────────────────────────────

export interface Department {
  id: number
  name: string
  code: string
  managerId: number | null
  parentId: number | null
  createdAt: string
  updatedAt: string
}

export interface Position {
  id: number
  name: string
  departmentId: number | null
  level: number
  createdAt: string
  updatedAt: string
}

// ─── Employee ──────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'inactive' | 'resigned'

export interface Employee {
  id: number
  empNo: string
  name: string
  email: string | null
  lineUserId: string | null
  departmentId: number | null
  department?: Department
  positionId: number | null
  position?: Position
  roles: RoleName[]
  status: EmployeeStatus
  hireDate: string | null
  createdAt: string
  updatedAt: string
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'normal' | 'late' | 'absent' | 'early_leave' | 'overtime'

export interface AttendanceRecord {
  id: number
  employeeId: number
  employee?: Pick<Employee, 'id' | 'empNo' | 'name'>
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  checkInLatitude: number | null
  checkInLongitude: number | null
  checkOutLatitude: number | null
  checkOutLongitude: number | null
  status: AttendanceStatus
  lateMinutes: number
  overtimeHours: number
  shiftId: number | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface CheckInPayload {
  latitude: number
  longitude: number
  deviceInfo?: string
  lineUserId?: string
}

export interface CheckOutPayload {
  latitude: number
  longitude: number
  deviceInfo?: string
}

export interface CheckInResponse {
  recordId: number
  checkInTime: string
  status: AttendanceStatus
  message: string
}

export interface WorkplaceSetting {
  id: number
  storeId: number | null
  name: string
  latitude: number
  longitude: number
  gpsRadiusMeters: number
  wifiSsids: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RecordQuery {
  employeeId?: number
  departmentId?: number
  startDate?: string
  endDate?: string
  status?: AttendanceStatus
  page?: number
  pageSize?: number
}

export interface DepartmentSummary {
  departmentId: number
  departmentName: string
  total: number
  present: number
  late: number
  absent: number
  date: string
}

export interface WorkHoursSummary {
  totalHours: number
  overtimeHours: number
  lateCount: number
  absentCount: number
  earlyLeaveCount: number
  workDays: number
}

export interface DashboardStats {
  todayRecord: AttendanceRecord | null
  weekSummary: WorkHoursSummary
  monthSummary: WorkHoursSummary
}

// ─── Shift ─────────────────────────────────────────────────────────────────────

export interface ShiftType {
  id: number
  storeId: number | null
  name: string
  startTime: string
  endTime: string
  breakMinutes: number
  graceMinutes: number
  minStaff: number
  maxStaff: number
  color: string
  createdAt: string
  updatedAt: string
}

export type ScheduleStatus = 'draft' | 'published'

export interface ScheduleEntry {
  id: number
  employeeId: number
  employee?: Pick<Employee, 'id' | 'empNo' | 'name'>
  shiftTypeId: number
  shiftType?: ShiftType
  date: string
  storeId: number
  status: ScheduleStatus
  note: string | null
  createdAt: string
  updatedAt: string
}


export interface AssignShiftPayload {
  employeeId: number
  shiftTypeId: number
  date: string
  storeId: number
  note?: string
}

// ─── Leave ─────────────────────────────────────────────────────────────────────

export type LeaveStatus = 'pending' | 'manager_approved' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveType {
  id: number
  code: string
  name: string
  isPaid: boolean
  requiresAttachment: boolean
  maxDaysPerYear: number | null
}

export interface LeaveRequest {
  id: number
  employeeId: number
  employee?: Pick<Employee, 'id' | 'empNo' | 'name'>
  leaveTypeId: number
  leaveType?: LeaveType
  startDate: string
  endDate: string
  reason: string | null
  attachmentUrl: string | null
  status: LeaveStatus
  approvedBy: number | null
  approvedAt: string | null
  rejectReason: string | null
  managerApprovedBy: number | null
  managerApprovedAt: string | null
  hrConfirmedBy: number | null
  hrConfirmedAt: string | null
  createdAt: string
}

export interface LeaveBalance {
  leaveTypeId: number
  leaveTypeName: string
  code: string
  maxDaysPerYear: number | null
  usedDays: number
  remainingDays: number | null
}

export interface LeaveApplyPayload {
  leaveTypeId: number
  startDate: string
  endDate: string
  reason: string
  attachmentUrl?: string
}

// ─── Payroll ───────────────────────────────────────────────────────────────────

export type PayrollStatus = 'draft' | 'confirmed'

export interface Payroll {
  id: number
  employeeId: number
  year: number
  month: number
  baseSalary: number
  overtimePay: number
  deduction: number
  nhiDeduction: number
  laborDeduction: number
  totalSalary: number
  overtimeHours: number
  workingDays: number
  lateMinutes: number
  status: PayrollStatus
  confirmedBy: number | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Notification ──────────────────────────────────────────────────────────────

export type NotificationType = 'leave_approval' | 'shift_published' | 'payroll_ready' | 'general'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  createdAt: string
  payload?: Record<string, unknown>
}
