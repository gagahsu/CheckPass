import apiClient from './index'
import type { AuditLog, PagedResponse } from '@/types'

export interface AuditQuery {
  entityType?: string
  actorId?: number
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export const auditApi = {
  getLogs(params: AuditQuery): Promise<{ data: AuditLog[]; total: number; page: number; pageSize: number }> {
    return apiClient.get('/audit-logs', { params }).then((r) => r.data)
  },
}
