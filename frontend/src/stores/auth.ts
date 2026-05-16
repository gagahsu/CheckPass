import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoleName } from '@/types'

interface AuthUser {
  id: number
  name: string
  empNo: string
  roles: RoleName[]
  lineUserId: string | null
}

const TOKEN_KEY = 'checkpass_token'
const USER_KEY = 'checkpass_user'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1]
    const decoded = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function login(newToken: string): void {
    const payload = decodeJwtPayload(newToken)
    if (!payload) throw new Error('Invalid JWT token')

    token.value = newToken
    user.value = {
      id: payload.sub as number,
      name: payload.name as string,
      empNo: payload.empNo as string,
      roles: (payload.roles as RoleName[]) ?? [],
      lineUserId: (payload.lineUserId as string | null) ?? null
    }

    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  function logout(): void {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function initFromStorage(): void {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (!storedToken || !storedUser) return

    // Check token expiry
    const payload = decodeJwtPayload(storedToken)
    if (!payload) {
      logout()
      return
    }
    const exp = payload.exp as number | undefined
    if (exp && Date.now() / 1000 > exp) {
      logout()
      return
    }

    token.value = storedToken
    try {
      user.value = JSON.parse(storedUser) as AuthUser
    } catch {
      logout()
    }
  }

  function hasRole(role: RoleName): boolean {
    return user.value?.roles.includes(role) ?? false
  }

  return { user, token, isAuthenticated, login, logout, initFromStorage, hasRole }
})
