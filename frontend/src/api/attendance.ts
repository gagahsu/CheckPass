import apiClient from './index'
import type {
  CheckInPayload,
  CheckInResponse,
  CheckOutPayload,
  RecordQuery,
  AttendanceRecord,
  DepartmentSummary,
  PagedResponse
} from '@/types'

export const attendanceApi = {
  checkIn(data: CheckInPayload): Promise<CheckInResponse> {
    return apiClient.post<CheckInResponse>('/api/attendance/check-in', data).then((r) => r.data)
  },

  checkOut(data: CheckOutPayload): Promise<void> {
    return apiClient.post('/api/attendance/check-out', data).then(() => undefined)
  },

  getRecords(params: RecordQuery): Promise<PagedResponse<AttendanceRecord>> {
    return apiClient
      .get<PagedResponse<AttendanceRecord>>('/api/attendance/records', { params })
      .then((r) => r.data)
  },

  getDepartmentSummary(date: string): Promise<DepartmentSummary[]> {
    return apiClient
      .get<DepartmentSummary[]>('/api/attendance/department-summary', { params: { date } })
      .then((r) => r.data)
  }
}
