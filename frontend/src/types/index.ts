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
  title: string
  departmentId: number
  level: number
}

// ─── Employee ──────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'inactive' | 'resigned'

export interface Employee {
  id: number
  empNo: string
  name: string
  email: string
  phone: string
  departmentId: number
  department?: Department
  positionId: number
  position?: Position
  roles: RoleName[]
  status: EmployeeStatus
  hireDate: string
  lineUserId: string | null
  avatar: string | null
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

// ─── Shift ─────────────────────────────────────────────────────────────────────

export interface ShiftType {
  id: number
  name: string
  storeId: number
  startTime: string
  endTime: string
  graceMinutes: number
  minEmployees: number
  maxEmployees: number
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

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type LeaveTypeName =
  | 'annual'
  | 'sick'
  | 'personal'
  | 'maternity'
  | 'paternity'
  | 'bereavement'
  | 'other'

export interface LeaveType {
  id: number
  name: LeaveTypeName
  displayName: string
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
  totalDays: number
  reason: string
  status: LeaveStatus
  managerId: number | null
  managerApprovedAt: string | null
  hrApprovedAt: string | null
  rejectionReason: string | null
  attachmentUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface LeaveApplyPayload {
  leaveTypeId: number
  startDate: string
  endDate: string
  reason: string
  attachmentUrl?: string
}

// ─── Payroll ───────────────────────────────────────────────────────────────────

export type PayrollStatus = 'draft' | 'confirmed' | 'paid'

export interface OvertimeDetail {
  date: string
  hours: number
  multiplier: number
  amount: number
}

export interface Deduction {
  label: string
  amount: number
}

export interface Payroll {
  id: number
  employeeId: number
  employee?: Pick<Employee, 'id' | 'empNo' | 'name'>
  year: number
  month: number
  baseSalary: number
  overtimePay: number
  totalDeductions: number
  netSalary: number
  status: PayrollStatus
  overtimeDetails: OvertimeDetail[]
  deductions: Deduction[]
  workingDays: number
  actualWorkingDays: number
  leaveDays: number
  calculatedAt: string | null
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
