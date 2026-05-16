<template>
  <AppLayout>
    <div class="payroll-page">
      <div class="page-header">
        <h2 class="page-title">薪資查詢</h2>
      </div>

      <!-- Period Selector -->
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

      <!-- Employee Payslip -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <span>載入薪資資料...</span>
      </div>
      <div v-else-if="loadError" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ loadError }}</span>
      </div>
      <div v-else-if="!payroll" class="empty-state">
        <i class="pi pi-wallet"></i>
        <p>本月薪資尚未計算</p>
      </div>
      <template v-else>
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
                <p class="summary-label">扣款</p>
                <p class="summary-amount">-{{ formatCurrency(payroll.deduction) }}</p>
              </div>
            </template>
          </Card>
          <Card class="summary-card salary-primary">
            <template #content>
              <div class="summary-item">
                <p class="summary-label">實領金額</p>
                <p class="summary-amount net">{{ formatCurrency(payroll.totalSalary) }}</p>
              </div>
            </template>
          </Card>
        </div>

        <Card class="stats-card">
          <template #title>扣款明細</template>
          <template #content>
            <div class="work-stats">
              <div class="stat-item">
                <span class="stat-label">健保費</span>
                <span class="stat-val deduction-red">-{{ formatCurrency(payroll.nhiDeduction) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">勞保費</span>
                <span class="stat-val deduction-red">-{{ formatCurrency(payroll.laborDeduction) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">合計扣款</span>
                <span class="stat-val deduction-red">-{{ formatCurrency(payroll.deduction) }}</span>
              </div>
            </div>
          </template>
        </Card>

        <Card class="stats-card">
          <template #title>出勤統計</template>
          <template #content>
            <div class="work-stats">
              <div class="stat-item">
                <span class="stat-label">出勤天數</span>
                <span class="stat-val">{{ payroll.workingDays }} 天</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">加班時數</span>
                <span class="stat-val">{{ payroll.overtimeHours }} h</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">遲到分鐘</span>
                <span class="stat-val">{{ payroll.lateMinutes }} 分</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">狀態</span>
                <Tag :value="statusLabel(payroll.status)" :severity="statusSeverity(payroll.status)" />
              </div>
            </div>
          </template>
        </Card>
      </template>

      <!-- HR Section -->
      <Card v-if="isHr" class="hr-card">
        <template #title>薪資管理（HR）</template>
        <template #content>
          <div class="hr-controls">
            <div class="selector-group">
              <label>員工ID</label>
              <InputText v-model.number="hrEmployeeId" type="number" placeholder="員工ID" class="hr-input" />
            </div>
            <div class="selector-group">
              <label>底薪（TWD）</label>
              <InputText v-model.number="hrBaseSalary" type="number" placeholder="45000" class="hr-input" />
            </div>
            <Button
              label="計算薪資"
              icon="pi pi-calculator"
              :loading="calculating"
              @click="handleCalculate"
            />
            <Button
              v-if="payroll && payroll.status === 'draft'"
              label="確認薪資"
              icon="pi pi-check"
              severity="success"
              :loading="confirming"
              @click="handleConfirm"
            />
          </div>
          <div v-if="hrError" class="hr-error">{{ hrError }}</div>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { payrollApi } from '@/api/payroll'
import type { Payroll, PayrollStatus } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const isHr = computed(() => authStore.hasRole('hr') || authStore.hasRole('admin'))

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const payroll = ref<Payroll | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const calculating = ref(false)
const confirming = ref(false)
const hrError = ref<string | null>(null)
const hrEmployeeId = ref<number | ''>('')
const hrBaseSalary = ref<number | ''>(45000)

const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

function formatCurrency(amount: number): string {
  return `NT$ ${Number(amount).toLocaleString('zh-TW')}`
}

function statusLabel(status: PayrollStatus): string {
  const map: Record<PayrollStatus, string> = { draft: '草稿', confirmed: '已確認' }
  return map[status] ?? status
}

function statusSeverity(status: PayrollStatus): string {
  const map: Record<PayrollStatus, string> = { draft: 'secondary', confirmed: 'success' }
  return map[status] ?? 'secondary'
}

async function loadPayroll(): Promise<void> {
  loading.value = true
  loadError.value = null
  payroll.value = null
  try {
    payroll.value = await payrollApi.getPayroll(selectedYear.value, selectedMonth.value)
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } }
    if (e?.response?.status !== 404) {
      loadError.value = '無法載入薪資資料'
    }
  } finally {
    loading.value = false
  }
}

async function handleCalculate(): Promise<void> {
  if (!hrEmployeeId.value) {
    hrError.value = '請輸入員工ID'
    return
  }
  calculating.value = true
  hrError.value = null
  try {
    const result = await payrollApi.calculate(
      Number(hrEmployeeId.value),
      selectedYear.value,
      selectedMonth.value,
      hrBaseSalary.value ? Number(hrBaseSalary.value) : undefined,
    )
    payroll.value = result
  } catch {
    hrError.value = '計算失敗，請確認員工ID是否正確'
  } finally {
    calculating.value = false
  }
}

async function handleConfirm(): Promise<void> {
  if (!payroll.value) return
  confirming.value = true
  hrError.value = null
  try {
    payroll.value = await payrollApi.confirm(payroll.value.id)
  } catch {
    hrError.value = '確認失敗，請稍後再試'
  } finally {
    confirming.value = false
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
.hr-card {
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

.salary-red .summary-amount { color: #dc2626; }

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

.stat-val.deduction-red {
  color: #dc2626;
}

.hr-controls {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.hr-input {
  min-width: 130px;
}

.hr-error {
  margin-top: 0.75rem;
  padding: 0.6rem 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.875rem;
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
.loading-state i { font-size: 2.5rem; }

.error-state {
  color: #dc2626;
  flex-direction: row;
}
</style>
