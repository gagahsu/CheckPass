<template>
  <AppLayout>
    <div class="org-page">
      <div class="page-header">
        <h2 class="page-title">組織管理</h2>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'departments' }" @click="activeTab = 'departments'">
          <i class="pi pi-building"></i>
          部門管理
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'positions' }" @click="activeTab = 'positions'">
          <i class="pi pi-id-card"></i>
          職位管理
        </button>
      </div>

      <!-- Departments Tab -->
      <template v-if="activeTab === 'departments'">
        <Card class="org-card">
          <template #title>
            <div class="card-title-row">
              <span>部門清單</span>
              <Button v-if="canEdit" label="新增部門" icon="pi pi-plus" size="small" @click="openDeptDialog()" />
            </div>
          </template>
          <template #content>
            <div v-if="deptsLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>載入中...</span>
            </div>
            <div v-else-if="deptsError" class="error-state">{{ deptsError }}</div>
            <div v-else-if="departments.length === 0" class="empty-state">
              <i class="pi pi-inbox"></i>
              <p>尚無部門資料</p>
            </div>
            <div v-else class="org-list">
              <div v-for="dept in departments" :key="dept.id" class="org-item">
                <div class="org-item-info">
                  <span class="org-item-name">{{ dept.name }}</span>
                  <Tag v-if="dept.code" :value="dept.code" severity="secondary" class="org-item-code" />
                </div>
                <div class="org-item-actions">
                  <Button v-if="canEdit" icon="pi pi-pencil" size="small" severity="secondary" text @click="openDeptDialog(dept)" />
                  <Button v-if="canDelete" icon="pi pi-trash" size="small" severity="danger" text @click="confirmDeleteDept(dept)" />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </template>

      <!-- Positions Tab -->
      <template v-if="activeTab === 'positions'">
        <Card class="org-card">
          <template #title>
            <div class="card-title-row">
              <span>職位清單</span>
              <Button v-if="canEdit" label="新增職位" icon="pi pi-plus" size="small" @click="openPosDialog()" />
            </div>
          </template>
          <template #content>
            <div v-if="posLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>載入中...</span>
            </div>
            <div v-else-if="posError" class="error-state">{{ posError }}</div>
            <div v-else-if="positions.length === 0" class="empty-state">
              <i class="pi pi-inbox"></i>
              <p>尚無職位資料</p>
            </div>
            <div v-else class="org-list">
              <div v-for="pos in positions" :key="pos.id" class="org-item">
                <div class="org-item-info">
                  <span class="org-item-name">{{ pos.name }}</span>
                  <Tag :value="`Lv.${pos.level}`" severity="info" class="org-item-code" />
                  <span v-if="pos.departmentId" class="org-item-dept">
                    {{ deptName(pos.departmentId) }}
                  </span>
                </div>
                <div class="org-item-actions">
                  <Button v-if="canEdit" icon="pi pi-pencil" size="small" severity="secondary" text @click="openPosDialog(pos)" />
                  <Button v-if="canDelete" icon="pi pi-trash" size="small" severity="danger" text @click="confirmDeletePos(pos)" />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </template>

      <!-- Department Dialog -->
      <Dialog v-model:visible="deptDialogVisible" :header="editingDept ? '編輯部門' : '新增部門'" modal :style="{ width: '400px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">部門名稱 <span class="required">*</span></label>
            <InputText v-model="deptForm.name" placeholder="例：資訊部" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">部門代碼</label>
            <InputText v-model="deptForm.code" placeholder="例：IT" class="w-full" />
          </div>
        </div>
        <div v-if="deptFormError" class="form-error">{{ deptFormError }}</div>
        <template #footer>
          <Button label="取消" severity="secondary" @click="deptDialogVisible = false" />
          <Button :label="editingDept ? '儲存' : '新增'" icon="pi pi-check" :loading="deptSaving" @click="handleSaveDept" />
        </template>
      </Dialog>

      <!-- Position Dialog -->
      <Dialog v-model:visible="posDialogVisible" :header="editingPos ? '編輯職位' : '新增職位'" modal :style="{ width: '400px' }">
        <div class="dialog-form">
          <div class="form-group">
            <label class="form-label">職位名稱 <span class="required">*</span></label>
            <InputText v-model="posForm.name" placeholder="例：工程師" class="w-full" />
          </div>
          <div class="form-group">
            <label class="form-label">所屬部門</label>
            <select v-model="posForm.departmentId" class="p-inputtext w-full">
              <option :value="null">-- 不指定 --</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">職級</label>
            <InputText v-model.number="posForm.level" type="number" min="1" class="w-full" />
          </div>
        </div>
        <div v-if="posFormError" class="form-error">{{ posFormError }}</div>
        <template #footer>
          <Button label="取消" severity="secondary" @click="posDialogVisible = false" />
          <Button :label="editingPos ? '儲存' : '新增'" icon="pi pi-check" :loading="posSaving" @click="handleSavePos" />
        </template>
      </Dialog>

      <!-- Delete Confirm Dialog -->
      <Dialog v-model:visible="deleteDialogVisible" header="確認刪除" modal :style="{ width: '360px' }">
        <p>確定要刪除「{{ deleteTarget?.name }}」嗎？此操作無法復原。</p>
        <template #footer>
          <Button label="取消" severity="secondary" @click="deleteDialogVisible = false" />
          <Button label="刪除" severity="danger" :loading="deleting" @click="confirmDelete" />
        </template>
      </Dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { orgApi } from '@/api/org'
