import apiClient from './index'
import type { ShiftType, ScheduleEntry, AssignShiftPayload } from '@/types'

interface CreateShiftTypePayload {
  name: string
  startTime: string
  endTime: string
  breakMinutes?: number
  graceMinutes?: number
  minStaff?: number
  maxStaff?: number
  color?: string
  storeId?: number
}

export const shiftApi = {
  getShiftTypes(storeId?: number): Promise<ShiftType[]> {
    return apiClient
      .get<ShiftType[]>('/shifts/types', { params: storeId ? { storeId } : {} })
      .then((r) => r.data)
  },

  createShiftType(data: CreateShiftTypePayload): Promise<ShiftType> {
    return apiClient.post<ShiftType>('/shifts/types', data).then((r) => r.data)
  },

  updateShiftType(id: number, data: Partial<CreateShiftTypePayload>): Promise<ShiftType> {
    return apiClient.patch<ShiftType>(`/shifts/types/${id}`, data).then((r) => r.data)
  },

  deleteShiftType(id: number): Promise<void> {
    return apiClient.delete(`/shifts/types/${id}`).then(() => undefined)
  },

  getSchedule(storeId: number, weekStart: string): Promise<ScheduleEntry[]> {
    return apiClient
      .get<ScheduleEntry[]>('/shifts/schedule', { params: { storeId, weekStart } })
      .then((r) => r.data)
  },

  getMySchedule(weekStart: string): Promise<ScheduleEntry[]> {
    return apiClient
      .get<ScheduleEntry[]>('/shifts/my-schedule', { params: { weekStart } })
      .then((r) => r.data)
  },

  assignShift(data: AssignShiftPayload): Promise<ScheduleEntry> {
    return apiClient.post<ScheduleEntry>('/shifts/schedule', data).then((r) => r.data)
  },

  removeShift(scheduleId: number): Promise<void> {
    return apiClient.delete(`/shifts/schedule/${scheduleId}`).then(() => undefined)
  },

  publishSchedule(storeId: number, weekStart: string): Promise<void> {
    return apiClient
      .post('/shifts/schedule/publish', { storeId, weekStart })
      .then(() => undefined)
  },

  getMonthSchedule(storeId: number, year: number, month: number): Promise<ScheduleEntry[]> {
    return apiClient
      .get<ScheduleEntry[]>('/shifts/schedule/month', { params: { storeId, year, month } })
      .then((r) => r.data)
  },
}
