<template>
  <AppLayout>
    <div class="payroll-page">
      <div class="page-header">
        <h2 class="page-title">薪資查詢</h2>
      </div>

      <!-- Year/Month Selector -->
      <Card class="selector-card">
        <template #content>
          <div class="selector-row">
            <div class="selector-group">
              <label>年份</label>
              <select v-model="selectedYear" class="p-inputtext selector-input" @change="loadPayroll">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
              </select>
            </div>
            <div class="selector-group">
              <label>月份</label>
              <select v-model="selectedMonth" class="p-inputtext selector-input" @change="loadPayroll">
                <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
              </select>
            </div>
          </div>
        </template>
      </Card>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>載入薪資資料...</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
      </div>

      <!-- No Data -->
      <div v-else-if="!payroll" class="empty-state">
        <i class="pi pi-wallet"></i>
        <p>本月薪資尚未計算</p>
      </div>

      <template v-else>
        <!-- Payroll Summary -->
        <div class="summary-grid">
          <Card class="summary-card salary-blue">
            <template #content>
              <div class="summary-item">
                <p class="summary-label">基本薪資</p>
                <p class="summary-amount">{{ formatCurrency(payroll.baseSalary) }}</p>
              </div>
            </template>
          </Card>
          <Card class="summary-card salary-green">
            <template #content>
              <div class="summary-item">
                <p class="summary-label">加班費</p>
                <p class="summary-amount">{{ formatCurrency(payroll.overtimePay) }}</p>
              </div>
            </template>
          </Card>
          <Card class="summary-card salary-red">
            <template #content>
              <div class="summary-item">
                <p class="summary-label">扣款合計</p>
                <p class="summary-amount">-{{ formatCurrency(payroll.totalDeductions) }}</p>
              </div>
            </template>
          </Card>
          <Card class="summary-card salary-primary">
            <template #content>
              <div class="summary-item">
                <p class="summary-label">實領金額</p>
                <p class="summary-amount net">{{ formatCurrency(payroll.netSalary) }}</p>
              </div>
            </template>
          </Card>
        </div>

        <!-- Work Stats -->
        <Card class="stats-card">
          <template #title>出勤統計</template>
          <template #content>
            <div class="work-stats">
              <div class="stat-item">
                <span class="stat-label">應出勤</span>
                <span class="stat-val">{{ payroll.workingDays }} 天</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">實際出勤</span>
                <span class="stat-val">{{ payroll.actualWorkingDays }} 天</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">請假天數</span>
                <span class="stat-val">{{ payroll.leaveDays }} 天</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">狀態</span>
                <Tag :value="statusLabel(payroll.status)" :severity="statusSeverity(payroll.status)" />
              </div>
            </div>
          </template>
        </Card>

        <!-- Overtime Details -->
        <Card v-if="payroll.overtimeDetails.length > 0" class="overtime-card">
          <template #title>加班明細</template>
          <template #content>
            <DataTable :value="payroll.overtimeDetails" responsive-layout="scroll">
              <Column field="date" header="日期" />
              <Column field="hours" header="加班時數">
                <template #body="{ data }">
                  {{ data.hours }} h
                </template>
              </Column>
              <Column field="multiplier" header="倍率">
                <template #body="{ data }">
                  {{ data.multiplier }}x
                </template>
              </Column>
              <Column field="amount" header="加班費">
                <template #body="{ data }">
                  {{ formatCurrency(data.amount) }}
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>

        <!-- Deductions -->
        <Card v-if="payroll.deductions.length > 0" class="deductions-card">
          <template #title>扣款明細</template>
          <template #content>
            <DataTable :value="payroll.deductions" responsive-layout="scroll">
              <Column field="label" header="項目" />
              <Column field="amount" header="金額">
                <template #body="{ data }">
                  -{{ formatCurrency(data.amount) }}
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { payrollApi } from '@/api/payroll'
import type { Payroll, PayrollStatus } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const payroll = ref<Payroll | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

function statusLabel(status: PayrollStatus): string {
  const map: Record<PayrollStatus, string> = {
    draft: '草稿',
    confirmed: '已確認',
    paid: '已發放'
  }
  return map[status] ?? status
}

function statusSeverity(status: PayrollStatus): string {
  const map: Record<PayrollStatus, string> = {
    draft: 'secondary',
    confirmed: 'warn',
    paid: 'success'
  }
  return map[status] ?? 'secondary'
}

async function loadPayroll(): Promise<void> {
  loading.value = true
  error.value = null
  payroll.value = null
  try {
    payroll.value = await payrollApi.getPayroll(selectedYear.value, selectedMonth.value)
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } }
    if (e?.response?.status === 404) {
      payroll.value = null
    } else {
      error.value = '無法載入薪資資料'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPayroll()
})
</script>

<style scoped>
.payroll-page {
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

.selector-card,
.stats-card,
.overtime-card,
.deductions-card {
  border-radius: 12px;
}

.selector-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.selector-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
}

.selector-input {
  min-width: 120px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.summary-card {
  border-radius: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-label {
  font-size: 0.85rem;
  color: #6b7280;
}

.summary-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.summary-amount.net {
  color: #059669;
  font-size: 1.75rem;
}

.salary-red .summary-amount {
  color: #dc2626;
}

.work-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
}

.stat-val {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem;
  color: #9ca3af;
  background: white;
  border-radius: 12px;
}

.empty-state i,
.loading-state i {
  font-size: 2.5rem;
}

.error-state {
  color: #dc2626;
  flex-direction: row;
}
</style>
