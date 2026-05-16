<template>
  <AppLayout>
    <div class="leave-page">
      <div class="page-header">
        <h2 class="page-title">請假管理</h2>
        <Button label="申請假單" icon="pi pi-plus" @click="router.push('/leave/apply')" />
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的假單
        </button>
        <button
          v-if="authStore.hasRole('manager') || authStore.hasRole('hr') || authStore.hasRole('admin')"
          class="tab-btn"
          :class="{ active: activeTab === 'pending' }"
          @click="switchToPending"
        >
          待簽核
          <span v-if="pendingRequests.length > 0" class="pending-badge">
            {{ pendingRequests.length }}
          </span>
        </button>
      </div>

      <!-- My Requests -->
      <Card v-if="activeTab === 'mine'" class="table-card">
        <template #content>
          <div v-if="myLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>載入中...</span>
          </div>
          <div v-else-if="myError" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ myError }}</span>
          </div>
          <DataTable v-else :value="myRequests" responsive-layout="scroll">
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-inbox"></i>
                <p>尚無假單記錄</p>
              </div>
            </template>
            <Column header="假別">
              <template #body="{ data }">{{ data.leaveType?.name ?? `假別 #${data.leaveTypeId}` }}</template>
            </Column>
            <Column field="startDate" header="開始日期" />
            <Column field="endDate" header="結束日期" />
            <Column header="天數">
              <template #body="{ data }">{{ calcDays(data.startDate, data.endDate) }} 天</template>
            </Column>
            <Column field="reason" header="原因" style="max-width: 200px;">
              <template #body="{ data }">
                <span class="truncate" :title="data.reason ?? ''">{{ data.reason ?? '--' }}</span>
              </template>
            </Column>
            <Column header="狀態">
              <template #body="{ data }">
                <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column header="操作" style="min-width: 100px;">
              <template #body="{ data }">
                <Button
                  v-if="data.status === 'pending'"
                  label="取消"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  :loading="cancellingId === data.id"
                  @click="handleCancel(data.id)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Pending Approvals -->
      <Card v-if="activeTab === 'pending'" class="table-card">
        <template #content>
          <div v-if="pendingLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>載入中...</span>
          </div>
          <div v-else-if="pendingError" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ pendingError }}</span>
          </div>
          <DataTable v-else :value="pendingRequests" responsive-layout="scroll">
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-check-circle"></i>
                <p>目前無待簽核假單</p>
              </div>
            </template>
            <Column header="員工">
              <template #body="{ data }">{{ data.employee?.name ?? `員工 #${data.employeeId}` }}</template>
            </Column>
            <Column header="假別">
              <template #body="{ data }">{{ data.leaveType?.name ?? `假別 #${data.leaveTypeId}` }}</template>
            </Column>
            <Column field="startDate" header="開始日期" />
            <Column field="endDate" header="結束日期" />
            <Column header="天數">
              <template #body="{ data }">{{ calcDays(data.startDate, data.endDate) }} 天</template>
            </Column>
            <Column field="reason" header="原因" style="max-width: 180px;" />
            <Column header="操作" style="min-width: 160px;">
              <template #body="{ data }">
                <div class="action-btns">
                  <Button
                    label="核准"
                    icon="pi pi-check"
                    size="small"
                    severity="success"
                    :loading="approvingId === data.id"
                    @click="handleApprove(data.id)"
                  />
                  <Button
                    label="拒絕"
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    @click="openRejectDialog(data.id)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Reject Dialog -->
      <Dialog
        v-model:visible="rejectDialogVisible"
        header="拒絕假單"
        modal
        :style="{ width: '380px' }"
      >
        <div class="reject-form">
          <label class="reject-label">拒絕原因 <span class="required">*</span></label>
          <textarea
            v-model="rejectReason"
            class="p-inputtext reject-textarea"
            rows="3"
            placeholder="請填寫拒絕原因..."
          ></textarea>
        </div>
        <template #footer>
          <Button label="取消" severity="secondary" @click="rejectDialogVisible = false" />
          <Button
            label="確認拒絕"
            severity="danger"
            :loading="rejectingId !== null"
            :disabled="!rejectReason.trim()"
            @click="confirmReject"
          />
        </template>
      </Dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { leaveApi } from '@/api/leave'
