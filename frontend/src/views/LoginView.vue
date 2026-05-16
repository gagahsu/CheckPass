<template>
  <div class="login-container">
    <Card class="login-card">
      <template #header>
        <div class="login-logo">
          <div class="logo-icon">
            <i class="pi pi-check-circle" style="font-size: 3rem; color: #06b6d4;"></i>
          </div>
          <h1 class="logo-title">CheckPass</h1>
          <p class="logo-subtitle">打卡通</p>
        </div>
      </template>

      <template #content>
        <div class="login-content">
          <p class="login-description">
            簡單易用的打卡出勤管理系統<br />
            適合中小企業、連鎖門市與外勤團隊
          </p>

          <div v-if="error" class="error-message">
            <i class="pi pi-exclamation-triangle"></i>
            {{ error }}
          </div>

          <Button
            label="使用 LINE 登入"
            class="line-login-btn"
            :loading="loading"
            @click="handleLineLogin"
          >
            <template #icon>
              <span class="line-icon">LINE</span>
            </template>
          </Button>

          <p class="login-hint">
            使用您的 LINE 帳號安全登入，無需另外設定密碼
          </p>

          <div v-if="isDev" class="dev-login-section">
            <p class="dev-label">開發模式快速登入</p>
            <div class="dev-input-row">
              <InputText
                v-model="devEmployeeId"
                placeholder="Employee ID"
                type="number"
                class="dev-input"
              />
              <Button
                label="登入"
                :loading="devLoading"
                class="dev-btn"
                @click="handleDevLogin"
              />
            </div>
            <p v-if="devError" class="dev-error">{{ devError }}</p>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref<string | null>(null)

const isDev = import.meta.env.DEV
const devEmployeeId = ref('1')
const devLoading = ref(false)
const devError = ref<string | null>(null)

onMounted(() => {
  // Handle token from OAuth callback
  const token = route.query.token as string | undefined
  if (token) {
    handleTokenLogin(token)
  }
})

function handleTokenLogin(token: string): void {
  loading.value = true
  error.value = null
  try {
    authStore.login(token)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch {
    error.value = '登入失敗，Token 無效，請重新嘗試'
  } finally {
    loading.value = false
  }
}

async function handleDevLogin(): Promise<void> {
  devLoading.value = true
  devError.value = null
  try {
    const res = await fetch('http://localhost:3000/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: Number(devEmployeeId.value) })
    })
    if (!res.ok) throw new Error('dev-login failed')
    const data = await res.json() as { accessToken: string; employee: { id: number; name: string; empNo: string; roles: string[]; lineUserId: string | null } }
    authStore.login(data.accessToken)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch {
    devError.value = '登入失敗，請確認 Employee ID 是否存在'
  } finally {
    devLoading.value = false
  }
}

async function handleLineLogin(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const redirectPath = (route.query.redirect as string) || '/dashboard'
    const res = await fetch(`/api/auth/line/login-url?redirect=${encodeURIComponent(redirectPath)}`)
    if (!res.ok) throw new Error('Failed to get login URL')
    const { url } = await res.json() as { url: string }
    window.location.href = url
  } catch {
    error.value = 'LINE Login 暫時無法使用，請稍後再試'
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.login-logo {
  text-align: center;
  padding: 2.5rem 2rem 1rem;
  background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
  color: white;
}

.logo-icon {
  margin-bottom: 0.75rem;
}

.logo-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 0.25rem;
}

.logo-subtitle {
  font-size: 1.125rem;
  opacity: 0.85;
  font-weight: 500;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.login-description {
  text-align: center;
  color: #6b7280;
  line-height: 1.6;
  font-size: 0.95rem;
}

.error-message {
  width: 100%;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #dc2626;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.line-login-btn {
  width: 100%;
  background: #06c755 !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.875rem 1.5rem !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: white !important;
  gap: 0.5rem;
}

.line-login-btn:hover {
  background: #05b34b !important;
}

.line-icon {
  font-weight: 800;
  font-size: 0.875rem;
  background: white;
  color: #06c755;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.login-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 0.8rem;
  line-height: 1.5;
}

.dev-login-section {
  width: 100%;
  border-top: 1px dashed #e5e7eb;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dev-label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
}

.dev-input-row {
  display: flex;
  gap: 0.5rem;
}

.dev-input {
  flex: 1;
}

.dev-btn {
  white-space: nowrap;
}

.dev-error {
  font-size: 0.8rem;
  color: #dc2626;
  text-align: center;
}
</style>
