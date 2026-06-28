<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showDialog, showSuccessToast } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import { db, type VitalsRecord } from '../../db'

const route = useRoute()
const router = useRouter()
const patientId = route.params.patientId as string

const patient = ref<{ id: string; name: string } | null>(null)

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const minDateStr = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10)

const form = ref({
  date: todayStr,
  systolic: null as number | null,
  diastolic: null as number | null,
  heartRate: null as number | null,
  weight: null as number | null,
  notes: '',
})

const existingRecord = ref<VitalsRecord | null>(null)

const systolicWarning = computed(() => {
  return form.value.systolic !== null && form.value.systolic > 180
})

const showSheet = ref(false)
let sheetResolve: ((v: string | null) => void) | null = null

function onSheetSelect(action: { name: string } | null) {
  showSheet.value = false
  sheetResolve?.(action?.name ?? null)
}

function pickAction(): Promise<string | null> {
  return new Promise((resolve) => {
    sheetResolve = resolve
    showSheet.value = true
  })
}

async function loadPatient() {
  const p = await db.patient.get(patientId)
  if (p) patient.value = { id: p.id, name: p.name }
}

async function checkExisting() {
  const rec = await db.vitalsRecord
    .where('[patientId+date]')
    .equals([patientId, form.value.date])
    .first()
  existingRecord.value = rec ?? null
  if (rec) {
    form.value.systolic = rec.systolic
    form.value.diastolic = rec.diastolic
    form.value.heartRate = rec.heartRate
    form.value.weight = rec.weight
    form.value.notes = rec.notes ?? ''
  }
}

function onDateChange() {
  form.value.systolic = null
  form.value.diastolic = null
  form.value.heartRate = null
  form.value.weight = null
  form.value.notes = ''
  checkExisting()
}

function validateRange(): { ok: boolean; message: string } {
  const hr = form.value.heartRate
  const w = form.value.weight
  if (hr !== null && (hr < 30 || hr > 220)) {
    return { ok: false, message: `心跳 ${hr} bpm 超出正常范围（30-220），确认记录吗？` }
  }
  if (w !== null && (w < 20 || w > 300)) {
    return { ok: false, message: `体重 ${w} kg 超出正常范围（20-300），确认记录吗？` }
  }
  return { ok: true, message: '' }
}

async function onSubmit() {
  if (form.value.systolic === null || form.value.diastolic === null) {
    showToast('请填写血压值')
    return
  }
  if (form.value.systolic < 60 || form.value.systolic > 300) {
    showToast('收缩压范围 60-300 mmHg')
    return
  }
  if (form.value.diastolic < 30 || form.value.diastolic > 200) {
    showToast('舒张压范围 30-200 mmHg')
    return
  }
  if (form.value.heartRate === null) {
    showToast('请填写心跳')
    return
  }
  if (form.value.weight === null) {
    showToast('请填写体重')
    return
  }

  const range = validateRange()
  if (!range.ok) {
    try {
      await showDialog({
        title: '数值异常',
        message: range.message,
        confirmButtonColor: '#ee0a24',
      })
    } catch {
      return
    }
  }

  await checkExisting()
  if (existingRecord.value) {
    const action = await pickAction()
    if (!action) return
    if (action === 'overwrite') {
      await db.vitalsRecord.update(existingRecord.value.id, {
        systolic: form.value.systolic!,
        diastolic: form.value.diastolic!,
        heartRate: form.value.heartRate!,
        weight: form.value.weight!,
        notes: form.value.notes || undefined,
      })
      showSuccessToast('已覆盖')
    } else {
      const appendText = form.value.notes
        ? `${existingRecord.value.notes || ''}\n---\n${form.value.notes}`
        : existingRecord.value.notes
      await db.vitalsRecord.update(existingRecord.value.id, {
        notes: appendText || undefined,
      })
      showSuccessToast('备注已追加')
    }
  } else {
    const record: VitalsRecord = {
      id: crypto.randomUUID(),
      patientId,
      date: form.value.date,
      systolic: form.value.systolic!,
      diastolic: form.value.diastolic!,
      heartRate: form.value.heartRate!,
      weight: form.value.weight!,
      notes: form.value.notes || undefined,
    }
    await db.vitalsRecord.add(record)
    showSuccessToast('记录已保存')
  }
  router.back()
}

