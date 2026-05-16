<template>
  <AppLayout>
    <div class="audit-page">
      <div class="page-header">
        <h2 class="page-title">稽核日誌</h2>
      </div>

      <!-- Filters -->
      <Card class="filter-card">
        <template #content>
          <div class="filter-row">
            <div class="filter-group">
              <label>類型</label>
              <select v-model="filterEntityType" class="p-inputtext filter-input">
                <option value="">全部</option>
                <option value="attendance">出勤</option>
                <option value="payroll">薪資</option>
              </select>
            </div>
            <div class="filter-group">
              <label>開始日期</label>
              <InputText v-model="filterStartDate" type="date" class="filter-input" />
            </div>
            <div class="filter-group">
              <label>結束日期</label>
              <InputText v-model="filterEndDate" type="date" class="filter-input" />
            </div>
            <Button label="查詢" icon="pi pi-search" @click="load" :loading="loading" />
            <Button label="重置" icon="pi pi-refresh" severity="secondary" @click="reset" />
          </div>
        </template>
      </Card>

      <!-- Table -->
      <Card class="table-card">
        <template #content>
          <DataTable
            :value="logs"
            :loading="loading"
            :rows="pageSize"
            :total-records="total"
            :lazy="true"
            paginator
            responsive-layout="scroll"
            @page="onPage"
          >
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-shield"></i>
                <p>無稽核記錄</p>
              </div>
            </template>

            <Column field="id" header="ID" style="min-width: 70px;" />
            <Column header="時間" style="min-width: 160px;">
              <template #body="{ data }">
                {{ formatDateTime(data.createdAt) }}
              </template>
            </Column>
            <Column header="操作者 ID" style="min-width: 90px;">
              <template #body="{ data }">
                #{{ data.actorId }}
              </template>
            </Column>
            <Column header="動作" style="min-width: 130px;">
              <template #body="{ data }">
                <Tag :value="actionLabel(data.action)" :severity="actionSeverity(data.action)" />
              </template>
            </Column>
            <Column header="對象" style="min-width: 100px;">
              <template #body="{ data }">
                {{ entityLabel(data.entityType) }}
                <span v-if="data.entityId"> #{{ data.entityId }}</span>
              </template>
            </Column>
            <Column header="詳情" style="min-width: 200px;">
              <template #body="{ data }">
                <span class="payload-text">{{ formatPayload(data.payload) }}</span>
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
import { auditApi } from '@/api/audit'
import type { AuditLog } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const logs = ref<AuditLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const loading = ref(false)

const filterEntityType = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    check_in:          '上班打卡',
    check_out:         '下班打卡',
    payroll_calculate: '薪資計算',
    payroll_confirm:   '薪資確認',
  }
  return map[action] ?? action
}

function actionSeverity(action: string): string {
  if (action === 'check_in')          return 'success'
  if (action === 'check_out')         return 'secondary'
  if (action === 'payroll_calculate') return 'warn'
  if (action === 'payroll_confirm')   return 'info'
  return 'secondary'
}

function entityLabel(type: string): string {
  return type === 'attendance' ? '出勤' : type === 'payroll' ? '薪資' : type
}

function formatPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return '—'
  return Object.entries(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await auditApi.getLogs({
      entityType: filterEntityType.value || undefined,
      startDate:  filterStartDate.value  || undefined,
      endDate:    filterEndDate.value    || undefined,
      page:       page.value,
      pageSize:   pageSize.value,
    })
    logs.value  = res.data
    total.value = res.total
  } catch {
    // silently ignore
  } finally {
    loading.value = false
  }
}

function reset(): void {
  filterEntityType.value = ''
  filterStartDate.value  = ''
  filterEndDate.value    = ''
  page.value = 1
  load()
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
  load()
}

onMounted(load)
</script>

<style scoped>
.audit-page {
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

.filter-card :deep(.p-card-body) { padding: 1rem; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-input { width: 160px; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #9ca3af;
}

.empty-state i { font-size: 2rem; }

.payload-text {
  font-size: 0.8rem;
  color: #6b7280;
  font-family: monospace;
}
</style>
