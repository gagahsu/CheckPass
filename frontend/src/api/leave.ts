import apiClient from './index'
import type { LeaveRequest, LeaveApplyPayload, LeaveType, LeaveBalance } from '@/types'

export const leaveApi = {
  getLeaveTypes(): Promise<LeaveType[]> {
    return apiClient.get<LeaveType[]>('/leave/types').then((r) => r.data)
  },

  apply(data: LeaveApplyPayload): Promise<LeaveRequest> {
    return apiClient.post<LeaveRequest>('/leave/apply', data).then((r) => r.data)
  },

  getMyRequests(): Promise<LeaveRequest[]> {
    return apiClient.get<LeaveRequest[]>('/leave/my-requests').then((r) => r.data)
  },

  getPendingApprovals(): Promise<LeaveRequest[]> {
    return apiClient.get<LeaveRequest[]>('/leave/pending-approvals').then((r) => r.data)
  },

  approve(id: number, comment?: string): Promise<LeaveRequest> {
    return apiClient.patch<LeaveRequest>(`/leave/${id}/approve`, { comment }).then((r) => r.data)
  },

  reject(id: number, reason: string): Promise<LeaveRequest> {
    return apiClient.patch<LeaveRequest>(`/leave/${id}/reject`, { reason }).then((r) => r.data)
  },

  cancel(id: number): Promise<LeaveRequest> {
    return apiClient.patch<LeaveRequest>(`/leave/${id}/cancel`).then((r) => r.data)
  },

  getBalance(): Promise<LeaveBalance[]> {
    return apiClient.get<LeaveBalance[]>('/leave/balance').then((r) => r.data)
  },

  uploadAttachment(file: File): Promise<{ url: string }> {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient
      .post<{ url: string }>('/leave/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