loadPatient()
</script>

<template>
  <div class="vitals-page">
    <van-nav-bar title="记录体征" left-arrow @click-left="router.back()" />

    <div class="patient-info" v-if="patient">
      <van-icon name="contact" size="20" />
      <span>{{ patient.name }}</span>
    </div>

    <van-form @submit.prevent="onSubmit">
      <van-cell-group title="日期">
        <van-field
          :model-value="form.date"
          label="日期"
          type="date"
          :min="new Date(minDateStr).getTime()"
          :max="new Date(todayStr).getTime()"
          @update:model-value="(v: any) => { form.date = String(v); onDateChange() }"
        />
      </van-cell-group>

      <van-cell-group title="血压">
        <div class="bp-row">
          <div class="bp-field" :class="{ 'bp-warning': systolicWarning }">
            <label class="bp-label">收缩压</label>
            <div class="bp-input-wrap">
              <van-field
                :model-value="form.systolic as any"
                type="digit"
                placeholder="0"
                clearable
                @update:model-value="(v: any) => form.systolic = v === '' ? null : Number(v)"
              />
              <span class="bp-unit">mmHg</span>
              <van-icon
                v-if="systolicWarning"
                name="warning-o"
                color="#ee0a24"
                size="18"
                class="bp-warn-icon"
              />
            </div>
          </div>
          <span class="bp-sep">/</span>
          <div class="bp-field">
            <label class="bp-label">舒张压</label>
            <div class="bp-input-wrap">
              <van-field
                :model-value="form.diastolic as any"
                type="digit"
                placeholder="0"
                clearable
                @update:model-value="(v: any) => form.diastolic = v === '' ? null : Number(v)"
              />
              <span class="bp-unit">mmHg</span>
            </div>
          </div>
        </div>
      </van-cell-group>

      <van-cell-group title="心跳">
        <div class="single-field">
          <van-field
            :model-value="form.heartRate as any"
            type="digit"
            placeholder="请输入心跳"
            clearable
            @update:model-value="(v: any) => form.heartRate = v === '' ? null : Number(v)"
          >
            <template #button>
              <span class="field-unit">bpm</span>
            </template>
          </van-field>
        </div>
      </van-cell-group>

      <van-cell-group title="体重">
        <div class="single-field">
          <van-field
            :model-value="form.weight as any"
            type="digit"
            placeholder="请输入体重"
            clearable
            @update:model-value="(v: any) => form.weight = v === '' ? null : Number(v)"
          >
            <template #button>
              <span class="field-unit">kg</span>
            </template>
          </van-field>
        </div>
      </van-cell-group>

      <van-cell-group title="备注">
        <van-field
          v-model="form.notes"
          type="textarea"
          placeholder="选填，如：头晕"
          rows="3"
          clearable
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit">
          保存记录
        </van-button>
      </div>
    </van-form>

    <van-action-sheet
      v-model:show="showSheet"
      title="当日已有体征记录"
      :actions="[
        { name: '覆盖已有记录' },
        { name: '追加备注' },
      ]"
      cancel-text="取消"
      @select="onSheetSelect"
      @cancel="onSheetSelect(null)"
      @close="onSheetSelect(null)"
    />
  </div>
</template>

<style scoped>
.vitals-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.bp-row {
  display: flex;
  align-items: flex-start;
  padding: 8px 16px 12px;
  gap: 8px;
}

.bp-field {
  flex: 1;
}

.bp-field :deep(.van-field) {
  padding: 0;
}

.bp-label {
  display: block;
  font-size: 13px;
  color: #646566;
  margin-bottom: 4px;
}

.bp-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f7f8fa;
  border-radius: 6px;
  padding: 4px 8px;
}

.bp-input-wrap :deep(.van-field__body) {
  background: transparent;
}

.bp-unit {
  font-size: 13px;
  color: #969799;
  white-space: nowrap;
}

.bp-warn-icon {
  flex-shrink: 0;
}

.bp-warning .bp-input-wrap {
  border: 1px solid #ee0a24;
}

.bp-warning .bp-input-wrap :deep(input) {
  color: #ee0a24;
}

.bp-sep {
  font-size: 24px;
  color: #969799;
  line-height: 68px;
}

.single-field {
  padding: 0 16px;
}

.field-unit {
  font-size: 13px;
  color: #969799;
}
</style>
