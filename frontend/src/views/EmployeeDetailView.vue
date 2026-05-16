<template>
  <AppLayout>
    <div class="employee-detail-page">
      <div class="page-header">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" />
        <h2 class="page-title">員工詳情</h2>
        <div class="header-actions">
          <Button
            v-if="!editing"
            label="編輯"
            icon="pi pi-pencil"
            severity="secondary"
            @click="startEdit"
          />
          <template v-else>
            <Button label="儲存" icon="pi pi-check" :loading="saving" @click="handleSave" />
            <Button label="取消" severity="secondary" @click="cancelEdit" />
          </template>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>載入員工資料...</span>
      </div>

      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
      </div>

      <div v-else-if="employee" class="detail-layout">
        <!-- Profile Card -->
        <Card class="profile-card">
          <template #content>
            <div class="profile-header">
              <Avatar
                :label="employee.name.charAt(0)"
                size="xlarge"
                shape="circle"
                class="profile-avatar"
              />
              <div class="profile-info">
                <h3 class="profile-name">{{ employee.name }}</h3>
                <p class="profile-emp-no">員工編號：{{ employee.empNo }}</p>
                <Tag
                  :value="statusLabel(employee.status)"
                  :severity="statusSeverity(employee.status)"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Detail Form -->
        <Card class="form-card">
          <template #title>基本資料</template>
          <template #content>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">姓名</label>
                <InputText
                  v-if="editing"
                  v-model="form.name"
                  class="form-input"
                />
                <p v-else class="form-value">{{ employee.name }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">Email</label>
                <InputText
                  v-if="editing"
                  v-model="form.email"
                  type="email"
                  class="form-input"
                />
                <p v-else class="form-value">{{ employee.email }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">電話</label>
                <InputText
                  v-if="editing"
                  v-model="form.phone"
                  class="form-input"
                />
                <p v-else class="form-value">{{ employee.phone }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">到職日期</label>
                <InputText
                  v-if="editing"
                  v-model="form.hireDate"
                  type="date"
                  class="form-input"
                />
                <p v-else class="form-value">{{ employee.hireDate }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">部門</label>
                <p class="form-value">{{ employee.department?.name ?? '--' }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">職位</label>
                <p class="form-value">{{ employee.position?.title ?? '--' }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">LINE User ID</label>
                <p class="form-value">{{ employee.lineUserId ?? '未綁定' }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">角色</label>
                <div class="role-tags">
                  <Tag
                    v-for="role in employee.roles"
                    :key="role"
                    :value="roleLabel(role)"
                    severity="info"
                  />
                </div>
              </div>
            </div>

            <div v-if="saveError" class="save-error">
              <i class="pi pi-exclamation-triangle"></i>
              {{ saveError }}
            </div>
          </template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import apiClient from '@/api/index'
import type { Employee, EmployeeStatus, RoleName } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const employeeId = route.params.id as string
const employee = ref<Employee | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const editing = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

const form = ref({
  name: '',
  email: '',
  phone: '',
  hireDate: ''
})

function statusLabel(status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    active: '在職',
    inactive: '停用',
    resigned: '離職'
  }
  return map[status] ?? status
}

function statusSeverity(status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    active: 'success',
    inactive: 'secondary',
    resigned: 'danger'
  }
  return map[status] ?? 'secondary'
}

function roleLabel(role: RoleName): string {
  const map: Record<RoleName, string> = {
    employee: '員工',
    manager: '主管',
    hr: 'HR',
    admin: '系統管理員'
  }
  return map[role] ?? role
}

function startEdit(): void {
  if (!employee.value) return
  form.value = {
    name: employee.value.name,
    email: employee.value.email,
    phone: employee.value.phone,
    hireDate: employee.value.hireDate
  }
  editing.value = true
  saveError.value = null
}

function cancelEdit(): void {
  editing.value = false
  saveError.value = null
}

async function handleSave(): Promise<void> {
  saving.value = true
  saveError.value = null
  try {
    const res = await apiClient.patch<Employee>(
      `/api/hr/employees/${employeeId}`,
      form.value
    )
    employee.value = res.data
    editing.value = false
    toast.add({ severity: 'success', summary: '已儲存', detail: '員工資料已更新', life: 3000 })
  } catch {
    saveError.value = '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}

async function loadEmployee(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await apiClient.get<Employee>(`/api/hr/employees/${employeeId}`)
    employee.value = res.data
  } catch {
    error.value = '無法載入員工資料'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEmployee()
})
</script>

<style scoped>
.employee-detail-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.detail-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.profile-card,
.form-card {
  border-radius: 12px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-avatar {
  background: linear-gradient(135deg, #06b6d4, #0284c7) !important;
  color: white !important;
  font-size: 2rem;
  font-weight: 700;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.profile-emp-no {
  font-size: 0.9rem;
  color: #6b7280;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-value {
  font-size: 0.95rem;
  color: #111827;
  font-weight: 500;
}

.form-input {
  width: 100%;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.save-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem;
  color: #6b7280;
  background: white;
  border-radius: 12px;
}

.error-state { color: #dc2626; }
</style>
