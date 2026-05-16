<template>
  <Transition name="slide-up">
    <div v-if="showPrompt" class="install-prompt">
      <div class="install-content">
        <img src="/icons/icon-192.svg" alt="CheckPass" class="install-icon" />
        <div class="install-text">
          <p class="install-title">安裝 CheckPass</p>
          <p class="install-desc">加到主畫面，離線也能使用</p>
        </div>
      </div>
      <div class="install-actions">
        <button class="install-btn-dismiss" @click="dismiss">稍後</button>
        <button class="install-btn-install" @click="install">安裝</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const showPrompt = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    const dismissed = sessionStorage.getItem('pwa-install-dismissed')
    if (!dismissed) showPrompt.value = true
  })

  window.addEventListener('appinstalled', () => {
    showPrompt.value = false
    deferredPrompt = null
  })
})

async function install(): Promise<void> {
  if (!deferredPrompt) return
  showPrompt.value = false
  await deferredPrompt.prompt()
  deferredPrompt = null
}

function dismiss(): void {
  showPrompt.value = false
  sessionStorage.setItem('pwa-install-dismissed', '1')
}
</script>

<style scoped>
.install-prompt {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(calc(100vw - 2rem), 420px);
  background: white;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  border: 1px solid #e5e7eb;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 1000;
}

.install-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.install-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
}

.install-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #111827;
}

.install-desc {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 2px;
}

.install-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.install-btn-dismiss,
.install-btn-install {
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.install-btn-dismiss {
  background: #f3f4f6;
  color: #374151;
}

.install-btn-dismiss:hover {
  background: #e5e7eb;
}

.install-btn-install {
  background: linear-gradient(135deg, #06b6d4, #0284c7);
  color: white;
}

.install-btn-install:hover {
  opacity: 0.9;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
