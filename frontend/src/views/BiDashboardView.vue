<template>
  <AppLayout>
    <div class="bi-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">數據分析</h2>
          <p class="page-sub">{{ reportDate }} · 即時報表</p>
        </div>
        <Button icon="pi pi-refresh" severity="secondary" text @click="loadAll" :loading="loading" />
      </div>

      <!-- Today's Attendance Overview -->
      <section class="section">
        <h3 class="section-title">今日出勤概覽</h3>
        <div v-if="todayLoading" class="loading-row">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <div v-else class="today-grid">
          <div class="stat-card stat-total">
            <div class="stat-icon"><i class="pi pi-users"></i></div>
            <div class="stat-body">
              <p class="stat-num">{{ today.total }}</p>
              <p class="stat-label">總人數</p>
            </div>
          </div>
          <div class="stat-card stat-present">
            <div class="stat-icon"><i class="pi pi-check-circle"></i></div>
            <div class="stat-body">
              <p class="stat-num">{{ today.present }}</p>
              <p class="stat-label">正常出勤</p>
            </div>
            <div class="stat-bar" :style="barStyle(today.present, today.total, '#059669')"></div>
          </div>
          <div class="stat-card stat-late">
            <div class="stat-icon"><i class="pi pi-clock"></i></div>
            <div class="stat-body">
              <p class="stat-num">{{ today.late }}</p>
              <p class="stat-label">遲到</p>
            </div>
            <div class="stat-bar" :style="barStyle(today.late, today.total, '#f59e0b')"></div>
          </div>
          <div class="stat-card stat-absent">
            <div class="stat-icon"><i class="pi pi-times-circle"></i></div>
            <div class="stat-body">
              <p class="stat-num">{{ today.absent }}</p>
              <p class="stat-label">缺勤</p>
            </div>
            <div class="stat-bar" :style="barStyle(today.absent, today.total, '#ef4444')"></div>
          </div>

          <!-- Donut Chart -->
          <div class="stat-card donut-card">
            <p class="donut-title">出勤率</p>
            <div class="donut-wrap">
              <div class="donut" :style="donutStyle"></div>
              <span class="donut-pct">{{ attendanceRate }}%</span>
            </div>
            <div class="donut-legend">
              <span class="legend-dot" style="background:#059669"></span><span>正常</span>
              <span class="legend-dot" style="background:#f59e0b"></span><span>遲到</span>
              <span class="legend-dot" style="background:#ef4444"></span><span>缺勤</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Personal Month Summary -->
      <section class="section">
        <h3 class="section-title">本月個人統計</h3>
        <div v-if="monthLoading" class="loading-row">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <div v-else class="month-grid">
          <div class="metric-card">
            <i class="pi pi-calendar-check metric-icon metric-blue"></i>
            <p class="metric-val">{{ monthSummary.workDays }}</p>
            <p class="metric-label">出勤天數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-hourglass metric-icon metric-cyan"></i>
            <p class="metric-val">{{ monthSummary.totalHours.toFixed(1) }}h</p>
            <p class="metric-label">總工時</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-bolt metric-icon metric-orange"></i>
            <p class="metric-val">{{ monthSummary.overtimeHours.toFixed(1) }}h</p>
            <p class="metric-label">加班時數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-exclamation-triangle metric-icon metric-yellow"></i>
            <p class="metric-val">{{ monthSummary.lateCount }}</p>
            <p class="metric-label">遲到次數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-ban metric-icon metric-red"></i>
            <p class="metric-val">{{ monthSummary.absentCount }}</p>
            <p class="metric-label">缺勤次數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-sign-out metric-icon metric-gray"></i>
            <p class="metric-val">{{ monthSummary.earlyLeaveCount }}</p>
            <p class="metric-label">早退次數</p>
          </div>
        </div>
      </section>

      <!-- Leave Pipeline -->
      <section class="section">
        <h3 class="section-title">{{ isHr ? '待審請假' : '我的請假' }}</h3>
        <div v-if="leaveLoading" class="loading-row">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <div v-else class="leave-row">
          <!-- Status donut -->
          <div class="leave-donut-wrap">
            <p class="donut-title">狀態分布</p>
            <div class="donut-wrap">
              <div class="donut" :style="leaveDonutStyle"></div>
              <span class="donut-pct">{{ leaveRequests.length }}</span>
            </div>
            <div class="donut-legend vertical">
              <div class="legend-item">
                <span class="legend-dot" style="background:#f59e0b"></span>
                <span>待審 {{ leaveStatusCounts.pending }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:#059669"></span>
                <span>核准 {{ leaveStatusCounts.approved }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:#ef4444"></span>
                <span>拒絕 {{ leaveStatusCounts.rejected }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:#9ca3af"></span>
                <span>取消 {{ leaveStatusCounts.cancelled }}</span>
              </div>
            </div>
          </div>

          <!-- Leave list -->
          <div class="leave-list">
            <div v-if="leaveRequests.length === 0" class="empty-list">
              <i class="pi pi-check-circle"></i>
              <span>{{ isHr ? '目前無待審請假' : '本月無請假記錄' }}</span>
            </div>
            <div v-for="req in leaveRequests.slice(0, 6)" :key="req.id" class="leave-item">
              <Tag
                :value="statusLabel(req.status)"
                :severity="statusSeverity(req.status)"
                class="leave-status-tag"
              />
              <div class="leave-info">
                <p class="leave-who">{{ req.employee?.name ?? `員工 #${req.employeeId}` }}</p>
                <p class="leave-dates">{{ req.startDate }} ~ {{ req.endDate }}</p>
              </div>
              <p class="leave-type">{{ req.leaveType?.name ?? '–' }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Payroll Status (HR only) -->
      <section v-if="isHr" class="section">
        <h3 class="section-title">本月薪資狀態</h3>
        <div v-if="payrollLoading" class="loading-row">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <div v-else>
          <div class="payroll-summary">
            <div class="payroll-stat">
              <p class="payroll-num">{{ payrollCounts.confirmed }}</p>
              <p class="payroll-label">已確認</p>
            </div>
            <div class="payroll-stat">
              <p class="payroll-num draft">{{ payrollCounts.draft }}</p>
              <p class="payroll-label">草稿</p>
            </div>
            <div class="payroll-stat">
              <p class="payroll-num total-pay">{{ formatCurrency(totalPayout) }}</p>
              <p class="payroll-label">已確認總額</p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="payroll-progress-wrap">
            <div class="payroll-progress-bar">
              <div
                class="payroll-progress-fill"
                :style="{ width: payrollConfirmRate + '%' }"
              ></div>
            </div>
            <span class="payroll-pct">{{ payrollConfirmRate }}% 已確認</span>
          </div>

          <!-- Mini list -->
          <div class="payroll-list">
            <div v-for="p in payrolls.slice(0, 5)" :key="p.id" class="payroll-row">
              <span class="payroll-emp">員工 #{{ p.employeeId }}</span>
              <span class="payroll-amount">{{ formatCurrency(p.totalSalary) }}</span>
              <Tag
                :value="p.status === 'confirmed' ? '已確認' : '草稿'"
                :severity="p.status === 'confirmed' ? 'success' : 'secondary'"
                class="payroll-tag"
              />
            </div>
            <p v-if="payrolls.length > 5" class="payroll-more">
              還有 {{ payrolls.length - 5 }} 筆...
            </p>
          </div>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { attendanceApi } from '@/api/attendance'
import { leaveApi } from '@/api/leave'
import { payrollApi } from '@/api/payroll'
import type { WorkHoursSummary, LeaveRequest, Payroll, LeaveStatus } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const isHr = computed(() => authStore.hasRole('hr') || authStore.hasRole('admin'))

const now = new Date()
const reportDate = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
const todayStr = now.toISOString().slice(0, 10)

// ─── Today attendance ───────────────────────────────────────────────────────
const todayLoading = ref(false)
const today = ref({ total: 0, present: 0, late: 0, absent: 0 })

async function loadToday(): Promise<void> {
  todayLoading.value = true
  try {
    const s = await attendanceApi.getDepartmentSummary(todayStr)
    today.value = { total: s.total, present: s.present, late: s.late, absent: s.absent }
  } catch {
    // endpoint may return 404 outside work hours; keep zeros
  } finally {
    todayLoading.value = false
  }
}

function barStyle(val: number, total: number, color: string): Record<string, string> {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0
  return { width: pct + '%', background: color }
}

const attendanceRate = computed(() => {
  const { total, present, late } = today.value
  if (total === 0) return 0
  return Math.round(((present + late) / total) * 100)
})

const donutStyle = computed(() => {
  const { total, present, late, absent } = today.value
  if (total === 0) return { background: '#e5e7eb' }
  const p = present / total, l = late / total
  const presentDeg = Math.round(p * 360)
  const lateDeg = Math.round(l * 360)
  return {
    background: `conic-gradient(
      #059669 0deg ${presentDeg}deg,
      #f59e0b ${presentDeg}deg ${presentDeg + lateDeg}deg,
      #ef4444 ${presentDeg + lateDeg}deg 360deg
    )`,
  }
})

// ─── Month summary ───────────────────────────────────────────────────────────
const monthLoading = ref(false)
const monthSummary = ref<WorkHoursSummary>({
  totalHours: 0, overtimeHours: 0, lateCount: 0, absentCount: 0, earlyLeaveCount: 0, workDays: 0,
})

async function loadMonthSummary(): Promise<void> {
  monthLoading.value = true
  try {
    monthSummary.value = await attendanceApi.getWorkHoursSummary('month')
  } catch {
    // keep zeros
  } finally {
    monthLoading.value = false
  }
}

// ─── Leave requests ─────────────────────────────────────────────────────────
const leaveLoading = ref(false)
const leaveRequests = ref<LeaveRequest[]>([])

async function loadLeave(): Promise<void> {
  leaveLoading.value = true
  try {
    leaveRequests.value = isHr.value
      ? await leaveApi.getPendingApprovals()
      : await leaveApi.getMyRequests()
  } catch {
    leaveRequests.value = []
  } finally {
    leaveLoading.value = false
  }
}

const leaveStatusCounts = computed(() => {
  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  for (const r of leaveRequests.value) {
    counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1
  }
  return counts
})

const leaveDonutStyle = computed(() => {
  const total = leaveRequests.value.length
  if (total === 0) return { background: '#e5e7eb' }
  const c = leaveStatusCounts.value
  const pendingDeg = Math.round((c.pending / total) * 360)
  const approvedDeg = Math.round((c.approved / total) * 360)
  const rejectedDeg = Math.round((c.rejected / total) * 360)
  return {
    background: `conic-gradient(
      #f59e0b 0deg ${pendingDeg}deg,
      #059669 ${pendingDeg}deg ${pendingDeg + approvedDeg}deg,
      #ef4444 ${pendingDeg + approvedDeg}deg ${pendingDeg + approvedDeg + rejectedDeg}deg,
      #9ca3af ${pendingDeg + approvedDeg + rejectedDeg}deg 360deg
    )`,
  }
})

function statusLabel(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: '待審', approved: '核准', rejected: '拒絕', cancelled: '取消',
  }
  return map[status] ?? status
}

function statusSeverity(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'secondary',
  }
  return map[status] ?? 'secondary'
}

// ─── Payroll ─────────────────────────────────────────────────────────────────
const payrollLoading = ref(false)
const payrolls = ref<Payroll[]>([])

async function loadPayroll(): Promise<void> {
  if (!isHr.value) return
  payrollLoading.value = true
  try {
    payrolls.value = await payrollApi.listPayrolls(now.getFullYear(), now.getMonth() + 1)
  } catch {
    payrolls.value = []
  } finally {
    payrollLoading.value = false
  }
}

const payrollCounts = computed(() => ({
  confirmed: payrolls.value.filter((p) => p.status === 'confirmed').length,
  draft: payrolls.value.filter((p) => p.status === 'draft').length,
}))

const totalPayout = computed(() =>
  payrolls.value
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + Number(p.totalSalary), 0)
)

const payrollConfirmRate = computed(() => {
  const total = payrolls.value.length
  return total === 0 ? 0 : Math.round((payrollCounts.value.confirmed / total) * 100)
})

function formatCurrency(amount: number): string {
  return `NT$ ${Number(amount).toLocaleString('zh-TW')}`
}

// ─── Loading ─────────────────────────────────────────────────────────────────
const loading = computed(
  () => todayLoading.value || monthLoading.value || leaveLoading.value || payrollLoading.value
)

function loadAll(): void {
  loadToday()
  loadMonthSummary()
  loadLeave()
  loadPayroll()
}

onMounted(loadAll)
</script>

<style scoped>
.bi-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.page-sub {
  font-size: 0.82rem;
  color: #9ca3af;
  margin-top: 2px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 1rem;
}

/* ─── Today grid ─────────────────────────────────────────────────────────── */

.today-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.stat-total .stat-icon { background: #eff6ff; color: #3b82f6; }
.stat-present .stat-icon { background: #f0fdf4; color: #059669; }
.stat-late .stat-icon { background: #fffbeb; color: #f59e0b; }
.stat-absent .stat-icon { background: #fef2f2; color: #ef4444; }

.stat-num {
  font-size: 2rem;
  font-weight: 800;
  color: #111827;
  line-height: 1;
}

.stat-label {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 4px;
}

.stat-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 0 0 0 14px;
  transition: width 0.6s ease;
}

/* ─── Donut ───────────────────────────────────────────────────────────────── */

.donut-card {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  min-width: 160px;
}

.donut-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
}

.donut-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
}

.donut {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #e5e7eb;
  -webkit-mask: radial-gradient(farthest-side, transparent 60%, black 60%);
  mask: radial-gradient(farthest-side, transparent 60%, black 60%);
}

.donut-pct {
  position: absolute;
  font-size: 1.1rem;
  font-weight: 800;
  color: #111827;
}

.donut-legend {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #6b7280;
  align-items: center;
  flex-wrap: wrap;
}

.donut-legend.vertical {
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-start;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* ─── Month metrics ───────────────────────────────────────────────────────── */

.month-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: white;
  border-radius: 14px;
  padding: 1.25rem 1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}

.metric-icon {
  font-size: 1.4rem;
}
.metric-blue { color: #3b82f6; }
.metric-cyan { color: #06b6d4; }
.metric-orange { color: #f97316; }
.metric-yellow { color: #f59e0b; }
.metric-red { color: #ef4444; }
.metric-gray { color: #9ca3af; }

.metric-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: #111827;
  line-height: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: #6b7280;
}

/* ─── Leave ──────────────────────────────────────────────────────────────── */

.leave-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.leave-donut-wrap {
  background: white;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.leave-list {
  background: white;
  border-radius: 14px;
  padding: 0.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.leave-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.leave-item:last-child {
  border-bottom: none;
}

.leave-status-tag {
  flex-shrink: 0;
  font-size: 0.72rem;
}

.leave-info {
  flex: 1;
  min-width: 0;
}

.leave-who {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.leave-dates {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 2px;
}

.leave-type {
  font-size: 0.78rem;
  color: #6b7280;
  flex-shrink: 0;
}

.empty-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
  justify-content: center;
}

/* ─── Payroll ────────────────────────────────────────────────────────────── */

.payroll-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  background: white;
  border-radius: 14px;
  padding: 1.25rem 1.75rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.payroll-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.payroll-num {
  font-size: 2rem;
  font-weight: 800;
  color: #059669;
  line-height: 1;
}

.payroll-num.draft {
  color: #f59e0b;
}

.payroll-num.total-pay {
  font-size: 1.5rem;
  color: #0284c7;
}

.payroll-label {
  font-size: 0.78rem;
  color: #6b7280;
}

.payroll-progress-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.payroll-progress-bar {
  flex: 1;
  height: 10px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.payroll-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #059669, #34d399);
  border-radius: 999px;
  transition: width 0.6s ease;
}

.payroll-pct {
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
}

.payroll-list {
  background: white;
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.payroll-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.payroll-row:last-child {
  border-bottom: none;
}

.payroll-emp {
  font-size: 0.875rem;
  color: #374151;
  flex: 1;
}

.payroll-amount {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.payroll-tag {
  flex-shrink: 0;
  font-size: 0.72rem;
}

.payroll-more {
  padding: 0.6rem 1.25rem;
  font-size: 0.78rem;
  color: #9ca3af;
  text-align: center;
}

/* ─── Loading ─────────────────────────────────────────────────────────────── */

.loading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
  font-size: 1.5rem;
}

/* ─── Responsive ─────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .leave-row {
    grid-template-columns: 1fr;
  }

  .leave-donut-wrap {
    flex-direction: row;
    justify-content: space-around;
    flex-wrap: wrap;
  }
}
</style>
