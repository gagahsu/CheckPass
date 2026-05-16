import apiClient from './index'
import type { ShiftType, ScheduleEntry, AssignShiftPayload } from '@/types'

export const shiftApi = {
  getShiftTypes(storeId: number): Promise<ShiftType[]> {
    return apiClient
      .get<ShiftType[]>('/api/shifts/types', { params: { storeId } })
      .then((r) => r.data)
  },

  getSchedule(storeId: number, weekStart: string): Promise<ScheduleEntry[]> {
    return apiClient
      .get<ScheduleEntry[]>('/api/shifts/schedule', { params: { storeId, weekStart } })
      .then((r) => r.data)
  },

  assignShift(data: AssignShiftPayload): Promise<void> {
    return apiClient.post('/api/shifts/schedule', data).then(() => undefined)
  },

  removeShift(scheduleId: number): Promise<void> {
    return apiClient.delete(`/api/shifts/schedule/${scheduleId}`).then(() => undefined)
  },

  publishSchedule(storeId: number, weekStart: string): Promise<void> {
    return apiClient
      .post('/api/shifts/schedule/publish', { storeId, weekStart })
      .then(() => undefined)
  }
}
