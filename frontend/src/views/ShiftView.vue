<template>
  <AppLayout>
    <div class="shift-page">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">班表管理</h2>
          <Tag
            :value="scheduleStatus === 'published' ? '已發布' : '草稿'"
            :severity="scheduleStatus === 'published' ? 'success' : 'secondary'"
          />
        </div>
        <div class="header-right">
          <Button
            v-if="canManage"
            label="新增班別"
            icon="pi pi-plus"
            severity="secondary"
            @click="openAddShiftType"
          />
          <Button
            v-if="canManage"
            label="發布班表"
            icon="pi pi-send"
            :loading="publishing"
            :disabled="scheduleStatus === 'published'"
            @click="handlePublish"
          />
        </div>
      </div>

      <div class="shift-layout">
        <!-- Shift Types Panel -->
        <Card class="shift-types-panel">
          <template #title>班別列表</template>
          <template #content>
            <div v-if="shiftTypesLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div v-else-if="shiftTypes.length === 0" class="empty-types">
              <p>尚無班別，請新增</p>
            </div>
            <div v-else class="shift-types-list">
              <div
                v-for="st in shiftTypes"
                :key="st.id"
                class="shift-type-item"
                :style="{ borderLeft: `4px solid ${st.color}` }"
                :draggable="canManage"
                @dragstart="onShiftTypeDragStart(st)"
              >
                <div class="shift-type-name">{{ st.name }}</div>
                <div class="shift-type-time">{{ st.startTime }} – {{ st.endTime }}</div>
                <div class="shift-type-range">{{ st.minStaff }}–{{ st.maxStaff }} 人</div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Calendar -->
        <Card class="calendar-card">
          <template #title>
            <div class="calendar-nav">
              <Button icon="pi pi-chevron-left" severity="secondary" text @click="prevWeek" />
              <span class="week-label">{{ weekLabel }}</span>
              <Button icon="pi pi-chevron-right" severity="secondary" text @click="nextWeek" />
            </div>
          </template>
          <template #content>
            <div v-if="scheduleLoading || employeesLoading" class="loading-state">
              <i class="pi pi-spin pi-spinner"></i>
              <span>載入中...</span>
            </div>
            <div v-else class="week-calendar">
              <!-- Header -->
              <div class="cal-header">
                <div class="cal-cell cal-empty"></div>
                <div v-for="day in weekDays" :key="day.iso" class="cal-cell cal-day-header">
                  <div class="day-name">{{ day.weekday }}</div>
                  <div class="day-date" :class="{ today: day.isToday }">{{ day.date }}</div>
                </div>
              </div>

              <!-- Employee rows -->
              <div v-if="allEmployees.length === 0" class="empty-cal">
                <p>無員工資料</p>
              </div>
              <div v-for="emp in allEmployees" :key="emp.id" class="cal-row">
                <div class="cal-cell cal-emp-name">
                  <Avatar :label="emp.name.charAt(0)" size="small" shape="circle" />
                  <span>{{ emp.name }}</span>
                </div>
                <div
                  v-for="day in weekDays"
                  :key="day.iso"
                  class="cal-cell cal-day-cell"
                  :class="{ droptarget: canManage && dragOverCell === `${emp.id}-${day.iso}` }"
                  @dragover.prevent="canManage && (dragOverCell = `${emp.id}-${day.iso}`)"
                  @dragleave="dragOverCell = null"
                  @drop="canManage && onDrop(emp.id, day.iso)"
                >
                  <div
                    v-for="entry in getEntries(emp.id, day.iso)"
                    :key="entry.id"
                    class="cal-event"
                    :style="{ background: entry.shiftType?.color ?? '#06b6d4' }"
                    :title="canManage ? '點擊移除' : entry.shiftType?.name"
                    @click="canManage && removeEntry(entry.id)"
                  >
                    {{ entry.shiftType?.name ?? '未知班別' }}
                  </div>
                </div>
              </div>
            </div>

            <p v-if="canManage" class="drag-hint">
              <i class="pi pi-info-circle"></i>
              將左側班別拖放到格子中排班，點擊格子中的班別可移除
            </p>
          </template>
        </Card>
      </div>

      <!-- Add Shift Type Dialog -->
      <Dialog
        v-model:visible="addShiftTypeVisible"
        header="新增班別"
        modal
        :style="{ width: '420px' }"
      >
        <form class="shift-type-form" @submit.prevent="handleAddShiftType">
          <div class="form-group">
            <label class="form-label">班別名稱 *</label>
            <InputText v-model="newShiftType.name" placeholder="早班、午班..." class="w-full" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">開始時間 *</label>
              <InputText v-model="newShiftType.startTime" type="time" class="w-full" required />
            </div>
            <div class="form-group">
              <label class="form-label">結束時間 *</label>
              <InputText v-model="newShiftType.endTime" type="time" class="w-full" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">休息時間（分）</label>
              <InputText v-model.number="newShiftType.breakMinutes" type="number" min="0" max="480" class="w-full" />
            </div>
            <div class="form-group">
              <label class="form-label">彈性時間（分）</label>
              <InputText v-model.number="newShiftType.graceMinutes" type="number" min="0" max="60" class="w-full" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">顏色</label>
            <div class="color-picker">
              <label
                v-for="c in colorOptions"
                :key="c"
                class="color-option"
                :class="{ selected: newShiftType.color === c }"
                :style="{ background: c }"
                @click="newShiftType.color = c"
              ></label>
            </div>
          </div>
          <div v-if="addShiftTypeError" class="form-error">{{ addShiftTypeError }}</div>
        </form>
        <template #footer>
          <Button label="取消" severity="secondary" @click="addShiftTypeVisible = false" />
          <Button label="新增" icon="pi pi-check" :loading="addingShiftType" @click="handleAddShiftType" />
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
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { shiftApi } from '@/api/shift'
import { hrApi } from '@/api/hr'
import type { ShiftType, ScheduleEntry, ScheduleStatus, Employee } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const toast = useToast()
const authStore = useAuthStore()

