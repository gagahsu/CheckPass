import apiClient from './index'
import type {
  CheckInPayload,
  AttendanceRecord,
  CheckOutPayload,
  RecordQuery,
  DepartmentSummary,
  PagedResponse,
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

  getDepartmentSummary(date: string): Promise<DepartmentSummary[]> {
    return apiClient
      .get<DepartmentSummary[]>('/attendance/department-summary', { params: { date } })
      .then((r) => r.data)
  },
}
