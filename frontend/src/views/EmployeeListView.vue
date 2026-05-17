<template>
  <AppLayout>
    <Toast />
    <div class="employee-list-page">
      <div class="page-header">
        <h2 class="page-title">員工管理</h2>
        <Button
          v-if="canCreate"
          label="新增員工"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>

      <!-- Create Employee Dialog -->
      <Dialog
        v-model:visible="showCreateDialog"
        header="新增員工"
        :modal="true"
        :style="{ width: '420px' }"
      >
        <div class="create-form">
          <div class="form-group">
            <label class="form-label">姓名 <span class="required">*</span></label>
            <InputText v-model="createForm.name" placeholder="王小明" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <InputText v-model="createForm.email" type="email" placeholder="employee@company.com" class="w-full" />
            <p class="form-hint">建立後自動發送歡迎 Email</p>
          </div>
          <div class="form-group">
            <label class="form-label">到職日期</label>
            <InputText v-model="createForm.hireDate" type="date" class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部門</label>
              <select v-model="createForm.departmentId" class="p-inputtext w-full" @change="createForm.positionId = null">
                <option :value="null">-- 不指定 --</option>
                <option v-for="d in departments" :key="d.id" :value="Number(d.id)">{{ d.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">職位</label>
              <select v-model="createForm.positionId" class="p-inputtext w-full">
                <option :value="null">-- 不指定 --</option>
                <option v-for="p in filteredPositions(createForm.departmentId)" :key="p.id" :value="Number(p.id)">{{ p.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">角色</label>
            <div class="role-checks">
              <label v-for="r in allRoles" :key="r.value" class="role-check-item">
                <input type="checkbox" :value="r.value" v-model="createForm.roleNames" />
                {{ r.label }}
              </label>
            </div>
          </div>
          <div v-if="createError" class="create-error">{{ createError }}</div>
        </div>
        <template #footer>
          <Button label="取消" severity="secondary" @click="showCreateDialog = false" />
          <Button label="建立並通知" icon="pi pi-send" :loading="creating" @click="handleCreate" />
        </template>
      </Dialog>

      <!-- Edit Employee Dialog -->
      <Dialog
        v-model:visible="showEditDialog"
        header="編輯員工"
        :modal="true"
        :style="{ width: '420px' }"
      >
        <div class="create-form">
          <div class="form-group">
            <label class="form-label">姓名 <span class="required">*</span></label>
            <InputText v-model="editForm.name" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <InputText v-model="editForm.email" type="email" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">到職日期</label>
            <InputText v-model="editForm.hireDate" type="date" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">狀態</label>
            <select v-model="editForm.status" class="p-inputtext w-full">
              <option value="active">在職</option>
              <option value="inactive">停用</option>
              <option value="resigned">離職</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部門</label>
              <select v-model="editForm.departmentId" class="p-inputtext w-full" @change="editForm.positionId = null">
                <option :value="null">-- 不指定 --</option>
                <option v-for="d in departments" :key="d.id" :value="Number(d.id)">{{ d.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">職位</label>
              <select v-model="editForm.positionId" class="p-inputtext w-full">
                <option :value="null">-- 不指定 --</option>
                <option v-for="p in filteredPositions(editForm.departmentId)" :key="p.id" :value="Number(p.id)">{{ p.name }}</option>
              </select>
            </div>
          </div>
          <div v-if="authStore.hasRole('admin')" class="form-group">
            <label class="form-label">角色</label>
            <div class="role-checks">
              <label v-for="r in allRoles" :key="r.value" class="role-check-item">
                <input type="checkbox" :value="r.value" v-model="editForm.roleNames" />
                {{ r.label }}
              </label>
            </div>
          </div>
          <div v-if="editError" class="create-error">{{ editError }}</div>
        </div>
        <template #footer>
          <Button label="取消" severity="secondary" @click="showEditDialog = false" />
          <Button label="儲存" icon="pi pi-check" :loading="saving" @click="handleEdit" />
        </template>
      </Dialog>

      <!-- Search -->
      <Card class="search-card">
        <template #content>
          <div class="search-row">
            <span class="search-wrapper">
              <i class="pi pi-search search-icon"></i>
              <InputText
                v-model="searchQuery"
                placeholder="搜尋姓名、編號..."
                class="search-input"
              />
            </span>
            <select v-model="filterStatus" class="p-inputtext status-filter">
              <option value="">全部狀態</option>
              <option value="active">在職</option>
              <option value="inactive">停用</option>
              <option value="resigned">離職</option>
            </select>
            <Button label="查詢" icon="pi pi-search" @click="loadEmployees" :loading="loading" />
            <Button label="重置" severity="secondary" icon="pi pi-refresh" @click="resetSearch" />
          </div>
        </template>
      </Card>

      <!-- Employee Table -->
      <Card class="table-card">
        <template #content>
          <div v-if="loading && employees.length === 0" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>載入中...</span>
          </div>
          <div v-else-if="error" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ error }}</span>
          </div>
          <DataTable
            v-else
            :value="employees"
            :loading="loading"
            :paginator="true"
            :rows="15"
            responsive-layout="scroll"
          >
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-users"></i>
                <p>無員工資料</p>
              </div>
            </template>

            <Column field="empNo" header="員工編號" style="min-width: 100px;" />
            <Column header="姓名" style="min-width: 120px;">
              <template #body="{ data }">
                <div class="name-cell">
                  <Avatar :label="data.name.charAt(0)" size="small" shape="circle" />
                  <span>{{ data.name }}</span>
                </div>
              </template>
            </Column>
            <Column header="Email" style="min-width: 180px;">
              <template #body="{ data }">{{ data.email ?? '--' }}</template>
            </Column>
            <Column header="角色" style="min-width: 150px;">
              <template #body="{ data }">
                <div class="role-tags">
                  <Tag
                    v-for="role in data.roles"
                    :key="role"
                    :value="roleLabel(role)"
                    severity="info"
                    class="role-tag"
                  />
                </div>
              </template>
            </Column>
            <Column field="hireDate" header="到職日期" style="min-width: 110px;">
              <template #body="{ data }">{{ data.hireDate ?? '--' }}</template>
            </Column>
            <Column header="狀態" style="min-width: 90px;">
              <template #body="{ data }">
                <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column header="操作" style="min-width: 120px;">
              <template #body="{ data }">
                <div class="action-btns">
                  <Button
                    icon="pi pi-pencil"
                    text
                    severity="secondary"
                    size="small"
                    v-tooltip="'編輯'"
                    @click="openEditDialog(data)"
                  />
                  <Button
                    icon="pi pi-eye"
                    text
                    severity="info"
                    size="small"
                    v-tooltip="'查看詳情'"
                    @click="router.push(`/hr/employees/${data.id}`)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Toast from 'primevue/toast'
import { hrApi } from '@/api/hr'
import { orgApi } from '@/api/org'
import type { Employee, EmployeeStatus, RoleName, Department, Position } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const canCreate = computed(() => authStore.hasRole('hr') || authStore.hasRole('admin'))

const employees = ref<Employee[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const filterStatus = ref('')

const departments = ref<Department[]>([])
const positions = ref<Position[]>([])

async function loadOrgData(): Promise<void> {
  try {
    const [depts, pos] = await Promise.all([orgApi.listDepartments(), orgApi.listPositions()])
    departments.value = depts
    positions.value = pos
  } catch (e) {
    console.error('loadOrgData failed', e)
  }
}

function filteredPositions(departmentId: number | null): Position[] {
  if (!departmentId) return positions.value
  return positions.value.filter((p) => Number(p.departmentId) === Number(departmentId))
}

// ─── Create dialog ────────────────────────────────────────────────────────────
const showCreateDialog = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const createForm = ref({ name: '', email: '', hireDate: '', roleNames: ['employee'] as RoleName[], departmentId: null as number | null, positionId: null as number | null })

const allRoles: { value: RoleName; label: string }[] = [
  { value: 'employee', label: '員工' },
  { value: 'manager', label: '主管' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: '管理員' },
]

// ─── Edit dialog ─────────────────────────────────────────────────────────────
const showEditDialog = ref(false)
const saving = ref(false)
const editError = ref<string | null>(null)
const editingId = ref<number | null>(null)
const editForm = ref({ name: '', email: '', hireDate: '', status: 'active', roleNames: ['employee'] as RoleName[], departmentId: null as number | null, positionId: null as number | null })

function openEditDialog(emp: Employee): void {
  editingId.value = emp.id
  editForm.value = {
    name: emp.name,
    email: emp.email ?? '',
    hireDate: emp.hireDate ?? '',
    status: emp.status,
    roleNames: emp.roles?.map((r) => (typeof r === 'string' ? r : r.name)) as RoleName[] ?? ['employee'],
    departmentId: emp.departmentId != null ? Number(emp.departmentId) : null,
    positionId: emp.positionId != null ? Number(emp.positionId) : null,
  }
  editError.value = null
  showEditDialog.value = true
}

async function handleEdit(): Promise<void> {
  if (!editingId.value) return
  if (!editForm.value.name.trim()) {
    editError.value = '請輸入姓名'
    return
  }
  saving.value = true
  editError.value = null
  try {
    await hrApi.updateEmployee(editingId.value, {
      name: editForm.value.name.trim(),
      email: editForm.value.email.trim() || undefined,
      hireDate: editForm.value.hireDate || undefined,
      status: editForm.value.status,
      departmentId: editForm.value.departmentId,
      positionId: editForm.value.positionId,
    })
    if (authStore.hasRole('admin')) {
      await hrApi.assignRoles(editingId.value, editForm.value.roleNames)
    }
    showEditDialog.value = false
    toast.add({ severity: 'success', summary: '員工資料已更新', life: 3000 })
    await loadEmployees()
  } catch {
    editError.value = '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}

function openCreateDialog(): void {
  createForm.value = { name: '', email: '', hireDate: '', roleNames: ['employee'], departmentId: null, positionId: null }
  createError.value = null
  showCreateDialog.value = true
}

async function handleCreate(): Promise<void> {
  if (!createForm.value.name.trim()) {
    createError.value = '請輸入姓名'
    return
  }
  creating.value = true
  createError.value = null
  try {
    await hrApi.createEmployee({
      name: createForm.value.name.trim(),
      email: createForm.value.email.trim() || undefined,
      hireDate: createForm.value.hireDate || undefined,
      roleNames: createForm.value.roleNames,
      departmentId: createForm.value.departmentId ?? undefined,
      positionId: createForm.value.positionId ?? undefined,
    })
    showCreateDialog.value = false
    await loadEmployees()
  } catch {
    createError.value = '建立失敗，請確認資料後再試'
  } finally {
    creating.value = false
  }
}

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
    admin: '管理員'
  }
  return map[role] ?? role
}

function resetSearch(): void {
  searchQuery.value = ''
  filterStatus.value = ''
  loadEmployees()
}

async function loadEmployees(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await hrApi.listEmployees({
      page: 1,
      pageSize: 500,
      search: searchQuery.value || undefined,
      status: filterStatus.value || undefined,
    })
    employees.value = res.data
  } catch {
    error.value = '無法載入員工清單'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEmployees()
  loadOrgData()
})
</script>

<style scoped>
.employee-list-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.search-card,
.table-card {
  border-radius: 12px;
}

.search-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding-left: 2.25rem !important;
}

.status-filter {
  min-width: 120px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.role-tag {
  font-size: 0.75rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem;
  color: #6b7280;
}

.error-state { color: #dc2626; }

.empty-state {
  flex-direction: column;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}

.required { color: #ef4444; }

.form-hint {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 2px;
}

.w-full { width: 100%; }

.role-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.role-check-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.action-btns {
  display: flex;
  gap: 0.25rem;
}

.create-error {
  padding: 0.6rem 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.875rem;
}
</style>