const canManage = computed(
  () => authStore.hasRole('manager') || authStore.hasRole('hr') || authStore.hasRole('admin'),
)

const storeId = ref(1)
const weekStart = ref(getMonday(new Date()))
const shiftTypes = ref<ShiftType[]>([])
const scheduleEntries = ref<ScheduleEntry[]>([])
const allEmployees = ref<Employee[]>([])
const shiftTypesLoading = ref(false)
const scheduleLoading = ref(false)
const employeesLoading = ref(false)
const publishing = ref(false)
const scheduleStatus = ref<ScheduleStatus>('draft')
const draggedShiftType = ref<ShiftType | null>(null)
const dragOverCell = ref<string | null>(null)

// Add shift type dialog
const addShiftTypeVisible = ref(false)
const addingShiftType = ref(false)
const addShiftTypeError = ref<string | null>(null)
const colorOptions = ['#06b6d4', '#0284c7', '#7c3aed', '#16a34a', '#ea580c', '#dc2626', '#f59e0b', '#64748b']
const newShiftType = ref({
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
  graceMinutes: 5,
  color: '#06b6d4',
})

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}

const weekDays = computed(() => {
  const days = []
  const start = new Date(weekStart.value + 'T00:00:00')
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
  const today = new Date().toISOString().split('T')[0]
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    days.push({
      iso,
      weekday: `週${weekdayNames[d.getDay()]}`,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: iso === today,
    })
  }
  return days
})

