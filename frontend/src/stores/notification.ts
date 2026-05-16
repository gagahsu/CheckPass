import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification } from '@/types'

export const useNotificationStore = defineStore('notification', () => {
  const connected = ref(false)
  const notifications = ref<Notification[]>([])
  let eventSource: EventSource | null = null

  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)

  function connect(): void {
    if (eventSource) return

    const token = localStorage.getItem('checkpass_token')
    const url = `/api/sse/notifications${token ? `?token=${encodeURIComponent(token)}` : ''}`

    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      connected.value = true
    }

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data as string) as Notification
        notifications.value.unshift(notification)
      } catch {
        // ignore malformed events
      }
    }

    eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data as string) as Notification
        notifications.value.unshift(notification)
      } catch {
        // ignore malformed events
      }
    })

    eventSource.onerror = () => {
      connected.value = false
      // Auto-reconnect after 5 seconds
      eventSource?.close()
      eventSource = null
      setTimeout(() => connect(), 5000)
    }
  }

  function disconnect(): void {
    eventSource?.close()
    eventSource = null
    connected.value = false
  }

  function markAsRead(id: string): void {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.isRead = true
    }
  }

  function markAllAsRead(): void {
    notifications.value.forEach((n) => {
      n.isRead = true
    })
  }

  return {
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead
  }
})
