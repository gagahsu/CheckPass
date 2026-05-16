<template>
  <AppLayout>
    <div class="dashboard">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div>
          <h2 class="welcome-title">歡迎回來，{{ authStore.user?.name ?? '' }} 👋</h2>
          <p class="welcome-date">{{ todayString }}</p>
        </div>
        <Avatar
          :label="authStore.user?.name?.charAt(0) ?? '?'"
          size="large"
          shape="circle"
          class="user-avatar"
        />
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid">
        <Card
          v-for="stat in stats"
          :key="stat.label"
          class="stat-card"
          :class="stat.colorClass"
        >
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <p class="stat-label">{{ stat.label }}</p>
                <p class="stat-value">
                  <span v-if="statsLoading" class="skeleton-val">--</span>
                  <span v-else>{{ stat.value }}</span>
                </p>
              </div>
              <div class="stat-icon">
                <i :class="stat.icon"></i>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Recent Attendance -->
      <Card class="recent-card">
        <template #title>
          <div class="card-title-row">
            <span>最近出勤記錄</span>
            <RouterLink to="/attendance" class="view-all-link">查看全部</RouterLink>
          </div>
        </template>
        <template #content>
          <div v-if="recordsLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>載入中...</span>
          </div>
          <div v-else-if="recordsError" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ recordsError }}</span>
          </div>
          <DataTable
            v-else
            :value="recentRecords"
            :rows="5"
            responsive-layout="scroll"
            class="attendance-table"
          >
            <Column field="date" header="日期" />
            <Column field="checkInTime" header="上班時間">
              <template #body="{ data }">
                {{ data.checkInTime ? formatTime(data.checkInTime) : '--' }}
              </template>
            </Column>
            <Column field="checkOutTime" header="下班時間">
              <template #body="{ data }">
                {{ data.checkOutTime ? formatTime(data.checkOutTime) : '--' }}
              </template>
            </Column>
            <Column field="status" header="狀態">
              <template #body="{ data }">
                <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column field="overtimeHours" header="加班時數">
              <template #body="{ data }">
                {{ data.overtimeHours > 0 ? `${data.overtimeHours}h` : '--' }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import { useAuthStore } from '@/stores/auth'
import { attendanceApi } from '@/api/attendance'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const authStore = useAuthStore()

const statsLoading = ref(true)
const recordsLoading = ref(true)
const recordsError = ref<string | null>(null)
const recentRecords = ref<AttendanceRecord[]>([])

const todayAttendance = ref(0)
const pendingLeaves = ref(0)
const weeklyShifts = ref(0)
const monthlyHours = ref(0)

const todayString = computed(() => {
  return new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

const stats = computed(() => [
  {
    label: '今日出勤人數',
    value: todayAttendance.value,
    icon: 'pi pi-users',
    colorClass: 'stat-blue'
  },
  {
    label: '待處理假單',
    value: pendingLeaves.value,
    icon: 'pi pi-calendar-times',
    colorClass: 'stat-orange'
  },
  {
    label: '本週班表',
    value: weeklyShifts.value,
    icon: 'pi pi-calendar',
    colorClass: 'stat-green'
  },
  {
    label: '本月工時',
    value: `${monthlyHours.value}h`,
    icon: 'pi pi-clock',
    colorClass: 'stat-purple'
  }
])

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  })
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

async function loadStats(): Promise<void> {
  statsLoading.value = true
  try {
    const today = new Date().toISOString().split('T')[0]
    const summary = await attendanceApi.getDepartmentSummary(today)
    todayAttendance.value = summary.reduce((sum, d) => sum + d.present, 0)
  } catch {
    // silently ignore — stat cards show 0
  } finally {
    statsLoading.value = false
  }
}

async function loadRecentRecords(): Promise<void> {
  recordsLoading.value = true
  recordsError.value = null
  try {
    const result = await attendanceApi.getRecords({ page: 1, pageSize: 5 })
    recentRecords.value = result.data
  } catch {
    recordsError.value = '無法載入出勤記錄'
  } finally {
    recordsLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadRecentRecords()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  color: white;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.welcome-date {
  opacity: 0.85;
  font-size: 0.95rem;
}

.user-avatar {
  background: rgba(255, 255, 255, 0.25) !important;
  color: white !important;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  border-radius: 12px;
  border: none;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.35rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.skeleton-val {
  color: #d1d5db;
}

.stat-icon {
  font-size: 2rem;
  opacity: 0.2;
}

.stat-blue .stat-icon { color: #0284c7; }
.stat-orange .stat-icon { color: #ea580c; }
.stat-green .stat-icon { color: #16a34a; }
.stat-purple .stat-icon { color: #7c3aed; }

.recent-card {
  border-radius: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.view-all-link {
  font-size: 0.875rem;
  color: #0284c7;
  text-decoration: none;
  font-weight: 500;
}

.view-all-link:hover {
  text-decoration: underline;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
}

.error-state {
  color: #dc2626;
}

.attendance-table {
  font-size: 0.9rem;
}
</style>