import type { Department, Position } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const toast = useToast()
const authStore = useAuthStore()

const activeTab = ref<'departments' | 'positions'>('departments')

const canEdit = computed(() => authStore.hasRole('hr') || authStore.hasRole('admin'))
const canDelete = computed(() => authStore.hasRole('admin'))

// ─── Departments ─────────────────────────────────────────────────────────────

const departments = ref<Department[]>([])
const deptsLoading = ref(false)
const deptsError = ref<string | null>(null)
const deptDialogVisible = ref(false)
const editingDept = ref<Department | null>(null)
const deptForm = ref({ name: '', code: '' })
const deptFormError = ref<string | null>(null)
const deptSaving = ref(false)

async function loadDepartments(): Promise<void> {
  deptsLoading.value = true
  deptsError.value = null
  try {
    departments.value = await orgApi.listDepartments()
  } catch {
    deptsError.value = '無法載入部門清單'
  } finally {
    deptsLoading.value = false
  }
}

function openDeptDialog(dept?: Department): void {
  editingDept.value = dept ?? null
  deptForm.value = { name: dept?.name ?? '', code: dept?.code ?? '' }
  deptFormError.value = null
  deptDialogVisible.value = true
}

async function handleSaveDept(): Promise<void> {
  if (!deptForm.value.name.trim()) {
    deptFormError.value = '部門名稱不能為空'
    return
  }
  deptSaving.value = true
  deptFormError.value = null
  try {
    if (editingDept.value) {
      const updated = await orgApi.updateDepartment(editingDept.value.id, {
        name: deptForm.value.name.trim(),
        code: deptForm.value.code.trim() || undefined,
      })
      const idx = departments.value.findIndex((d) => d.id === editingDept.value!.id)
      if (idx >= 0) departments.value[idx] = updated
    } else {
      const created = await orgApi.createDepartment({
        name: deptForm.value.name.trim(),
        code: deptForm.value.code.trim() || undefined,
      })
      departments.value.push(created)
      departments.value.sort((a, b) => a.name.localeCompare(b.name))
    }
    deptDialogVisible.value = false
    toast.add({ severity: 'success', summary: editingDept.value ? '部門已更新' : '部門已新增', life: 3000 })
  } catch {
    deptFormError.value = '操作失敗，請稍後再試'
  } finally {
    deptSaving.value = false
  }
}

