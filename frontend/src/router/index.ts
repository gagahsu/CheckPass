import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─── Public routes ──────────────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登入 - CheckPass 打卡通', requiresAuth: false }
    },
    {
      path: '/liff/checkin',
      name: 'liff-checkin',
      component: () => import('@/views/LiffCheckinView.vue'),
      meta: { title: '打卡 - CheckPass 打卡通', requiresAuth: false }
    },

    // ─── Protected routes ────────────────────────────────────────────────────────
    {
      path: '/',
      redirect: '/dashboard',
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: '儀表板 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: () => import('@/views/AttendanceView.vue'),
      meta: { title: '出勤記錄 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/shift',
      name: 'shift',
      component: () => import('@/views/ShiftView.vue'),
      meta: { title: '班表 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/leave',
      name: 'leave',
      component: () => import('@/views/LeaveView.vue'),
      meta: { title: '請假 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/leave/apply',
      name: 'leave-apply',
      component: () => import('@/views/LeaveApplyView.vue'),
      meta: { title: '申請假單 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/payroll',
      name: 'payroll',
      component: () => import('@/views/PayrollView.vue'),
      meta: { title: '薪資 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/bi-dashboard',
      name: 'bi-dashboard',
      component: () => import('@/views/BiDashboardView.vue'),
      meta: { title: '數據分析 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/hr/employees',
      name: 'employee-list',
      component: () => import('@/views/EmployeeListView.vue'),
      meta: { title: '員工管理 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/hr/employees/:id',
      name: 'employee-detail',
      component: () => import('@/views/EmployeeDetailView.vue'),
      meta: { title: '員工詳情 - CheckPass 打卡通', requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '系統設定 - CheckPass 打卡通', requiresAuth: true }
    }
  ]
})

// Navigation guard
router.beforeEach((to) => {
  // Update page title
  document.title = (to.meta.title as string) ?? 'CheckPass 打卡通'

  const authStore = useAuthStore()
  authStore.initFromStorage()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