import type { LeaveRequest, LeaveStatus } from '@/types'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const activeTab = ref<'mine' | 'pending'>('mine')
const myRequests = ref<LeaveRequest[]>([])
const pendingRequests = ref<LeaveRequest[]>([])
const myLoading = ref(false)
const pendingLoading = ref(false)
const myError = ref<string | null>(null)
const pendingError = ref<string | null>(null)
const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)
const cancellingId = ref<number | null>(null)

const rejectDialogVisible = ref(false)
const rejectTargetId = ref<number | null>(null)
const rejectReason = ref('')

function statusLabel(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: '待審核',
    approved: '已核准',
    rejected: '已拒絕',
    cancelled: '已取消'
  }
  return map[status] ?? status
}

function statusSeverity(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    pending: 'warn',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function calcDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1)
}

async function loadMyRequests(): Promise<void> {
  myLoading.value = true
  myError.value = null
  try {
    myRequests.value = await leaveApi.getMyRequests()
  } catch {
    myError.value = '無法載入我的假單'
  } finally {
    myLoading.value = false
  }
}

async function loadPendingRequests(): Promise<void> {
  pendingLoading.value = true
  pendingError.value = null
  try {
    pendingRequests.value = await leaveApi.getPendingApprovals()
  } catch {
    pendingError.value = '無法載入待簽核假單'
  } finally {
    pendingLoading.value = false
  }
}

function switchToPending(): void {
  activeTab.value = 'pending'
  if (pendingRequests.value.length === 0) loadPendingRequests()
}

async function handleApprove(id: number): Promise<void> {
  approvingId.value = id
  try {
    await leaveApi.approve(id)
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== id)
    toast.add({ severity: 'success', summary: '已核准假單', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '核准失敗', life: 3000 })
  } finally {
    approvingId.value = null
  }
}

function openRejectDialog(id: number): void {
  rejectTargetId.value = id
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function confirmReject(): Promise<void> {
  if (!rejectTargetId.value || !rejectReason.value.trim()) return
  rejectingId.value = rejectTargetId.value
  try {
    await leaveApi.reject(rejectTargetId.value, rejectReason.value.trim())
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== rejectTargetId.value)
    rejectDialogVisible.value = false
    toast.add({ severity: 'success', summary: '已拒絕假單', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '拒絕失敗', life: 3000 })
  } finally {
    rejectingId.value = null
  }
}

async function handleCancel(id: number): Promise<void> {
  cancellingId.value = id
  try {
    await leaveApi.cancel(id)
    const req = myRequests.value.find((r) => r.id === id)
    if (req) req.status = 'cancelled'
    toast.add({ severity: 'success', summary: '已取消假單', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: '取消失敗', life: 3000 })
  } finally {
    cancellingId.value = null
  }
}

onMounted(() => {
  loadMyRequests()
})
</script>

<style scoped>
.leave-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tab-btn.active {
  color: #0284c7;
  border-bottom-color: #0284c7;
}

.pending-badge {
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}

.table-card {
  border-radius: 12px;
}

.action-btns {
  display: flex;
  gap: 0.5rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
}

.error-state { color: #dc2626; }

.empty-state {
  flex-direction: column;
}

.empty-state i {
  font-size: 2rem;
}

.truncate {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.reject-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 0 0.5rem;
}

.reject-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.reject-textarea {
  width: 100%;
  resize: vertical;
  font-family: inherit;
  font-size: 0.9rem;
}

.required { color: #ef4444; }
</style>
