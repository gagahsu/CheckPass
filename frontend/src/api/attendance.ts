import apiClient from './index'
import type {
  CheckInPayload,
  AttendanceRecord,
  CheckOutPayload,
  RecordQuery,
  DepartmentSummary,
  WorkHoursSummary,
  DashboardStats,
  PagedResponse,
  WorkplaceSetting,
  AttendanceTrendItem,
} from '@/types'

export const attendanceApi = {
  checkIn(data: CheckInPayload): Promise<AttendanceRecord> {
    return apiClient.post<AttendanceRecord>('/attendance/check-in', data).then((r) => r.data)
  },

  checkOut(data: CheckOutPayload): Promise<AttendanceRecord> {
    return apiClient.post<AttendanceRecord>('/attendance/check-out', data).then((r) => r.data)
  },

  getToday(): Promise<AttendanceRecord | null> {
    return apiClient.get<AttendanceRecord | null>('/attendance/today').then((r) => r.data)
  },

  getRecords(params: RecordQuery): Promise<PagedResponse<AttendanceRecord>> {
    return apiClient
      .get<PagedResponse<AttendanceRecord>>('/attendance/records', { params })
      .then((r) => r.data)
  },

  getWorkHoursSummary(period: 'week' | 'month'): Promise<WorkHoursSummary> {
    return apiClient
      .get<WorkHoursSummary>('/attendance/summary', { params: { period } })
      .then((r) => r.data)
  },

  getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/attendance/dashboard-stats').then((r) => r.data)
  },

  getDepartmentSummary(date: string): Promise<DepartmentSummary> {
    return apiClient
      .get<DepartmentSummary>('/attendance/department-summary', { params: { date } })
      .then((r) => r.data)
  },

  listWorkplaces(): Promise<WorkplaceSetting[]> {
    return apiClient.get<WorkplaceSetting[]>('/attendance/workplaces').then((r) => r.data)
  },
  createWorkplace(data: Partial<WorkplaceSetting>): Promise<WorkplaceSetting> {
    return apiClient.post<WorkplaceSetting>('/attendance/workplaces', data).then((r) => r.data)
  },
  updateWorkplace(id: number, data: Partial<WorkplaceSetting>): Promise<WorkplaceSetting> {
    return apiClient.patch<WorkplaceSetting>(`/attendance/workplaces/${id}`, data).then((r) => r.data)
  },
  deleteWorkplace(id: number): Promise<void> {
    return apiClient.delete(`/attendance/workplaces/${id}`).then(() => undefined)
  },

  getAttendanceTrend(days = 30): Promise<AttendanceTrendItem[]> {
    return apiClient
      .get<AttendanceTrendItem[]>('/attendance/trend', { params: { days } })
      .then((r) => r.data)
  },

  exportCsv(params: { startDate?: string; endDate?: string; all?: boolean }): Promise<Blob> {
    return apiClient
      .get('/attendance/export', { params, responseType: 'blob' })
      .then((r) => r.data as Blob)
  },
}
