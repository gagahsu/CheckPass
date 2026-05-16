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
          v-if="isAdmin"
          class="tab-btn"
          :class="{ active: activeTab === 'workplaces' }"
          @click="switchToWorkplaces"
        >
          <i class="pi pi-map-marker"></i>
          工作地點
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

      <!-- Workplaces Tab -->
      <template v-if="activeTab === 'workplaces'">
        <Card class="action-card">
          <template #title>
            <div class="card-title-row">
              <span>工作地點清單</span>
              <Button label="新增工作地點" icon="pi pi-plus" size="small" @click="openWpDialog()" />
            </div>
          </template>
          <template #content>
            <div v-if="wpLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>載入中...</span>
            </div>
            <div v-else-if="wpError" class="error-state">
              <i class="pi pi-exclamation-triangle"></i>
              <span>{{ wpError }}</span>
            </div>
            <div v-else-if="workplaces.length === 0" class="empty-state">
              <i class="pi pi-map-marker"></i>
              <p>尚無工作地點設定</p>
            </div>
            <div v-else class="wp-list">
              <div v-for="wp in workplaces" :key="wp.id" class="wp-item">
                <div class="wp-item-header">
                  <span class="wp-item-name">{{ wp.name }}</span>
                  <span :class="['wp-status-badge', wp.isActive ? 'wp-active' : 'wp-inactive']">
                    {{ wp.isActive ? '啟用' : '停用' }}
                  </span>
                </div>
                <div class="wp-item-details">
                  <span><i class="pi pi-compass"></i> {{ wp.latitude }}, {{ wp.longitude }}</span>
                  <span><i class="pi pi-circle"></i> GPS 範圍 {{ wp.gpsRadiusMeters }} 公尺</span>
                  <span v-if="wp.wifiSsids"><i class="pi pi-wifi"></i> {{ wp.wifiSsids }}</span>
                </div>
                <div class="wp-item-actions">
                  <Button icon="pi pi-pencil" size="small" severity="secondary" text @click="openWpDialog(wp)" />
                  <Button icon="pi pi-trash" size="small" severity="danger" text @click="confirmDeleteWp(wp)" />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Workplace Dialog -->
        <Dialog v-model:visible="wpDialogVisible" :header="editingWp ? '編輯工作地點' : '新增工作地點'" modal :style="{ width: '440px' }">
          <div class="add-form-grid">
            <div class="form-group">
              <label class="form-label">地點名稱 <span class="required">*</span></label>
              <InputText v-model="wpForm.name" placeholder="例：台北辦公室" />
            </div>
            <div class="form-group">
              <label class="form-label">緯度 <span class="required">*</span></label>
              <InputText v-model.number="wpForm.latitude" type="number" step="0.000001" placeholder="25.033964" />
            </div>
            <div class="form-group">
              <label class="form-label">經度 <span class="required">*</span></label>
              <InputText v-model.number="wpForm.longitude" type="number" step="0.000001" placeholder="121.564468" />
            </div>
            <div class="form-group">
              <label class="form-label">GPS 範圍（公尺）</label>
              <InputText v-model.number="wpForm.gpsRadiusMeters" type="number" min="50" max="5000" placeholder="200" />
            </div>
            <div class="form-group" style="grid-column: 1 / -1">
              <label class="form-label">WiFi SSID（逗號分隔）</label>
              <InputText v-model="wpForm.wifiSsids" placeholder="例：Office-5G,Office-2.4G" />
            </div>
            <div v-if="editingWp" class="form-group" style="grid-column: 1 / -1">
              <label class="form-label">
                <input type="checkbox" v-model="wpForm.isActive" style="margin-right: 0.4rem" />
                啟用此地點
              </label>
            </div>
          </div>
          <div v-if="wpFormError" class="form-error">
            <i class="pi pi-exclamation-triangle"></i>
            {{ wpFormError }}
          </div>
          <template #footer>
            <Button label="取消" severity="secondary" size="small" @click="wpDialogVisible = false" />
            <Button :label="editingWp ? '儲存' : '新增'" icon="pi pi-check" size="small" :loading="wpSaving" @click="handleSaveWp" />
          </template>
        </Dialog>

        <!-- Delete Confirm Dialog -->
        <Dialog v-model:visible="wpDeleteDialogVisible" header="確認刪除" modal :style="{ width: '360px' }">
          <p>確定要刪除工作地點「{{ wpDeleteTarget?.name }}」嗎？此操作無法復原。</p>
          <template #footer>
            <Button label="取消" severity="secondary" @click="wpDeleteDialogVisible = false" />
            <Button label="刪除" severity="danger" :loading="wpDeleting" @click="doDeleteWp" />
          </template>
        </Dialog>
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
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { shiftApi } from '@/api/shift'
import { attendanceApi } from '@/api/attendance'
import type { ShiftType, WorkplaceSetting } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const toast = useToast()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.hasRole('admin'))

