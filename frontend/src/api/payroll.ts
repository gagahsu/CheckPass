import apiClient from './index'
import type { Payroll } from '@/types'

export const payrollApi = {
  getPayroll(year: number, month: number): Promise<Payroll> {
    return apiClient
      .get<Payroll>('/api/payroll/my', { params: { year, month } })
      .then((r) => r.data)
  },

  calculate(employeeId: number, year: number, month: number): Promise<void> {
    return apiClient
      .post('/api/payroll/calculate', { employeeId, year, month })
      .then(() => undefined)
  },

  confirm(payrollId: number): Promise<void> {
    return apiClient.post(`/api/payroll/${payrollId}/confirm`).then(() => undefined)
  }
}
