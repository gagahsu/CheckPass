<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-mark">
          <i class="pi pi-check-circle"></i>
        </div>
        <span v-if="!sidebarCollapsed" class="logo-text">CheckPass</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :title="item.label"
          active-class="nav-item-active"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Collapse button -->
      <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
        <i :class="sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"></i>
      </button>
    </aside>

    <!-- Main area -->
    <div class="main-area">
      <!-- Top Header -->
      <header class="top-header">
        <!-- Mobile menu toggle -->
        <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
          <i class="pi pi-bars"></i>
        </button>

        <div class="header-right">
          <!-- Notification Bell -->
          <NotificationBell />

          <!-- User Menu -->
          <div class="user-menu" ref="userMenuRef">
            <button class="user-btn" @click="userMenuOpen = !userMenuOpen">
              <Avatar
                :label="authStore.user?.name?.charAt(0) ?? '?'"
                size="normal"
                shape="circle"
                class="user-avatar"
              />
              <span class="user-name">{{ authStore.user?.name }}</span>
              <i class="pi pi-chevron-down user-chevron"></i>
            </button>

            <Transition name="dropdown">
              <div v-if="userMenuOpen" class="user-dropdown">
                <div class="dropdown-user-info">
                  <p class="dropdown-name">{{ authStore.user?.name }}</p>
                  <p class="dropdown-emp-no">{{ authStore.user?.empNo }}</p>
                  <div class="dropdown-roles">
                    <span v-for="role in authStore.user?.roles" :key="role" class="role-chip">
                      {{ roleLabel(role) }}
                    </span>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout-item" @click="handleLogout">
                  <i class="pi pi-sign-out"></i>
                  登出
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Backdrop for user menu -->
        <div v-if="userMenuOpen" class="user-backdrop" @click="userMenuOpen = false"></div>
      </header>

      <!-- Page Content -->
      <main class="page-content">
        <slot />
      </main>
    </div>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="mobileMenuOpen"
      class="mobile-overlay"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Mobile Sidebar -->
    <Transition name="mobile-slide">
      <aside v-if="mobileMenuOpen" class="mobile-sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">
            <i class="pi pi-check-circle"></i>
          </div>
          <span class="logo-text">CheckPass</span>
        </div>
        <nav class="sidebar-nav">
          <RouterLink
            v-for="item in visibleNavItems"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            active-class="nav-item-active"
            @click="mobileMenuOpen = false"
          >
            <i :class="item.icon" class="nav-icon"></i>
            <span class="nav-label">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Avatar from 'primevue/avatar'
import { useAuthStore } from '@/stores/auth'
import NotificationBell from '@/components/NotificationBell.vue'
import type { RoleName } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: RoleName[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: '儀表板', icon: 'pi pi-home' },
  { to: '/attendance', label: '出勤記錄', icon: 'pi pi-clock' },
  { to: '/shift', label: '班表', icon: 'pi pi-calendar' },
  { to: '/leave', label: '請假', icon: 'pi pi-calendar-times' },
  { to: '/payroll', label: '薪資', icon: 'pi pi-wallet' },
  { to: '/hr/employees', label: '員工管理', icon: 'pi pi-users', roles: ['hr', 'admin'] },
  { to: '/settings', label: '系統設定', icon: 'pi pi-cog', roles: ['admin'] }
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.some((role) => authStore.hasRole(role))
  })
)

function roleLabel(role: RoleName): string {
  const map: Record<RoleName, string> = {
    employee: '員工',
    manager: '主管',
    hr: 'HR',
    admin: '管理員'
  }
  return map[role] ?? role
}

function handleLogout(): void {
  userMenuOpen.value = false
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

/* ─── Sidebar ────────────────────────────────────────────────── */

.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.25s ease;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 68px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-mark {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #06b6d4, #0284c7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 6px;
  margin: 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.nav-item-active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(2, 132, 199, 0.2)) !important;
  color: #06b6d4 !important;
}

.nav-icon {
  font-size: 1rem;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  transition: color 0.15s;
}

.collapse-btn:hover {
  color: #94a3b8;
}

/* ─── Main Area ───────────────────────────────────────────────── */

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ─── Header ──────────────────────────────────────────────────── */

.top-header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 1rem;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #374151;
  font-size: 1.2rem;
  padding: 6px;
  border-radius: 6px;
}

.mobile-menu-btn:hover {
  background: #f3f4f6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

/* ─── User Menu ───────────────────────────────────────────────── */

.user-menu {
  position: relative;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.35rem 0.75rem 0.35rem 0.35rem;
  cursor: pointer;
  transition: all 0.15s;
  color: #374151;
}

.user-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.user-avatar {
  background: linear-gradient(135deg, #06b6d4, #0284c7) !important;
  color: white !important;
  font-weight: 700;
  font-size: 0.875rem;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chevron {
  font-size: 0.7rem;
  color: #9ca3af;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  z-index: 200;
  overflow: hidden;
}

.dropdown-user-info {
  padding: 1rem;
}

.dropdown-name {
  font-weight: 700;
  color: #111827;
  font-size: 0.9rem;
}

.dropdown-emp-no {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 0.15rem;
}

.dropdown-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.role-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 999px;
}

.dropdown-divider {
  height: 1px;
  background: #f3f4f6;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: background 0.1s;
  text-align: left;
}

.dropdown-item:hover {
  background: #f9fafb;
}

.logout-item {
  color: #dc2626;
}

.logout-item:hover {
  background: #fff5f5;
}

.user-backdrop {
  position: fixed;
  inset: 0;
  z-index: 199;
}

/* ─── Page Content ────────────────────────────────────────────── */

.page-content {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

/* ─── Mobile ─────────────────────────────────────────────────── */

.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
}

.mobile-sidebar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 240px;
  background: #1e293b;
  z-index: 301;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Transitions ────────────────────────────────────────────── */

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.mobile-slide-enter-active,
.mobile-slide-leave-active {
  transition: transform 0.25s ease;
}

.mobile-slide-enter-from,
.mobile-slide-leave-to {
  transform: translateX(-100%);
}

/* ─── Responsive ─────────────────────────────────────────────── */

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-overlay {
    display: block;
  }

  .mobile-sidebar {
    display: flex;
  }

  .page-content {
    padding: 1rem;
  }

  .user-name {
    display: none;
  }
}
</style>