const activeTab = ref<'shifts' | 'workplaces' | 'roles'>('shifts')
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

// ─── Workplaces ───────────────────────────────────────────────────────────────

const workplaces = ref<WorkplaceSetting[]>([])
const wpLoading = ref(false)
const wpError = ref<string | null>(null)
const wpDialogVisible = ref(false)
const editingWp = ref<WorkplaceSetting | null>(null)
const wpForm = ref({ name: '', latitude: 0, longitude: 0, gpsRadiusMeters: 200, wifiSsids: '', isActive: true })
const wpFormError = ref<string | null>(null)
const wpSaving = ref(false)
const wpDeleteDialogVisible = ref(false)
const wpDeleteTarget = ref<WorkplaceSetting | null>(null)
const wpDeleting = ref(false)

async function loadWorkplaces(): Promise<void> {
  wpLoading.value = true
  wpError.value = null
  try {
    workplaces.value = await attendanceApi.listWorkplaces()
  } catch {
    wpError.value = '無法載入工作地點清單'
  } finally {
    wpLoading.value = false
  }
}

function switchToWorkplaces(): void {
  activeTab.value = 'workplaces'
  if (workplaces.value.length === 0) loadWorkplaces()
}

function openWpDialog(wp?: WorkplaceSetting): void {
  editingWp.value = wp ?? null
  wpForm.value = {
    name: wp?.name ?? '',
    latitude: wp ? Number(wp.latitude) : 0,
    longitude: wp ? Number(wp.longitude) : 0,
    gpsRadiusMeters: wp?.gpsRadiusMeters ?? 200,
    wifiSsids: wp?.wifiSsids ?? '',
    isActive: wp?.isActive ?? true,
  }
  wpFormError.value = null
  wpDialogVisible.value = true
}

async function handleSaveWp(): Promise<void> {
  wpFormError.value = null
  if (!wpForm.value.name.trim()) {
    wpFormError.value = '地點名稱不能為空'
    return
  }
  wpSaving.value = true
  try {
    const payload = {
      name: wpForm.value.name.trim(),
      latitude: wpForm.value.latitude,
      longitude: wpForm.value.longitude,
      gpsRadiusMeters: wpForm.value.gpsRadiusMeters,
      wifiSsids: wpForm.value.wifiSsids.trim() || null,
      isActive: wpForm.value.isActive,
    }
    if (editingWp.value) {
      const updated = await attendanceApi.updateWorkplace(editingWp.value.id, payload)
      const idx = workplaces.value.findIndex((w) => w.id === editingWp.value!.id)
      if (idx >= 0) workplaces.value[idx] = updated
      toast.add({ severity: 'success', summary: '工作地點已更新', life: 3000 })
    } else {
      const created = await attendanceApi.createWorkplace(payload)
      workplaces.value.push(created)
      toast.add({ severity: 'success', summary: '工作地點已新增', life: 3000 })
    }
    wpDialogVisible.value = false
  } catch {
    wpFormError.value = '操作失敗，請稍後再試'
  } finally {
    wpSaving.value = false
  }
}

function confirmDeleteWp(wp: WorkplaceSetting): void {
  wpDeleteTarget.value = wp
  wpDeleteDialogVisible.value = true
}

async function doDeleteWp(): Promise<void> {
  if (!wpDeleteTarget.value) return
  wpDeleting.value = true
  try {
    await attendanceApi.deleteWorkplace(wpDeleteTarget.value.id)
    workplaces.value = workplaces.value.filter((w) => w.id !== wpDeleteTarget.value!.id)
    wpDeleteDialogVisible.value = false
    toast.add({ severity: 'success', summary: '工作地點已刪除', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '刪除失敗', life: 3000 })
  } finally {
    wpDeleting.value = false
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

/* ─── Workplace ─────────────────────────────────────────────────── */

.wp-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wp-item {
  padding: 0.875rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem;
}

.wp-item-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  grid-column: 1;
}

.wp-item-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #111827;
}

.wp-status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.wp-active {
  background: #d1fae5;
  color: #059669;
}

.wp-inactive {
  background: #f3f4f6;
  color: #9ca3af;
}

.wp-item-details {
  grid-column: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.wp-item-details i {
  margin-right: 0.25rem;
}

.wp-item-actions {
  grid-column: 2;
  grid-row: 1 / 3;
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
}
</style>
