<template>
  <AppLayout>
    <div class="bi-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title">數據分析</h2>
          <p class="page-sub">{{ reportDate }} · 即時報表</p>
        </div>
        <Button icon="pi pi-refresh" severity="secondary" text :loading="anyLoading" @click="loadAll" />
      </div>

      <!-- ── Section 1: Today Overview ── -->
      <section class="section">
        <h3 class="section-title">今日出勤概覽</h3>
        <div v-if="todayLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else class="today-grid">
          <div class="kpi-card kpi-blue">
            <span class="kpi-icon"><i class="pi pi-users"></i></span>
            <div>
              <p class="kpi-num">{{ today.total }}</p>
              <p class="kpi-label">總人數</p>
            </div>
          </div>
          <div class="kpi-card kpi-green">
            <span class="kpi-icon"><i class="pi pi-check-circle"></i></span>
            <div>
              <p class="kpi-num">{{ today.present }}</p>
              <p class="kpi-label">正常出勤</p>
            </div>
            <div class="kpi-bar" :style="{ width: pct(today.present, today.total) + '%', background: '#059669' }"></div>
          </div>
          <div class="kpi-card kpi-amber">
            <span class="kpi-icon"><i class="pi pi-clock"></i></span>
            <div>
              <p class="kpi-num">{{ today.late }}</p>
              <p class="kpi-label">遲到</p>
            </div>
            <div class="kpi-bar" :style="{ width: pct(today.late, today.total) + '%', background: '#f59e0b' }"></div>
          </div>
          <div class="kpi-card kpi-red">
            <span class="kpi-icon"><i class="pi pi-times-circle"></i></span>
            <div>
              <p class="kpi-num">{{ today.absent }}</p>
              <p class="kpi-label">缺勤</p>
            </div>
            <div class="kpi-bar" :style="{ width: pct(today.absent, today.total) + '%', background: '#ef4444' }"></div>
          </div>

          <!-- Donut -->
          <div class="donut-card">
            <p class="donut-title">出勤率</p>
            <div class="donut-wrap">
              <div class="donut" :style="attendanceDonutStyle"></div>
              <span class="donut-label">{{ attendanceRate }}%</span>
            </div>
            <div class="legend-row">
              <span class="dot" style="background:#059669"></span><span>正常</span>
              <span class="dot" style="background:#f59e0b"></span><span>遲到</span>
              <span class="dot" style="background:#ef4444"></span><span>缺勤</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Section 2: 30-day Attendance Trend ── -->
      <section v-if="canSeeOrgData" class="section">
        <div class="section-header">
          <h3 class="section-title">出勤趨勢（近 {{ trendDays }} 天）</h3>
          <div class="trend-tabs">
            <button
              v-for="d in [7, 14, 30]" :key="d"
              class="trend-tab" :class="{ active: trendDays === d }"
              @click="trendDays = d; loadTrend()"
            >{{ d }}天</button>
          </div>
        </div>
        <div v-if="trendLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else class="chart-card">
          <div class="chart-legend">
            <span class="dot" style="background:#059669"></span><span>正常</span>
            <span class="dot" style="background:#f59e0b"></span><span>遲到</span>
            <span class="dot" style="background:#ef4444"></span><span>缺勤</span>
          </div>
          <div class="chart-scroll">
            <svg
              :viewBox="`0 0 ${trendSvgW} 200`"
              :width="trendSvgW"
              height="200"
              class="trend-svg"
            >
              <!-- Grid lines -->
              <line v-for="g in 4" :key="g"
                x1="0" :y1="(g - 1) * 40"
                :x2="trendSvgW" :y2="(g - 1) * 40"
                stroke="#f3f4f6" stroke-width="1"
              />
              <!-- Stacked bars -->
              <g v-for="(item, i) in attendanceTrend" :key="item.date">
                <!-- absent (bottom) -->
                <rect
                  :x="barX(i)" :y="barY(item.absent + item.late + item.present, item)"
                  :width="barW" :height="barH(item.absent, item)"
                  fill="#fca5a5" rx="1"
                />
                <!-- late -->
                <rect
                  :x="barX(i)" :y="barY(item.late + item.present, item)"
                  :width="barW" :height="barH(item.late, item)"
                  fill="#fcd34d" rx="1"
                />
                <!-- present (top) -->
                <rect
                  :x="barX(i)" :y="barY(item.present, item)"
                  :width="barW" :height="barH(item.present, item)"
                  fill="#6ee7b7" rx="1"
                />
                <!-- Date label every N bars -->
                <text
                  v-if="i % labelStep === 0"
                  :x="barX(i) + barW / 2"
                  y="196"
                  text-anchor="middle"
                  font-size="9"
                  fill="#9ca3af"
                >{{ shortDate(item.date) }}</text>
              </g>
            </svg>
          </div>
          <!-- Summary row -->
          <div class="trend-summary">
            <div class="ts-item">
              <span class="ts-label">平均出勤率</span>
              <span class="ts-val green">{{ avgAttendanceRate }}%</span>
            </div>
            <div class="ts-item">
              <span class="ts-label">最高遲到日</span>
              <span class="ts-val amber">{{ maxLateDay }}</span>
            </div>
            <div class="ts-item">
              <span class="ts-label">最高缺勤日</span>
              <span class="ts-val red">{{ maxAbsentDay }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Section 3: Personal Month Summary ── -->
      <section class="section">
        <h3 class="section-title">本月個人統計</h3>
        <div v-if="monthLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else class="month-grid">
          <div class="metric-card">
            <i class="pi pi-calendar-check metric-icon" style="color:#3b82f6"></i>
            <p class="metric-val">{{ monthSummary.workDays }}</p>
            <p class="metric-label">出勤天數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-hourglass metric-icon" style="color:#06b6d4"></i>
            <p class="metric-val">{{ monthSummary.totalHours.toFixed(1) }}h</p>
            <p class="metric-label">總工時</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-bolt metric-icon" style="color:#f97316"></i>
            <p class="metric-val">{{ monthSummary.overtimeHours.toFixed(1) }}h</p>
            <p class="metric-label">加班時數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-exclamation-triangle metric-icon" style="color:#f59e0b"></i>
            <p class="metric-val">{{ monthSummary.lateCount }}</p>
            <p class="metric-label">遲到次數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-ban metric-icon" style="color:#ef4444"></i>
            <p class="metric-val">{{ monthSummary.absentCount }}</p>
            <p class="metric-label">缺勤次數</p>
          </div>
          <div class="metric-card">
            <i class="pi pi-sign-out metric-icon" style="color:#9ca3af"></i>
            <p class="metric-val">{{ monthSummary.earlyLeaveCount }}</p>
            <p class="metric-label">早退次數</p>
          </div>
        </div>
      </section>

      <!-- ── Section 4: Leave Analysis ── -->
      <section class="section">
        <h3 class="section-title">{{ canSeeOrgData ? '待審請假分析' : '我的請假紀錄' }}</h3>
        <div v-if="leaveLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else class="leave-layout">
          <!-- Donut -->
          <div class="leave-donut-card">
            <p class="donut-title">狀態分布</p>
            <div class="donut-wrap">
              <div class="donut" :style="leaveDonutStyle"></div>
              <span class="donut-label">{{ leaveRequests.length }}</span>
            </div>
            <div class="legend-col">
              <div class="legend-item"><span class="dot" style="background:#f59e0b"></span>待審 {{ leaveCounts.pending }}</div>
              <div class="legend-item"><span class="dot" style="background:#0ea5e9"></span>主管審核 {{ leaveCounts.manager_approved }}</div>
              <div class="legend-item"><span class="dot" style="background:#059669"></span>核准 {{ leaveCounts.approved }}</div>
              <div class="legend-item"><span class="dot" style="background:#ef4444"></span>拒絕 {{ leaveCounts.rejected }}</div>
              <div class="legend-item"><span class="dot" style="background:#9ca3af"></span>取消 {{ leaveCounts.cancelled }}</div>
            </div>
          </div>

          <!-- Leave type breakdown bar chart -->
          <div class="chart-card flex-1">
            <p class="chart-sub-title">假別分布</p>
            <div class="leave-type-bars">
              <div
                v-for="lt in leaveTypeBreakdown" :key="lt.name"
                class="lt-row"
              >
                <span class="lt-name">{{ lt.name }}</span>
                <div class="lt-bar-wrap">
                  <div
                    class="lt-bar-fill"
                    :style="{ width: leaveTypeBreakdown[0].count > 0 ? (lt.count / leaveTypeBreakdown[0].count * 100) + '%' : '0%' }"
                  ></div>
                </div>
                <span class="lt-count">{{ lt.count }}</span>
              </div>
              <div v-if="leaveTypeBreakdown.length === 0" class="empty-msg">
                <i class="pi pi-check-circle"></i> 無請假紀錄
              </div>
            </div>

            <!-- Recent items -->
            <p class="chart-sub-title" style="margin-top:1rem">最近紀錄</p>
            <div class="leave-recent">
              <div v-if="leaveRequests.length === 0" class="empty-msg">
                <i class="pi pi-inbox"></i> 目前無資料
              </div>
              <div v-for="req in leaveRequests.slice(0, 5)" :key="req.id" class="leave-row">
                <Tag :value="statusLabel(req.status)" :severity="statusSeverity(req.status)" class="leave-tag" />
                <div class="leave-info">
                  <p class="leave-who">{{ req.employee?.name ?? `員工 #${req.employeeId}` }}</p>
                  <p class="leave-dates">{{ req.startDate }} ~ {{ req.endDate }} · {{ req.leaveType?.name ?? '–' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Section 5: Payroll Trend (HR only) ── -->
      <section v-if="isHr" class="section">
        <h3 class="section-title">薪資月走勢（近 {{ payrollTrendMonths }} 個月）</h3>
        <div v-if="payrollTrendLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else class="chart-card">
          <div class="payroll-trend-summary">
            <div class="pts-item">
              <span class="pts-label">最近確認月薪總額</span>
              <span class="pts-val">{{ formatCurrency(latestPayout) }}</span>
            </div>
            <div class="pts-item">
              <span class="pts-label">平均人均薪資</span>
              <span class="pts-val">{{ formatCurrency(avgSalary) }}</span>
            </div>
          </div>
          <div class="chart-scroll">
            <svg
              :viewBox="`0 0 ${payrollSvgW} 180`"
              :width="payrollSvgW"
              height="180"
              class="trend-svg"
            >
              <!-- Grid -->
              <line v-for="g in 4" :key="g"
                x1="0" :y1="(g - 1) * 40"
                :x2="payrollSvgW" :y2="(g - 1) * 40"
                stroke="#f3f4f6" stroke-width="1"
              />
              <!-- Bars -->
              <g v-for="(item, i) in payrollTrend" :key="`${item.year}-${item.month}`">
                <rect
                  :x="payrollBarX(i)" :y="payrollBarY(item)"
                  :width="payrollBarW" :height="payrollBarH(item)"
                  :fill="item.confirmedCount > 0 ? '#6ee7b7' : '#e5e7eb'" rx="2"
                />
                <text
                  :x="payrollBarX(i) + payrollBarW / 2"
                  y="176"
                  text-anchor="middle"
                  font-size="9"
                  fill="#9ca3af"
                >{{ item.month }}月</text>
                <!-- Value label on top -->
                <text
                  v-if="item.totalPayout > 0"
                  :x="payrollBarX(i) + payrollBarW / 2"
                  :y="payrollBarY(item) - 4"
                  text-anchor="middle"
                  font-size="8"
                  fill="#059669"
                >{{ shortCurrency(item.totalPayout) }}</text>
              </g>
              <!-- Line connecting tops -->
              <polyline
                v-if="payrollTrend.some(p => p.totalPayout > 0)"
                :points="payrollLinePoints"
                fill="none"
                stroke="#059669"
                stroke-width="1.5"
                stroke-dasharray="3,2"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>
      </section>

      <!-- ── Section 6: Payroll Status This Month (HR only) ── -->
      <section v-if="isHr" class="section">
        <h3 class="section-title">本月薪資狀態</h3>
        <div v-if="payrollLoading" class="loading-row"><i class="pi pi-spin pi-spinner"></i></div>
        <div v-else>
          <div class="payroll-kpi-row">
            <div class="payroll-kpi green">
              <p class="payroll-kpi-num">{{ payrollCounts.confirmed }}</p>
              <p class="payroll-kpi-label">已確認</p>
            </div>
            <div class="payroll-kpi amber">
              <p class="payroll-kpi-num">{{ payrollCounts.draft }}</p>
              <p class="payroll-kpi-label">草稿</p>
            </div>
            <div class="payroll-kpi blue">
              <p class="payroll-kpi-num">{{ formatCurrency(totalPayout) }}</p>
              <p class="payroll-kpi-label">已確認總額</p>
            </div>
          </div>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: payrollConfirmRate + '%' }"></div>
            </div>
            <span class="progress-pct">{{ payrollConfirmRate }}% 已確認</span>
          </div>
          <div class="payroll-list">
            <div v-for="p in payrolls.slice(0, 5)" :key="p.id" class="payroll-row">
              <span class="payroll-emp">員工 #{{ p.employeeId }}</span>
              <span class="payroll-amount">{{ formatCurrency(p.totalSalary) }}</span>
              <Tag
                :value="p.status === 'confirmed' ? '已確認' : '草稿'"
                :severity="p.status === 'confirmed' ? 'success' : 'secondary'"
              />
            </div>
            <p v-if="payrolls.length > 5" class="payroll-more">還有 {{ payrolls.length - 5 }} 筆...</p>
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
import type {
  WorkHoursSummary, LeaveRequest, Payroll, LeaveStatus,
  AttendanceTrendItem, PayrollTrendItem,
} from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()
const isHr = computed(() => authStore.hasRole('hr') || authStore.hasRole('admin'))
const canSeeOrgData = computed(() =>
  authStore.hasRole('manager') || authStore.hasRole('hr') || authStore.hasRole('admin')
)

const now = new Date()
const reportDate = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
const todayStr = now.toISOString().slice(0, 10)

// ── Today ────────────────────────────────────────────────────────────────────
const todayLoading = ref(false)
const today = ref({ total: 0, present: 0, late: 0, absent: 0 })

async function loadToday(): Promise<void> {
  todayLoading.value = true
  try {
    const s = await attendanceApi.getDepartmentSummary(todayStr)
    today.value = {
      total: s.totalEmployees ?? s.total ?? 0,
      present: (s.presentCount ?? s.present ?? 0) - (s.lateCount ?? s.late ?? 0),
      late: s.lateCount ?? s.late ?? 0,
      absent: s.absentCount ?? s.absent ?? 0,
    }
  } catch { /* keep zeros */ } finally { todayLoading.value = false }
}

function pct(val: number, total: number): number {
  return total > 0 ? Math.round((val / total) * 100) : 0
}

const attendanceRate = computed(() => {
  const { total, present, late } = today.value
  return total > 0 ? Math.round(((present + late) / total) * 100) : 0
})

const attendanceDonutStyle = computed(() => {
  const { total, present, late } = today.value
  if (total === 0) return { background: '#e5e7eb' }
  const pDeg = Math.round((present / total) * 360)
  const lDeg = Math.round((late / total) * 360)
  return {
    background: `conic-gradient(#059669 0deg ${pDeg}deg, #f59e0b ${pDeg}deg ${pDeg + lDeg}deg, #ef4444 ${pDeg + lDeg}deg 360deg)`,
  }
})

// ── 30-day Trend ─────────────────────────────────────────────────────────────
const trendLoading = ref(false)
const trendDays = ref(30)
const attendanceTrend = ref<AttendanceTrendItem[]>([])

// SVG bar chart params
const BAR_GAP = 2
const CHART_H = 160
const trendSvgW = computed(() => attendanceTrend.value.length * (barW + BAR_GAP) + 10)
const barW = computed(() => {
  const n = attendanceTrend.value.length || 30
  return Math.max(8, Math.floor(560 / n) - BAR_GAP)
})
const labelStep = computed(() => Math.ceil(trendDays.value / 8))
const trendMax = computed(() =>
  Math.max(1, ...attendanceTrend.value.map((d) => d.total))
)

function barX(i: number): number { return i * (barW.value + BAR_GAP) + 5 }
function barY(cumulative: number, item: AttendanceTrendItem): number {
  return CHART_H - Math.round((cumulative / trendMax.value) * CHART_H)
}
function barH(val: number, item: AttendanceTrendItem): number {
  return Math.round((val / trendMax.value) * CHART_H)
}
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

const avgAttendanceRate = computed(() => {
  const days = attendanceTrend.value.filter((d) => d.total > 0)
  if (!days.length) return 0
  const avg = days.reduce((s, d) => s + ((d.present + d.late) / d.total) * 100, 0) / days.length
  return Math.round(avg)
})
const maxLateDay = computed(() => {
  if (!attendanceTrend.value.length) return '–'
  const m = attendanceTrend.value.reduce((a, b) => (a.late > b.late ? a : b))
  return m.late > 0 ? shortDate(m.date) : '–'
})
const maxAbsentDay = computed(() => {
  if (!attendanceTrend.value.length) return '–'
  const m = attendanceTrend.value.reduce((a, b) => (a.absent > b.absent ? a : b))
  return m.absent > 0 ? shortDate(m.date) : '–'
})

async function loadTrend(): Promise<void> {
  if (!canSeeOrgData.value) return
  trendLoading.value = true
  try {
    attendanceTrend.value = await attendanceApi.getAttendanceTrend(trendDays.value)
  } catch { attendanceTrend.value = [] } finally { trendLoading.value = false }
}

// ── Month Summary ─────────────────────────────────────────────────────────────
const monthLoading = ref(false)
const monthSummary = ref<WorkHoursSummary>({
  totalHours: 0, overtimeHours: 0, lateCount: 0, absentCount: 0, earlyLeaveCount: 0, workDays: 0,
})
async function loadMonthSummary(): Promise<void> {
  monthLoading.value = true
  try {
    monthSummary.value = await attendanceApi.getWorkHoursSummary('month')
  } catch { } finally { monthLoading.value = false }
}

// ── Leave ─────────────────────────────────────────────────────────────────────
const leaveLoading = ref(false)
const leaveRequests = ref<LeaveRequest[]>([])

async function loadLeave(): Promise<void> {
  leaveLoading.value = true
  try {
    leaveRequests.value = canSeeOrgData.value
      ? await leaveApi.getPendingApprovals()
      : await leaveApi.getMyRequests()
  } catch { leaveRequests.value = [] } finally { leaveLoading.value = false }
}

const leaveCounts = computed(() => {
  const c = { pending: 0, manager_approved: 0, approved: 0, rejected: 0, cancelled: 0 }
  for (const r of leaveRequests.value) {
    const k = r.status as keyof typeof c
    if (k in c) c[k]++
  }
  return c
})

const leaveDonutStyle = computed(() => {
  const total = leaveRequests.value.length
  if (total === 0) return { background: '#e5e7eb' }
  const c = leaveCounts.value
  const pd = Math.round((c.pending / total) * 360)
  const md = Math.round((c.manager_approved / total) * 360)
  const ad = Math.round((c.approved / total) * 360)
  const rd = Math.round((c.rejected / total) * 360)
  return {
    background: `conic-gradient(
      #f59e0b 0deg ${pd}deg,
      #0ea5e9 ${pd}deg ${pd + md}deg,
      #059669 ${pd + md}deg ${pd + md + ad}deg,
      #ef4444 ${pd + md + ad}deg ${pd + md + ad + rd}deg,
      #9ca3af ${pd + md + ad + rd}deg 360deg
    )`,
  }
})

const leaveTypeBreakdown = computed(() => {
  const map = new Map<string, number>()
  for (const r of leaveRequests.value) {
    const name = r.leaveType?.name ?? '其他'
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

function statusLabel(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: '待審', manager_approved: '主管審核', approved: '核准', rejected: '拒絕', cancelled: '取消',
  }
  return map[status] ?? status
}
function statusSeverity(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: 'warning', manager_approved: 'info', approved: 'success', rejected: 'danger', cancelled: 'secondary',
  }
  return map[status] ?? 'secondary'
}

// ── Payroll Trend (HR) ────────────────────────────────────────────────────────
const payrollTrendLoading = ref(false)
const payrollTrendMonths = ref(6)
const payrollTrend = ref<PayrollTrendItem[]>([])

const PAYROLL_BAR_GAP = 8
const PAYROLL_CHART_H = 140
const payrollBarW = computed(() => {
  const n = payrollTrend.value.length || 6
  return Math.max(30, Math.floor(480 / n) - PAYROLL_BAR_GAP)
})
const payrollSvgW = computed(() =>
  payrollTrend.value.length * (payrollBarW.value + PAYROLL_BAR_GAP) + 20
)
const payrollMax = computed(() =>
  Math.max(1, ...payrollTrend.value.map((p) => p.totalPayout))
)
function payrollBarX(i: number): number { return i * (payrollBarW.value + PAYROLL_BAR_GAP) + 10 }
function payrollBarH(item: PayrollTrendItem): number {
  return Math.round((item.totalPayout / payrollMax.value) * PAYROLL_CHART_H)
}
function payrollBarY(item: PayrollTrendItem): number {
  return PAYROLL_CHART_H - payrollBarH(item)
}

const payrollLinePoints = computed(() =>
  payrollTrend.value
    .map((item, i) => `${payrollBarX(i) + payrollBarW.value / 2},${payrollBarY(item)}`)
    .join(' ')
)

const latestPayout = computed(() => {
  const confirmed = payrollTrend.value.filter((p) => p.totalPayout > 0)
  return confirmed.length ? confirmed[confirmed.length - 1].totalPayout : 0
})
const avgSalary = computed(() => {
  const items = payrollTrend.value.filter((p) => p.avgSalary > 0)
  return items.length ? Math.round(items.reduce((s, p) => s + p.avgSalary, 0) / items.length) : 0
})

function shortCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}
function formatCurrency(n: number): string {
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`
}

async function loadPayrollTrend(): Promise<void> {
  if (!isHr.value) return
  payrollTrendLoading.value = true
  try {
    payrollTrend.value = await payrollApi.getPayrollTrend(payrollTrendMonths.value)
  } catch { payrollTrend.value = [] } finally { payrollTrendLoading.value = false }
}

// ── Payroll Status This Month ──────────────────────────────────────────────────
const payrollLoading = ref(false)
const payrolls = ref<Payroll[]>([])

async function loadPayroll(): Promise<void> {
  if (!isHr.value) return
  payrollLoading.value = true
  try {
    payrolls.value = await payrollApi.listPayrolls(now.getFullYear(), now.getMonth() + 1)
  } catch { payrolls.value = [] } finally { payrollLoading.value = false }
}

const payrollCounts = computed(() => ({
  confirmed: payrolls.value.filter((p) => p.status === 'confirmed').length,
  draft: payrolls.value.filter((p) => p.status === 'draft').length,
}))
const totalPayout = computed(() =>
  payrolls.value.filter((p) => p.status === 'confirmed').reduce((s, p) => s + Number(p.totalSalary), 0)
)
const payrollConfirmRate = computed(() => {
  const t = payrolls.value.length
  return t === 0 ? 0 : Math.round((payrollCounts.value.confirmed / t) * 100)
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const anyLoading = computed(() =>
  todayLoading.value || trendLoading.value || monthLoading.value ||
  leaveLoading.value || payrollTrendLoading.value || payrollLoading.value
)

function loadAll(): void {
  loadToday()
  loadTrend()
  loadMonthSummary()
  loadLeave()
  loadPayrollTrend()
  loadPayroll()
}

onMounted(loadAll)
</script>

<style scoped>
.bi-page { display: flex; flex-direction: column; gap: 2rem; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 1.5rem; font-weight: 700; color: #111827; }
.page-sub { font-size: 0.82rem; color: #9ca3af; margin-top: 2px; }

.section-title { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 1rem; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.section-header .section-title { margin-bottom: 0; }

/* ── KPI cards ── */
.today-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 14px; padding: 1.1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 0.75rem;
}
.kpi-icon {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0;
}
.kpi-blue .kpi-icon { background:#eff6ff; color:#3b82f6; }
.kpi-green .kpi-icon { background:#f0fdf4; color:#059669; }
.kpi-amber .kpi-icon { background:#fffbeb; color:#f59e0b; }
.kpi-red .kpi-icon { background:#fef2f2; color:#ef4444; }
.kpi-num { font-size: 2rem; font-weight: 800; color: #111827; line-height: 1; }
.kpi-label { font-size: 0.78rem; color: #6b7280; margin-top: 3px; }
.kpi-bar { position: absolute; bottom: 0; left: 0; height: 3px; border-radius: 0 0 0 14px; transition: width .6s; }

/* ── Donut ── */
.donut-card {
  background: white; border-radius: 14px; padding: 1.1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
}
.donut-title { font-size: 0.8rem; font-weight: 600; color: #6b7280; align-self: flex-start; }
.donut-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.donut {
  width: 96px; height: 96px; border-radius: 50%; background: #e5e7eb;
  -webkit-mask: radial-gradient(farthest-side, transparent 60%, black 60%);
  mask: radial-gradient(farthest-side, transparent 60%, black 60%);
}
.donut-label { position: absolute; font-size: 1rem; font-weight: 800; color: #111827; }
.legend-row { display: flex; gap: 0.4rem; font-size: 0.72rem; color: #6b7280; align-items: center; flex-wrap: wrap; }
.legend-col { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.75rem; color: #6b7280; align-self: flex-start; width: 100%; }
.legend-item { display: flex; align-items: center; gap: 0.35rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

/* ── Trend tabs ── */
.trend-tabs { display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.trend-tab { padding: 0.3rem 0.75rem; background: white; border: none; font-size: 0.8rem; font-weight: 500; color: #6b7280; cursor: pointer; transition: all .15s; }
.trend-tab.active { background: #06b6d4; color: white; }

/* ── Chart card ── */
.chart-card {
  background: white; border-radius: 14px; padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.chart-legend { display: flex; gap: 0.75rem; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.75rem; align-items: center; }
.chart-scroll { overflow-x: auto; }
.trend-svg { display: block; }

.trend-summary { display: flex; gap: 2rem; margin-top: 0.75rem; flex-wrap: wrap; }
.ts-item { display: flex; flex-direction: column; gap: 2px; }
.ts-label { font-size: 0.75rem; color: #9ca3af; }
.ts-val { font-size: 1rem; font-weight: 700; }
.ts-val.green { color: #059669; }
.ts-val.amber { color: #f59e0b; }
.ts-val.red { color: #ef4444; }

/* ── Month metrics ── */
.month-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem; }
.metric-card {
  background: white; border-radius: 14px; padding: 1.1rem 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem; text-align: center;
}
.metric-icon { font-size: 1.4rem; }
.metric-val { font-size: 1.5rem; font-weight: 800; color: #111827; line-height: 1; }
.metric-label { font-size: 0.75rem; color: #6b7280; }

/* ── Leave layout ── */
.leave-layout { display: grid; grid-template-columns: 200px 1fr; gap: 1.25rem; align-items: start; }
.leave-donut-card {
  background: white; border-radius: 14px; padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
}
.flex-1 { flex: 1; }
.chart-sub-title { font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem; }

.leave-type-bars { display: flex; flex-direction: column; gap: 0.5rem; }
.lt-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; }
.lt-name { width: 70px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.lt-bar-wrap { flex: 1; height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; }
.lt-bar-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #0ea5e9); border-radius: 5px; transition: width .5s; }
.lt-count { width: 24px; text-align: right; color: #6b7280; font-size: 0.8rem; }

.leave-recent { display: flex; flex-direction: column; }
.leave-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #f3f4f6; }
.leave-row:last-child { border-bottom: none; }
.leave-tag { flex-shrink: 0; font-size: 0.7rem; }
.leave-info { flex: 1; min-width: 0; }
.leave-who { font-size: 0.875rem; font-weight: 600; color: #111827; }
.leave-dates { font-size: 0.72rem; color: #9ca3af; margin-top: 1px; }
.empty-msg { display: flex; align-items: center; gap: 0.5rem; color: #9ca3af; font-size: 0.85rem; padding: 0.75rem 0; }

/* ── Payroll trend ── */
.payroll-trend-summary { display: flex; gap: 2rem; margin-bottom: 1rem; flex-wrap: wrap; }
.pts-item { display: flex; flex-direction: column; gap: 2px; }
.pts-label { font-size: 0.75rem; color: #9ca3af; }
.pts-val { font-size: 1.1rem; font-weight: 700; color: #059669; }

/* ── Payroll status ── */
.payroll-kpi-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.payroll-kpi {
  flex: 1; min-width: 120px; background: white; border-radius: 12px; padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.payroll-kpi.green .payroll-kpi-num { color: #059669; }
.payroll-kpi.amber .payroll-kpi-num { color: #f59e0b; }
.payroll-kpi.blue .payroll-kpi-num { color: #0284c7; font-size: 1.1rem; }
.payroll-kpi-num { font-size: 2rem; font-weight: 800; line-height: 1; }
.payroll-kpi-label { font-size: 0.78rem; color: #6b7280; margin-top: 3px; }

.progress-wrap { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.progress-bar { flex: 1; height: 10px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #059669, #34d399); border-radius: 999px; transition: width .6s; }
.progress-pct { font-size: 0.82rem; font-weight: 600; color: #6b7280; flex-shrink: 0; }

.payroll-list { background: white; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
.payroll-row { display: flex; align-items: center; gap: 1rem; padding: 0.7rem 1.25rem; border-bottom: 1px solid #f3f4f6; }
.payroll-row:last-child { border-bottom: none; }
.payroll-emp { font-size: 0.875rem; color: #374151; flex: 1; }
.payroll-amount { font-size: 0.875rem; font-weight: 600; color: #111827; }
.payroll-more { padding: 0.6rem 1.25rem; font-size: 0.78rem; color: #9ca3af; text-align: center; }

/* ── Loading ── */
.loading-row { display: flex; align-items: center; justify-content: center; padding: 3rem; color: #9ca3af; font-size: 1.4rem; }

@media (max-width: 768px) {
  .leave-layout { grid-template-columns: 1fr; }
  .leave-donut-card { flex-direction: row; flex-wrap: wrap; justify-content: center; }
}
</style>
