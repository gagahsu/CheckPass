import apiClient from './index'
import type { Employee, PagedResponse, RoleName } from '@/types'

export const hrApi = {
  createEmployee(data: {
    name: string
    email?: string
    hireDate?: string
    roleNames?: RoleName[]
    departmentId?: number
    positionId?: number
  }): Promise<Employee> {
    return apiClient.post<Employee>('/hr/employees', data).then((r) => r.data)
  },

  listEmployees(params?: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
  }): Promise<PagedResponse<Employee>> {
    return apiClient
      .get<PagedResponse<Employee>>('/hr/employees', { params })
      .then((r) => r.data)
  },

  getEmployee(id: number): Promise<Employee> {
    return apiClient.get<Employee>(`/hr/employees/${id}`).then((r) => r.data)
  },

  updateEmployee(
    id: number,
    data: Partial<{ name: string; email: string; hireDate: string; status: string; departmentId: number | null; positionId: number | null }>,
  ): Promise<Employee> {
    return apiClient.patch<Employee>(`/hr/employees/${id}`, data).then((r) => r.data)
  },

  assignRoles(id: number, roleNames: RoleName[]): Promise<Employee> {
    return apiClient
      .patch<Employee>(`/hr/employees/${id}/roles`, { roleNames })
      .then((r) => r.data)
  },
}