const weekLabel = computed(() => {
  const start = new Date(weekStart.value + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
})

function getEntries(empId: number, date: string): ScheduleEntry[] {
  return scheduleEntries.value.filter((e) => e.employeeId === empId && e.date === date)
}

function prevWeek(): void {
  const d = new Date(weekStart.value + 'T00:00:00')
  d.setDate(d.getDate() - 7)
  weekStart.value = d.toISOString().split('T')[0]
  loadSchedule()
}

function nextWeek(): void {
  const d = new Date(weekStart.value + 'T00:00:00')
  d.setDate(d.getDate() + 7)
  weekStart.value = d.toISOString().split('T')[0]
  loadSchedule()
}

function onShiftTypeDragStart(st: ShiftType): void {
  draggedShiftType.value = st
}

async function onDrop(empId: number, date: string): Promise<void> {
  dragOverCell.value = null
  if (!draggedShiftType.value) return
  try {
    const entry = await shiftApi.assignShift({
      employeeId: empId,
      shiftTypeId: draggedShiftType.value.id,
      date,
      storeId: storeId.value,
    })
    scheduleEntries.value.push(entry)
    toast.add({ severity: 'success', summary: '排班成功', detail: `${date} 已排班`, life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: '排班失敗', detail: '請稍後再試', life: 3000 })
  }
  draggedShiftType.value = null
}

async function removeEntry(scheduleId: number): Promise<void> {
  try {
    await shiftApi.removeShift(scheduleId)
    scheduleEntries.value = scheduleEntries.value.filter((e) => e.id !== scheduleId)
    toast.add({ severity: 'success', summary: '已移除', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: '移除失敗', life: 3000 })
  }
}

async function handlePublish(): Promise<void> {
  publishing.value = true
  try {
    await shiftApi.publishSchedule(storeId.value, weekStart.value)
    scheduleStatus.value = 'published'
    toast.add({ severity: 'success', summary: '班表已發布', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '發布失敗', life: 3000 })
  } finally {
    publishing.value = false
  }
}

function openAddShiftType(): void {
  newShiftType.value = { name: '', startTime: '09:00', endTime: '18:00', breakMinutes: 60, graceMinutes: 5, color: '#06b6d4' }
  addShiftTypeError.value = null
  addShiftTypeVisible.value = true
}

async function handleAddShiftType(): Promise<void> {
  if (!newShiftType.value.name.trim()) {
    addShiftTypeError.value = '請填寫班別名稱'
    return
  }
  addingShiftType.value = true
  addShiftTypeError.value = null
  try {
    const created = await shiftApi.createShiftType({
      ...newShiftType.value,
      startTime: newShiftType.value.startTime.slice(0, 5),
      endTime: newShiftType.value.endTime.slice(0, 5),
      storeId: storeId.value,
    })
    shiftTypes.value.push(created)
    addShiftTypeVisible.value = false
    toast.add({ severity: 'success', summary: `班別「${created.name}」已新增`, life: 3000 })
  } catch {
    addShiftTypeError.value = '新增失敗，請稍後再試'
  } finally {
    addingShiftType.value = false
  }
}

async function loadShiftTypes(): Promise<void> {
  shiftTypesLoading.value = true
  try {
    shiftTypes.value = await shiftApi.getShiftTypes(storeId.value)
  } catch {
    shiftTypes.value = []
  } finally {
    shiftTypesLoading.value = false
  }
}

async function loadSchedule(): Promise<void> {
  scheduleLoading.value = true
  try {
    const entries = await shiftApi.getSchedule(storeId.value, weekStart.value)
    scheduleEntries.value = entries
    scheduleStatus.value = entries.some((e) => e.status === 'published') ? 'published' : 'draft'
  } catch {
    scheduleEntries.value = []
  } finally {
    scheduleLoading.value = false
  }
}

async function loadEmployees(): Promise<void> {
  employeesLoading.value = true
  try {
    const res = await hrApi.listEmployees({ page: 1, pageSize: 500, status: 'active' })
    allEmployees.value = res.data
  } catch {
    allEmployees.value = []
  } finally {
    employeesLoading.value = false
  }
}

onMounted(() => {
  loadShiftTypes()
  loadSchedule()
  loadEmployees()
})
</script>

<style scoped>
.shift-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.shift-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;
}

.shift-types-panel {
  border-radius: 12px;
}

.shift-types-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.shift-type-item {
  padding: 0.65rem 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  cursor: grab;
  user-select: none;
  transition: background 0.15s;
}

.shift-type-item:hover {
  background: #f0f9ff;
}

.shift-type-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
}

.shift-type-time {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 0.15rem;
}

.shift-type-range {
  font-size: 0.75rem;
  color: #9ca3af;
}

.empty-types {
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 1rem 0;
}

.calendar-card {
  border-radius: 12px;
  overflow: auto;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.week-label {
  font-size: 1rem;
  font-weight: 600;
  min-width: 140px;
  text-align: center;
}

.week-calendar {
  overflow-x: auto;
}

.cal-header,
.cal-row {
  display: grid;
  grid-template-columns: 140px repeat(7, 1fr);
  border-bottom: 1px solid #f3f4f6;
}

.cal-header {
  font-weight: 600;
  font-size: 0.8rem;
  background: #f9fafb;
}

.cal-cell {
  padding: 0.5rem;
  border-right: 1px solid #f3f4f6;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cal-empty {
  background: transparent;
}

.cal-day-header {
  text-align: center;
  align-items: center;
  justify-content: center;
}

.day-name {
  font-size: 0.75rem;
  color: #6b7280;
}

.day-date {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.day-date.today {
  background: #06b6d4;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.cal-emp-name {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  min-height: 56px;
}

.cal-day-cell {
  min-height: 56px;
  min-width: 80px;
  transition: background 0.15s;
}

.cal-day-cell.droptarget {
  background: #e0f2fe;
}

.cal-event {
  font-size: 0.72rem;
  font-weight: 600;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-event:hover {
  opacity: 0.8;
}

.empty-cal {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
}

.drag-hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
}

/* Add shift type form */
.shift-type-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0 0.5rem;
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
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.w-full { width: 100%; }

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: border-color 0.15s;
}

.color-option.selected {
  border-color: #111827;
}

.form-error {
  color: #dc2626;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background: #fee2e2;
  border-radius: 6px;
}

@media (max-width: 768px) {
  .shift-layout {
    grid-template-columns: 1fr;
  }
}
</style>
