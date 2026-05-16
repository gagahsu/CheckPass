<template>
  <div class="liff-container">
    <Toast />

    <Card class="checkin-card">
      <template #header>
        <div class="checkin-header">
          <i class="pi pi-check-circle" style="font-size: 2rem;"></i>
          <h2>CheckPass 打卡通</h2>
        </div>
      </template>

      <template #content>
        <!-- Current Time -->
        <div class="time-display">
          <div class="current-time">{{ currentTime }}</div>
          <div class="current-date">{{ currentDate }}</div>
        </div>

        <!-- GPS Status -->
        <div class="gps-status" :class="gpsStatusClass">
          <i :class="gpsIcon"></i>
          <span>{{ gpsStatusText }}</span>
        </div>

        <div v-if="coords" class="coords-display">
          <span>{{ coords.latitude.toFixed(6) }}, {{ coords.longitude.toFixed(6) }}</span>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="success-message">
          <i class="pi pi-check-circle"></i>
          <span>{{ successMessage }}</span>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <Button
            :label="todayCheckedIn ? `已打卡 ${todayCheckInTime}` : '上班打卡'"
            icon="pi pi-sign-in"
            class="checkin-btn"
            :loading="checkingIn"
            :disabled="!coords || checkingIn || checkingOut || todayCheckedIn"
            @click="handleCheckIn"
          />
          <Button
            :label="todayCheckedOut ? '已下班打卡' : '下班打卡'"
            icon="pi pi-sign-out"
            class="checkout-btn"
            severity="secondary"
            :loading="checkingOut"
            :disabled="!coords || checkingIn || checkingOut || !todayCheckedIn || todayCheckedOut"
            @click="handleCheckOut"
          />
        </div>

        <p class="gps-hint">
          <i class="pi pi-info-circle"></i>
          請確保已開啟位置權限以完成打卡
        </p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import { attendanceApi } from '@/api/attendance'

const toast = useToast()

const currentTime = ref('')
const currentDate = ref('')
const coords = ref<GeolocationCoordinates | null>(null)
const gpsLoading = ref(true)
const gpsError = ref<string | null>(null)
const checkingIn = ref(false)
const checkingOut = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const todayCheckedIn = ref(false)
const todayCheckedOut = ref(false)
const todayCheckInTime = ref<string | null>(null)

let clockTimer: ReturnType<typeof setInterval> | null = null
let watchId: number | null = null

const gpsStatusClass = computed(() => {
  if (gpsLoading.value) return 'gps-loading'
  if (gpsError.value) return 'gps-error'
  return 'gps-ok'
})

const gpsIcon = computed(() => {
  if (gpsLoading.value) return 'pi pi-spin pi-spinner'
  if (gpsError.value) return 'pi pi-exclamation-triangle'
  return 'pi pi-map-marker'
})

const gpsStatusText = computed(() => {
  if (gpsLoading.value) return '正在取得位置...'
  if (gpsError.value) return `位置錯誤：${gpsError.value}`
  return 'GPS 已就緒'
})

function updateClock(): void {
  const now = new Date()
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  const dateOpts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  currentTime.value = now.toLocaleTimeString('zh-TW', timeOpts)
  currentDate.value = now.toLocaleDateString('zh-TW', dateOpts)
}

function startGps(): void {
  if (!navigator.geolocation) {
    gpsError.value = '瀏覽器不支援 GPS'
    gpsLoading.value = false
    return
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      coords.value = position.coords
      gpsLoading.value = false
      gpsError.value = null
    },
    (err) => {
      gpsLoading.value = false
      gpsError.value = err.message
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  )
}

async function loadTodayStatus(): Promise<void> {
  try {
    const record = await attendanceApi.getToday()
    if (record) {
      todayCheckedIn.value = true
      todayCheckInTime.value = new Date(record.checkInTime).toLocaleTimeString('zh-TW')
      todayCheckedOut.value = !!record.checkOutTime
    }
  } catch {
    // ignore — user may not be logged in via LIFF yet
  }
}

async function handleCheckIn(): Promise<void> {
  if (!coords.value) return
  checkingIn.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    const result = await attendanceApi.checkIn({
      type: 'GPS',
      latitude: coords.value.latitude,
      longitude: coords.value.longitude,
      device: navigator.userAgent,
    })
    todayCheckedIn.value = true
    todayCheckInTime.value = new Date(result.checkInTime).toLocaleTimeString('zh-TW')
    successMessage.value = `上班打卡成功！${todayCheckInTime.value}`
    toast.add({ severity: 'success', summary: '打卡成功', detail: successMessage.value, life: 4000 })
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '打卡失敗，請稍後再試'
    errorMessage.value = msg
    toast.add({ severity: 'error', summary: '打卡失敗', detail: msg, life: 4000 })
  } finally {
    checkingIn.value = false
  }
}

async function handleCheckOut(): Promise<void> {
  if (!coords.value) return
  checkingOut.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    const result = await attendanceApi.checkOut({
      latitude: coords.value.latitude,
      longitude: coords.value.longitude,
    })
    todayCheckedOut.value = true
    const timeStr = new Date(result.checkOutTime).toLocaleTimeString('zh-TW')
    const overtime = result.overtimeHours > 0 ? `，加班 ${result.overtimeHours}h` : ''
    successMessage.value = `下班打卡成功！${timeStr}${overtime}`
    toast.add({ severity: 'success', summary: '打卡成功', detail: successMessage.value, life: 4000 })
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '下班打卡失敗，請稍後再試'
    errorMessage.value = msg
    toast.add({ severity: 'error', summary: '打卡失敗', detail: msg, life: 4000 })
  } finally {
    checkingOut.value = false
  }
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  startGps()
  void loadTodayStatus()
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
})
</script>

<style scoped>
.liff-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
  padding: 1rem;
}

.checkin-card {
  width: 100%;
  max-width: 380px;
  border-radius: 16px;
  overflow: hidden;
}

.checkin-header {
  text-align: center;
  padding: 1.5rem 1.5rem 1rem;
  background: linear-gradient(135deg, #06b6d4, #0284c7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.checkin-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
}

.time-display {
  text-align: center;
  margin-bottom: 1.5rem;
}

.current-time {
  font-size: 3rem;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.current-date {
  color: #6b7280;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.gps-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.gps-loading {
  background: #f3f4f6;
  color: #6b7280;
}

.gps-error {
  background: #fee2e2;
  color: #dc2626;
}

.gps-ok {
  background: #d1fae5;
  color: #059669;
}

.coords-display {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 1rem;
  font-variant-numeric: tabular-nums;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #d1fae5;
  color: #059669;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.checkin-btn,
.checkout-btn {
  width: 100%;
  padding: 0.875rem !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
}

.gps-hint {
  text-align: center;
  font-size: 0.78rem;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
</style>
