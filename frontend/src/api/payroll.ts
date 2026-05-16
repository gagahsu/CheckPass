import apiClient from './index'
import type { Payroll } from '@/types'

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
}
