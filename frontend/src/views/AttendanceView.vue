<template>
  <AppLayout>
    <div class="attendance-page">
      <div class="page-header">
        <h2 class="page-title">出勤記錄</h2>
      </div>

      <!-- Filters -->
      <Card class="filter-card">
        <template #content>
          <div class="filter-row">
            <div class="filter-group">
              <label>開始日期</label>
              <InputText
                v-model="filterStartDate"
                type="date"
                class="filter-input"
              />
            </div>
            <div class="filter-group">
              <label>結束日期</label>
              <InputText
                v-model="filterEndDate"
                type="date"
                class="filter-input"
              />
            </div>
            <div class="filter-group">
              <label>狀態</label>
              <select v-model="filterStatus" class="p-inputtext filter-input">
                <option value="">全部</option>
                <option value="normal">正常</option>
                <option value="late">遲到</option>
                <option value="absent">缺勤</option>
                <option value="early_leave">早退</option>
                <option value="overtime">加班</option>
              </select>
            </div>
            <Button label="查詢" icon="pi pi-search" @click="loadRecords" :loading="loading" />
            <Button label="重置" icon="pi pi-refresh" severity="secondary" @click="resetFilter" />
          </div>
        </template>
      </Card>

      <!-- Records Table -->
      <Card class="table-card">
        <template #content>
          <div v-if="error" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ error }}</span>
          </div>
          <DataTable
            v-else
            :value="records"
            :loading="loading"
            :rows="pageSize"
            :total-records="totalRecords"
            :lazy="true"
            paginator
            responsive-layout="scroll"
            @page="onPage"
          >
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-inbox"></i>
                <p>無出勤記錄</p>
              </div>
            </template>

            <Column field="date" header="日期" style="min-width: 110px;" />
            <Column header="上班時間" style="min-width: 110px;">
              <template #body="{ data }">
                {{ data.checkInTime ? formatTime(data.checkInTime) : '--' }}
              </template>
            </Column>
            <Column header="下班時間" style="min-width: 110px;">
              <template #body="{ data }">
                {{ data.checkOutTime ? formatTime(data.checkOutTime) : '--' }}
              </template>
            </Column>
            <Column header="狀態" style="min-width: 90px;">
              <template #body="{ data }">
                <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column header="遲到（分）" style="min-width: 100px;">
              <template #body="{ data }">
                {{ data.lateMinutes > 0 ? `${data.lateMinutes} 分` : '--' }}
              </template>
            </Column>
            <Column header="加班時數" style="min-width: 100px;">
              <template #body="{ data }">
                {{ data.overtimeHours > 0 ? `${data.overtimeHours} h` : '--' }}
              </template>
            </Column>
            <Column field="note" header="備註" style="min-width: 120px;">
              <template #body="{ data }">
                {{ data.note ?? '--' }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { attendanceApi } from '@/api/attendance'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const records = ref<AttendanceRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const totalRecords = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filterStartDate = ref('')
const filterEndDate = ref('')
const filterStatus = ref('')

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function statusLabel(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    normal: '正常',
    late: '遲到',
    absent: '缺勤',
    early_leave: '早退',
    overtime: '加班'
  }
  return map[status] ?? status
}

function statusSeverity(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    normal: 'success',
    late: 'warn',
    absent: 'danger',
    early_leave: 'secondary',
    overtime: 'info'
  }
  return map[status] ?? 'secondary'
}

async function loadRecords(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (filterStartDate.value) params.startDate = filterStartDate.value
    if (filterEndDate.value) params.endDate = filterEndDate.value
    if (filterStatus.value) params.status = filterStatus.value

    const result = await attendanceApi.getRecords(params)
    records.value = result.data
    totalRecords.value = result.total
  } catch {
    error.value = '無法載入出勤記錄，請稍後再試'
  } finally {
    loading.value = false
  }
}

function resetFilter(): void {
  filterStartDate.value = ''
  filterEndDate.value = ''
  filterStatus.value = ''
  page.value = 1
  loadRecords()
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
  loadRecords()
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.attendance-page {
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

.filter-card,
.table-card {
  border-radius: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
}

.filter-input {
  min-width: 150px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
  gap: 0.5rem;
}

.empty-state i {
  font-size: 2.5rem;
}

.error-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: #dc2626;
}
</style>