// ─── Positions ────────────────────────────────────────────────────────────────

const positions = ref<Position[]>([])
const posLoading = ref(false)
const posError = ref<string | null>(null)
const posDialogVisible = ref(false)
const editingPos = ref<Position | null>(null)
const posForm = ref<{ name: string; departmentId: number | null; level: number }>({ name: '', departmentId: null, level: 1 })
const posFormError = ref<string | null>(null)
const posSaving = ref(false)

async function loadPositions(): Promise<void> {
  posLoading.value = true
  posError.value = null
  try {
    positions.value = await orgApi.listPositions()
  } catch {
    posError.value = '無法載入職位清單'
  } finally {
    posLoading.value = false
  }
}

function openPosDialog(pos?: Position): void {
  editingPos.value = pos ?? null
  posForm.value = { name: pos?.name ?? '', departmentId: pos?.departmentId ?? null, level: pos?.level ?? 1 }
  posFormError.value = null
  posDialogVisible.value = true
}

async function handleSavePos(): Promise<void> {
  if (!posForm.value.name.trim()) {
    posFormError.value = '職位名稱不能為空'
    return
  }
  posSaving.value = true
  posFormError.value = null
  try {
    if (editingPos.value) {
      const updated = await orgApi.updatePosition(editingPos.value.id, {
        name: posForm.value.name.trim(),
        departmentId: posForm.value.departmentId ?? undefined,
        level: posForm.value.level,
      })
      const idx = positions.value.findIndex((p) => p.id === editingPos.value!.id)
      if (idx >= 0) positions.value[idx] = updated
    } else {
      const created = await orgApi.createPosition({
        name: posForm.value.name.trim(),
        departmentId: posForm.value.departmentId ?? undefined,
        level: posForm.value.level,
      })
      positions.value.push(created)
    }
    posDialogVisible.value = false
    toast.add({ severity: 'success', summary: editingPos.value ? '職位已更新' : '職位已新增', life: 3000 })
  } catch {
    posFormError.value = '操作失敗，請稍後再試'
  } finally {
    posSaving.value = false
  }
}

function deptName(deptId: number | null): string {
  if (!deptId) return ''
  return departments.value.find((d) => d.id === deptId)?.name ?? `部門 #${deptId}`
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteDialogVisible = ref(false)
const deleteTarget = ref<{ id: number; name: string; type: 'dept' | 'pos' } | null>(null)
const deleting = ref(false)

function confirmDeleteDept(dept: Department): void {
  deleteTarget.value = { id: dept.id, name: dept.name, type: 'dept' }
  deleteDialogVisible.value = true
}

function confirmDeletePos(pos: Position): void {
  deleteTarget.value = { id: pos.id, name: pos.name, type: 'pos' }
  deleteDialogVisible.value = true
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    if (deleteTarget.value.type === 'dept') {
      await orgApi.deleteDepartment(deleteTarget.value.id)
      departments.value = departments.value.filter((d) => d.id !== deleteTarget.value!.id)
    } else {
      await orgApi.deletePosition(deleteTarget.value.id)
      positions.value = positions.value.filter((p) => p.id !== deleteTarget.value!.id)
    }
    deleteDialogVisible.value = false
    toast.add({ severity: 'success', summary: '已刪除', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '刪除失敗', life: 3000 })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadDepartments()
  loadPositions()
})
</script>

<style scoped>
.org-page {
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

.org-card {
  border-radius: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.org-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.org-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.org-item-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
}

.org-item-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.9rem;
}

.org-item-code {
  font-size: 0.75rem;
}

.org-item-dept {
  font-size: 0.78rem;
  color: #6b7280;
}

.org-item-actions {
  display: flex;
  gap: 0.25rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0 0.5rem;
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

.w-full { width: 100%; }

.form-error {
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 0.5rem;
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
