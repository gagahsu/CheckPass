<template>
  <AppLayout>
    <div class="employee-list-page">
      <div class="page-header">
        <h2 class="page-title">員工管理</h2>
        <Button label="新增員工" icon="pi pi-plus" @click="showAddDialog = true" />
      </div>

      <!-- Search -->
      <Card class="search-card">
        <template #content>
          <div class="search-row">
            <span class="p-input-icon-left search-wrapper">
              <i class="pi pi-search search-icon"></i>
              <InputText
                v-model="searchQuery"
                placeholder="搜尋員工姓名、編號..."
                class="search-input"
                @input="onSearch"
              />
            </span>
            <select v-model="filterStatus" class="p-inputtext status-filter" @change="onSearch">
              <option value="">全部狀態</option>
              <option value="active">在職</option>
              <option value="inactive">停用</option>
              <option value="resigned">離職</option>
            </select>
          </div>
        </template>
      </Card>

      <!-- Employee Table -->
      <Card class="table-card">
        <template #content>
          <div v-if="loading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <span>載入中...</span>
          </div>
          <div v-else-if="error" class="error-state">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ error }}</span>
          </div>
          <DataTable
            v-else
            :value="filteredEmployees"
            responsive-layout="scroll"
            :paginator="true"
            :rows="15"
            class="employee-table"
          >
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-users"></i>
                <p>無員工資料</p>
              </div>
            </template>

            <Column field="empNo" header="員工編號" style="min-width: 100px;" />
            <Column header="姓名" style="min-width: 120px;">
              <template #body="{ data }">
                <div class="name-cell">
                  <Avatar :label="data.name.charAt(0)" size="small" shape="circle" />
                  <span>{{ data.name }}</span>
                </div>
              </template>
            </Column>
            <Column header="部門" style="min-width: 100px;">
              <template #body="{ data }">
                {{ data.department?.name ?? '--' }}
              </template>
            </Column>
            <Column header="職位" style="min-width: 100px;">
              <template #body="{ data }">
                {{ data.position?.title ?? '--' }}
              </template>
            </Column>
            <Column field="hireDate" header="到職日期" style="min-width: 110px;" />
            <Column header="狀態" style="min-width: 90px;">
              <template #body="{ data }">
                <Tag
                  :value="statusLabel(data.status)"
                  :severity="statusSeverity(data.status)"
                />
              </template>
            </Column>
            <Column header="操作" style="min-width: 100px;">
              <template #body="{ data }">
                <Button
                  icon="pi pi-eye"
                  text
                  severity="info"
                  size="small"
                  v-tooltip="'查看詳情'"
                  @click="router.push(`/hr/employees/${data.id}`)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Add Employee Dialog (placeholder) -->
      <Dialog
        v-model:visible="showAddDialog"
        header="新增員工"
        :style="{ width: '480px' }"
        modal
      >
        <div class="dialog-placeholder">
          <i class="pi pi-user-plus" style="font-size: 3rem; color: #d1d5db;"></i>
          <p>新增員工功能將在後續版本實作</p>
        </div>
        <template #footer>
          <Button label="關閉" severity="secondary" @click="showAddDialog = false" />
        </template>
      </Dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Dialog from 'primevue/dialog'
import apiClient from '@/api/index'
import type { Employee, EmployeeStatus, PagedResponse } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()

const employees = ref<Employee[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const filterStatus = ref('')
const showAddDialog = ref(false)

const filteredEmployees = computed(() => {
  let list = employees.value
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.empNo.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    )
  }
  if (filterStatus.value) {
    list = list.filter((e) => e.status === filterStatus.value)
  }
  return list
})

function statusLabel(status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    active: '在職',
    inactive: '停用',
    resigned: '離職'
  }
  return map[status] ?? status
}

function statusSeverity(status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    active: 'success',
    inactive: 'secondary',
    resigned: 'danger'
  }
  return map[status] ?? 'secondary'
}

function onSearch(): void {
  // filtering is reactive, no action needed
}

async function loadEmployees(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await apiClient.get<PagedResponse<Employee>>('/api/hr/employees')
    employees.value = res.data.data
  } catch {
    error.value = '無法載入員工清單'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEmployees()
})
</script>

<style scoped>
.employee-list-page {
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

.search-card,
.table-card {
  border-radius: 12px;
}

.search-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding-left: 2.25rem !important;
}

.status-filter {
  min-width: 130px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem;
  color: #6b7280;
}

.error-state { color: #dc2626; }

.empty-state {
  flex-direction: column;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
}

.dialog-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: #9ca3af;
  text-align: center;
}
</style>
