import apiClient from './index'
import type { LeaveRequest, LeaveApplyPayload } from '@/types'

export const leaveApi = {
  apply(data: LeaveApplyPayload): Promise<LeaveRequest> {
    return apiClient.post<LeaveRequest>('/api/leave/apply', data).then((r) => r.data)
  },

  getMyRequests(): Promise<LeaveRequest[]> {
    return apiClient.get<LeaveRequest[]>('/api/leave/my').then((r) => r.data)
  },

  getPendingApprovals(): Promise<LeaveRequest[]> {
    return apiClient.get<LeaveRequest[]>('/api/leave/pending-approvals').then((r) => r.data)
  },

  approve(id: number): Promise<void> {
    return apiClient.post(`/api/leave/${id}/approve`).then(() => undefined)
  },

  reject(id: number): Promise<void> {
    return apiClient.post(`/api/leave/${id}/reject`).then(() => undefined)
  }
}
