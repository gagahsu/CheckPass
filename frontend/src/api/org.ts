import apiClient from './index'
import type { Department, Position } from '@/types'

interface CreateDepartmentPayload { name: string; code?: string; managerId?: number; parentId?: number }
interface UpdateDepartmentPayload { name?: string; code?: string; managerId?: number; parentId?: number }
interface CreatePositionPayload { name: string; departmentId?: number; level?: number }
interface UpdatePositionPayload { name?: string; departmentId?: number; level?: number }

export const orgApi = {
  listDepartments(): Promise<Department[]> {
    return apiClient.get<Department[]>('/org/departments').then((r) => r.data)
  },
  createDepartment(data: CreateDepartmentPayload): Promise<Department> {
    return apiClient.post<Department>('/org/departments', data).then((r) => r.data)
  },
  updateDepartment(id: number, data: UpdateDepartmentPayload): Promise<Department> {
    return apiClient.patch<Department>(`/org/departments/${id}`, data).then((r) => r.data)
  },
  deleteDepartment(id: number): Promise<void> {
    return apiClient.delete(`/org/departments/${id}`).then(() => undefined)
  },
  listPositions(departmentId?: number): Promise<Position[]> {
    return apiClient
      .get<Position[]>('/org/positions', { params: departmentId ? { departmentId } : {} })
      .then((r) => r.data)
  },
  createPosition(data: CreatePositionPayload): Promise<Position> {
    return apiClient.post<Position>('/org/positions', data).then((r) => r.data)
  },
  updatePosition(id: number, data: UpdatePositionPayload): Promise<Position> {
    return apiClient.patch<Position>(`/org/positions/${id}`, data).then((r) => r.data)
  },
  deletePosition(id: number): Promise<void> {
    return apiClient.delete(`/org/positions/${id}`).then(() => undefined)
  },
}
