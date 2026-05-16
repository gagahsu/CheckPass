<template>
  <AppLayout>
    <div class="settings-page">
      <div class="page-header">
        <h2 class="page-title">系統設定</h2>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'shifts' }"
          @click="activeTab = 'shifts'"
        >
          <i class="pi pi-calendar"></i>
          班別設定
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'roles' }"
          @click="activeTab = 'roles'"
        >
          <i class="pi pi-shield"></i>
          角色權限
        </button>
      </div>

      <!-- Shift Types Setting -->
      <template v-if="activeTab === 'shifts'">
        <Card class="action-card">
          <template #title>
            <div class="card-title-row">
              <span>班別清單</span>
              <Button label="新增班別" icon="pi pi-plus" size="small" @click="showAddForm = !showAddForm" />
            </div>
          </template>
          <template #content>
            <!-- Add Form -->
            <div v-if="showAddForm" class="add-form">
              <h4 class="add-form-title">新增班別</h4>
              <div class="add-form-grid">
                <div class="form-group">
                  <label class="form-label">班別名稱 <span class="required">*</span></label>
                  <InputText v-model="newShift.name" placeholder="例：早班" />
                </div>
                <div class="form-group">
                  <label class="form-label">開始時間 <span class="required">*</span></label>
                  <InputText v-model="newShift.startTime" type="time" />
                </div>
                <div class="form-group">
                  <label class="form-label">結束時間 <span class="required">*</span></label>
                  <InputText v-model="newShift.endTime" type="time" />
                </div>
                <div class="form-group">
                  <label class="form-label">最少人數</label>
                  <InputText v-model.number="newShift.minEmployees" type="number" min="1" />
                </div>
                <div class="form-group">
                  <label class="form-label">最多人數</label>
                  <InputText v-model.number="newShift.maxEmployees" type="number" min="1" />
                </div>
                <div class="form-group">
                  <label class="form-label">顏色</label>
                  <input v-model="newShift.color" type="color" class="color-picker" />
                </div>
              </div>
              <div v-if="addFormError" class="form-error">
                <i class="pi pi-exclamation-triangle"></i>
                {{ addFormError }}
              </div>
              <div class="add-form-actions">
                <Button label="取消" severity="secondary" size="small" @click="cancelAdd" />
                <Button label="新增" icon="pi pi-check" size="small" :loading="addingShift" @click="handleAddShift" />
              </div>
            </div>

            <!-- Shift Types Table -->
            <div v-if="shiftsLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>載入中...</span>
            </div>
            <div v-else-if="shiftsError" class="error-state">
              <i class="pi pi-exclamation-triangle"></i>
              <span>{{ shiftsError }}</span>
            </div>
            <DataTable v-else :value="shiftTypes" responsive-layout="scroll">
              <template #empty>
                <div class="empty-state">
                  <i class="pi pi-inbox"></i>
                  <p>尚無班別設定</p>
                </div>
              </template>
              <Column header="顏色" style="width: 60px;">
                <template #body="{ data }">
                  <div
                    class="color-dot"
                    :style="{ background: data.color }"
                  ></div>
                </template>
              </Column>
              <Column field="name" header="班別名稱" />
              <Column field="startTime" header="開始時間" />
              <Column field="endTime" header="結束時間" />
              <Column header="寬限時間">
                <template #body="{ data }">
                  {{ data.graceMinutes }} 分鐘
                </template>
              </Column>
              <Column header="人數限制">
                <template #body="{ data }">
                  {{ data.minEmployees }} – {{ data.maxEmployees }} 人
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </template>

      <!-- Role Permissions -->
      <template v-if="activeTab === 'roles'">
        <Card class="action-card">
          <template #title>角色權限矩陣</template>
          <template #content>
            <div class="permission-grid">
              <div class="perm-header">
                <div class="perm-module-col">模組</div>
                <div class="perm-role-col" v-for="role in roles" :key="role.key">{{ role.label }}</div>
              </div>
              <div v-for="module in modules" :key="module.key" class="perm-row">
                <div class="perm-module-col">{{ module.label }}</div>
                <div
                  v-for="role in roles"
                  :key="role.key"
                  class="perm-role-col"
                >
                  <div class="perm-actions">
                    <span
                      v-for="action in ['view', 'create', 'edit', 'delete']"
                      :key="action"
                      class="perm-badge"
                      :class="hasPermission(role.key, module.key, action) ? 'perm-allowed' : 'perm-denied'"
                      :title="action"
                    >
                      {{ actionShort(action) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p class="perm-note">
              <i class="pi pi-info-circle"></i>
              角色權限管理介面將於正式版實作細粒度編輯功能
            </p>
          </template>
        </Card>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { shiftApi } from '@/api/shift'
import type { ShiftType } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const toast = useToast()

const activeTab = ref<'shifts' | 'roles'>('shifts')
const shiftTypes = ref<ShiftType[]>([])
const shiftsLoading = ref(false)
const shiftsError = ref<string | null>(null)
const showAddForm = ref(false)
const addingShift = ref(false)
const addFormError = ref<string | null>(null)

const newShift = ref({
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  minEmployees: 1,
  maxEmployees: 10,
  color: '#06b6d4'
})

const roles = [
  { key: 'employee', label: '員工' },
  { key: 'manager', label: '主管' },
  { key: 'hr', label: 'HR' },
  { key: 'admin', label: '管理員' }
]

const modules = [
  { key: 'attendance', label: '出勤記錄' },
  { key: 'shift', label: '班表' },
  { key: 'leave', label: '請假' },
  { key: 'payroll', label: '薪資' },
  { key: 'hr', label: '員工管理' },
  { key: 'settings', label: '系統設定' }
]

// Simplified permission matrix for display
const permMatrix: Record<string, Record<string, string[]>> = {
  employee: {
    attendance: ['view'],
    shift: ['view'],
    leave: ['view', 'create'],
    payroll: ['view'],
    hr: [],
    settings: []
  },
  manager: {
    attendance: ['view', 'edit'],
    shift: ['view', 'create', 'edit'],
    leave: ['view', 'create', 'edit'],
    payroll: ['view'],
    hr: ['view'],
    settings: []
  },
  hr: {
    attendance: ['view', 'edit'],
    shift: ['view', 'create', 'edit'],
    leave: ['view', 'create', 'edit', 'delete'],
    payroll: ['view', 'create', 'edit'],
    hr: ['view', 'create', 'edit'],
    settings: []
  },
  admin: {
    attendance: ['view', 'create', 'edit', 'delete'],
    shift: ['view', 'create', 'edit', 'delete'],
    leave: ['view', 'create', 'edit', 'delete'],
    payroll: ['view', 'create', 'edit', 'delete'],
    hr: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'create', 'edit', 'delete']
  }
}

function hasPermission(role: string, module: string, action: string): boolean {
  return permMatrix[role]?.[module]?.includes(action) ?? false
}

function actionShort(action: string): string {
  return { view: 'V', create: 'C', edit: 'E', delete: 'D' }[action] ?? action
}

function cancelAdd(): void {
  showAddForm.value = false
  addFormError.value = null
  newShift.value = {
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    minEmployees: 1,
    maxEmployees: 10,
    color: '#06b6d4'
  }
}

async function handleAddShift(): Promise<void> {
  addFormError.value = null
  if (!newShift.value.name.trim()) {
    addFormError.value = '班別名稱不能為空'
    return
  }
  if (!newShift.value.startTime || !newShift.value.endTime) {
    addFormError.value = '請填寫開始與結束時間'
    return
  }
  addingShift.value = true
  try {
    // API call placeholder — shift type creation endpoint to be implemented
    await new Promise((resolve) => setTimeout(resolve, 500))
    // Optimistically add to list
    const mockId = Date.now()
    shiftTypes.value.push({
      id: mockId,
      name: newShift.value.name,
      storeId: 1,
      startTime: newShift.value.startTime,
      endTime: newShift.value.endTime,
      graceMinutes: 10,
      minEmployees: newShift.value.minEmployees,
      maxEmployees: newShift.value.maxEmployees,
      color: newShift.value.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    toast.add({ severity: 'success', summary: '班別已新增', life: 3000 })
    cancelAdd()
  } catch {
    addFormError.value = '新增失敗，請稍後再試'
  } finally {
    addingShift.value = false
  }
}

async function loadShiftTypes(): Promise<void> {
  shiftsLoading.value = true
  shiftsError.value = null
  try {
    shiftTypes.value = await shiftApi.getShiftTypes(1)
  } catch {
    shiftsError.value = '無法載入班別清單'
  } finally {
    shiftsLoading.value = false
  }
}

onMounted(() => {
  loadShiftTypes()
})
</script>

<style scoped>
.settings-page {
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

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}

.tab-btn.active {
  color: #0284c7;
  border-bottom-color: #0284c7;
}

.action-card {
  border-radius: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-form {
  background: #f9fafb;
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.add-form-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

.add-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
}

.required { color: #ef4444; }

.color-picker {
  width: 48px;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.add-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
}

/* Permission Matrix */
.permission-grid {
  overflow-x: auto;
}

.perm-header,
.perm-row {
  display: grid;
  grid-template-columns: 140px repeat(4, 1fr);
  border-bottom: 1px solid #f3f4f6;
}

.perm-header {
  font-weight: 700;
  font-size: 0.8rem;
  background: #f9fafb;
}

.perm-module-col {
  padding: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  border-right: 1px solid #f3f4f6;
}

.perm-role-col {
  padding: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
  border-right: 1px solid #f3f4f6;
}

.perm-actions {
  display: flex;
  justify-content: center;
  gap: 3px;
  flex-wrap: wrap;
}

.perm-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.perm-allowed {
  background: #d1fae5;
  color: #059669;
}

.perm-denied {
  background: #f3f4f6;
  color: #d1d5db;
}

.perm-note {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
}

.error-state { color: #dc2626; }

.empty-state {
  flex-direction: column;
}

.empty-state i {
  font-size: 2rem;
  color: #d1d5db;
}
</style>
