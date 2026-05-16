<template>
  <AppLayout>
    <div class="leave-apply-page">
      <div class="page-header">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" />
        <h2 class="page-title">申請假單</h2>
      </div>

      <Card class="form-card">
        <template #content>
          <form class="leave-form" @submit.prevent="handleSubmit">
            <!-- Leave Type -->
            <div class="form-group">
              <label for="leaveType" class="form-label">假別 <span class="required">*</span></label>
              <select
                id="leaveType"
                v-model="form.leaveTypeId"
                class="p-inputtext form-select"
                :class="{ 'p-invalid': errors.leaveTypeId }"
                required
              >
                <option value="" disabled>請選擇假別</option>
                <option
                  v-for="lt in leaveTypes"
                  :key="lt.id"
                  :value="lt.id"
                >
                  {{ lt.name }}{{ lt.isPaid ? '' : '（無薪）' }}
                </option>
              </select>
              <small v-if="errors.leaveTypeId" class="error-text">{{ errors.leaveTypeId }}</small>
            </div>

            <!-- Date Range -->
            <div class="form-row">
              <div class="form-group">
                <label for="startDate" class="form-label">開始日期 <span class="required">*</span></label>
                <InputText
                  id="startDate"
                  v-model="form.startDate"
                  type="date"
                  :class="{ 'p-invalid': errors.startDate }"
                  required
                />
                <small v-if="errors.startDate" class="error-text">{{ errors.startDate }}</small>
              </div>
              <div class="form-group">
                <label for="endDate" class="form-label">結束日期 <span class="required">*</span></label>
                <InputText
                  id="endDate"
                  v-model="form.endDate"
                  type="date"
                  :class="{ 'p-invalid': errors.endDate }"
                  required
                />
                <small v-if="errors.endDate" class="error-text">{{ errors.endDate }}</small>
              </div>
            </div>

            <!-- Days count -->
            <div v-if="form.startDate && form.endDate && dayCount > 0" class="days-hint">
              <i class="pi pi-calendar"></i>
              請假天數：{{ dayCount }} 天
            </div>

            <!-- Reason -->
            <div class="form-group">
              <label for="reason" class="form-label">事由 <span class="required">*</span></label>
              <textarea
                id="reason"
                v-model="form.reason"
                class="p-inputtext form-textarea"
                :class="{ 'p-invalid': errors.reason }"
                rows="4"
                placeholder="請填寫請假事由..."
                required
              ></textarea>
              <small v-if="errors.reason" class="error-text">{{ errors.reason }}</small>
            </div>

            <!-- Attachment (shown when the leave type requires one) -->
            <div v-if="selectedLeaveType?.requiresAttachment" class="form-group">
              <label class="form-label">
                附件 <span class="required">*</span>
                <span class="form-hint-inline">（JPG / PNG / PDF，最大 10 MB）</span>
              </label>
              <div class="attachment-area" @click="triggerFileInput">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  class="hidden-input"
                  @change="onFileChange"
                />
                <div v-if="!attachmentFile" class="attachment-placeholder">
                  <i class="pi pi-upload"></i>
                  <span>點擊選擇檔案</span>
                </div>
                <div v-else class="attachment-selected">
                  <i class="pi pi-file"></i>
                  <span>{{ attachmentFile.name }}</span>
                  <Button
                    icon="pi pi-times"
                    text
                    size="small"
                    severity="secondary"
                    @click.stop="attachmentFile = null; attachmentUrl = ''"
                  />
                </div>
              </div>
              <div v-if="uploadProgress" class="upload-progress">
                <i class="pi pi-spin pi-spinner"></i> 上傳中...
              </div>
              <small v-if="errors.attachment" class="error-text">{{ errors.attachment }}</small>
            </div>

            <!-- Global error -->
            <div v-if="submitError" class="submit-error">
              <i class="pi pi-exclamation-triangle"></i>
              {{ submitError }}
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <Button
                type="button"
                label="取消"
                severity="secondary"
                @click="router.back()"
              />
              <Button
                type="submit"
                label="送出申請"
                icon="pi pi-send"
                :loading="submitting"
              />
            </div>
          </form>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { leaveApi } from '@/api/leave'
import type { LeaveType } from '@/types'
import AppLayout from '@/components/AppLayout.vue'

const router = useRouter()
const toast = useToast()

const leaveTypes = ref<LeaveType[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const attachmentFile = ref<File | null>(null)
const attachmentUrl = ref('')
const uploadProgress = ref(false)

onMounted(async () => {
  try {
    leaveTypes.value = await leaveApi.getLeaveTypes()
  } catch {
    // silently ignore — dropdown will be empty
  }
})

const form = ref({
  leaveTypeId: '' as number | '',
  startDate: '',
  endDate: '',
  reason: ''
})

const selectedLeaveType = computed(() =>
  leaveTypes.value.find((lt) => lt.id === form.value.leaveTypeId) ?? null
)

const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const submitError = ref<string | null>(null)

function triggerFileInput(): void {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event): Promise<void> {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  attachmentFile.value = file
  uploadProgress.value = true
  errors.value = { ...errors.value, attachment: '' }
  try {
    const result = await leaveApi.uploadAttachment(file)
    attachmentUrl.value = result.url
  } catch {
    attachmentFile.value = null
    attachmentUrl.value = ''
    errors.value = { ...errors.value, attachment: '上傳失敗，請重試' }
  } finally {
    uploadProgress.value = false
  }
}

const dayCount = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return 0
  const start = new Date(form.value.startDate)
  const end = new Date(form.value.endDate)
  if (end < start) return 0
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return diff
})

function validate(): boolean {
  const errs: Record<string, string> = {}
  if (!form.value.leaveTypeId) errs.leaveTypeId = '請選擇假別'
  if (!form.value.startDate) errs.startDate = '請選擇開始日期'
  if (!form.value.endDate) errs.endDate = '請選擇結束日期'
  if (form.value.startDate && form.value.endDate && form.value.endDate < form.value.startDate) {
    errs.endDate = '結束日期不能早於開始日期'
  }
  if (!form.value.reason.trim()) errs.reason = '請填寫請假事由'
  if (selectedLeaveType.value?.requiresAttachment && !attachmentUrl.value) {
    errs.attachment = '此假別需要上傳附件（如醫療證明）'
  }
  errors.value = errs
  return Object.keys(errs).length === 0
}

async function handleSubmit(): Promise<void> {
  if (!validate()) return
  submitting.value = true
  submitError.value = null
  try {
    await leaveApi.apply({
      leaveTypeId: form.value.leaveTypeId as number,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      reason: form.value.reason.trim(),
      attachmentUrl: attachmentUrl.value || undefined,
    })
    toast.add({
      severity: 'success',
      summary: '申請成功',
      detail: '假單已送出，等待主管審核',
      life: 4000
    })
    router.push('/leave')
  } catch {
    submitError.value = '申請失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.leave-apply-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 640px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.form-card {
  border-radius: 12px;
}

.leave-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #ef4444;
}

.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
}

.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
}

.error-text {
  color: #ef4444;
  font-size: 0.8rem;
}

.days-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}

.submit-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.form-hint-inline {
  font-size: 0.75rem;
  font-weight: 400;
  color: #9ca3af;
  margin-left: 0.25rem;
}

.attachment-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.attachment-area:hover {
  border-color: #06b6d4;
}

.attachment-placeholder,
.attachment-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.attachment-selected {
  color: #374151;
}

.hidden-input {
  display: none;
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
