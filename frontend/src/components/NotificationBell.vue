<template>
  <div class="notification-bell" ref="bellRef">
    <button class="bell-btn" @click="togglePanel" :title="'通知'">
      <i class="pi pi-bell bell-icon"></i>
      <span v-if="notificationStore.unreadCount > 0" class="bell-badge">
        {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
      </span>
    </button>

    <!-- Notification Panel -->
    <Transition name="panel">
      <div v-if="panelOpen" class="notification-panel">
        <div class="panel-header">
          <h4>通知</h4>
          <div class="panel-actions">
            <button
              v-if="notificationStore.unreadCount > 0"
              class="mark-all-btn"
              @click="notificationStore.markAllAsRead()"
            >
              全部已讀
            </button>
            <button class="close-btn" @click="panelOpen = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <div class="notification-list">
          <div v-if="notificationStore.notifications.length === 0" class="empty-notif">
            <i class="pi pi-inbox"></i>
            <p>目前沒有通知</p>
          </div>

          <div
            v-for="notif in notificationStore.notifications.slice(0, 20)"
            :key="notif.id"
            class="notif-item"
            :class="{ unread: !notif.isRead }"
            @click="handleNotifClick(notif)"
          >
            <div class="notif-icon" :class="notifIconClass(notif.type)">
              <i :class="notifIcon(notif.type)"></i>
            </div>
            <div class="notif-content">
              <p class="notif-title">{{ notif.title }}</p>
              <p class="notif-body">{{ notif.body }}</p>
              <p class="notif-time">{{ formatTime(notif.createdAt) }}</p>
            </div>
            <div v-if="!notif.isRead" class="unread-dot"></div>
          </div>
        </div>

        <div v-if="notificationStore.notifications.length > 20" class="panel-footer">
          <p>僅顯示最近 20 則通知</p>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div v-if="panelOpen" class="backdrop" @click="panelOpen = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import type { Notification, NotificationType } from '@/types'

const notificationStore = useNotificationStore()

const panelOpen = ref(false)
const bellRef = ref<HTMLElement | null>(null)

function togglePanel(): void {
  panelOpen.value = !panelOpen.value
}

function handleNotifClick(notif: Notification): void {
  notificationStore.markAsRead(notif.id)
}

function notifIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    leave_approval: 'pi pi-calendar-times',
    shift_published: 'pi pi-calendar',
    payroll_ready: 'pi pi-wallet',
    general: 'pi pi-info-circle'
  }
  return map[type] ?? 'pi pi-bell'
}

function notifIconClass(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    leave_approval: 'icon-orange',
    shift_published: 'icon-blue',
    payroll_ready: 'icon-green',
    general: 'icon-gray'
  }
  return map[type] ?? 'icon-gray'
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '剛才'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} 小時前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-TW')
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') panelOpen.value = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  notificationStore.connect()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #374151;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell-btn:hover {
  background: #f3f4f6;
}

.bell-icon {
  font-size: 1.25rem;
}

.bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
  border: 2px solid white;
}

.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.panel-header h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mark-all-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: #0284c7;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.mark-all-btn:hover {
  background: #e0f2fe;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.close-btn:hover {
  background: #f3f4f6;
}

.notification-list {
  overflow-y: auto;
  flex: 1;
}

.empty-notif {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem;
  color: #9ca3af;
}

.empty-notif i {
  font-size: 2rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #f9fafb;
  cursor: pointer;
  transition: background 0.1s;
  position: relative;
}

.notif-item:hover {
  background: #f9fafb;
}

.notif-item.unread {
  background: #f0f9ff;
}

.notif-item.unread:hover {
  background: #e0f2fe;
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.875rem;
}

.icon-orange { background: #fff7ed; color: #ea580c; }
.icon-blue { background: #eff6ff; color: #2563eb; }
.icon-green { background: #f0fdf4; color: #16a34a; }
.icon-gray { background: #f9fafb; color: #6b7280; }

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.2rem;
}

.notif-body {
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notif-time {
  font-size: 0.72rem;
  color: #9ca3af;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #06b6d4;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.panel-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #f3f4f6;
  text-align: center;
  font-size: 0.78rem;
  color: #9ca3af;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* Transition */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
