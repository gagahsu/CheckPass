import apiClient from './index'
import type { Payroll, PayrollTrendItem } from '@/types'

export const payrollApi = {
  getPayroll(year: number, month: number, employeeId?: number): Promise<Payroll> {
    return apiClient
      .get<Payroll>('/payroll', { params: { year, month, ...(employeeId ? { employeeId } : {}) } })
      .then((r) => r.data)
  },

  listPayrolls(year: number, month: number): Promise<Payroll[]> {
    return apiClient
      .get<Payroll[]>('/payroll/list', { params: { year, month } })
      .then((r) => r.data)
  },

  calculate(employeeId: number, year: number, month: number, baseSalary?: number): Promise<Payroll> {
    return apiClient
      .post<Payroll>('/payroll/calculate', { employeeId, year, month, baseSalary })
      .then((r) => r.data)
  },

  confirm(payrollId: number): Promise<Payroll> {
    return apiClient.post<Payroll>(`/payroll/${payrollId}/confirm`).then((r) => r.data)
  },

  batchNotify(year: number, month: number): Promise<{ notified: number }> {
    return apiClient
      .post<{ notified: number }>('/payroll/batch-notify', { year, month })
      .then((r) => r.data)
  },

  getPayrollTrend(months = 6): Promise<PayrollTrendItem[]> {
    return apiClient
      .get<PayrollTrendItem[]>('/payroll/trend', { params: { months } })
      .then((r) => r.data)
  },

  exportCsv(year: number, month: number): Promise<Blob> {
    return apiClient
      .get('/payroll/export', { params: { year, month }, responseType: 'blob' })
      .then((r) => r.data as Blob)
  },
}
