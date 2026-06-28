<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import { db, type Patient, type VitalsRecord, type Medicine, type DoseRecord } from '../../db'

const route = useRoute()
const router = useRouter()
const patientId = route.params.id as string
const activeTab = ref(0)

const patient = ref<Patient | null>(null)
const vitalsList = ref<VitalsRecord[]>([])
const medicines = ref<Medicine[]>([])

// ====== 个人信息 ======
const genderLabel = computed(() => (patient.value?.gender === 'male' ? '男' : '女'))
const conditionTags = computed(() => patient.value?.conditions ?? [])

// ====== 体征记录 ======
const todayStr = new Date().toISOString().slice(0, 10)
const recentDays = 30
const startDate = new Date(Date.now() - recentDays * 86400000).toISOString().slice(0, 10)

const vitalsInRange = computed(() =>
  vitalsList.value.filter((v) => v.date >= startDate),
)

function formatDate(dateStr: string) {
  const d = dateStr.slice(5)
  return d.replace('-', '/')
}

function bpWarning(systolic: number) {
  return systolic > 180
}

// ====== 用药方案 ======
const todayDoseRecords = ref<DoseRecord[]>([])

const medicineStatuses = computed(() => {
  return medicines.value.map((m) => {
    const todayRec = todayDoseRecords.value.filter(
      (r) => r.medicineId === m.id,
    )
    const pending = m.reminderTimes.filter((t) => {
      const sched = new Date(`${todayStr}T${t}:00`).getTime()
      return !todayRec.some(
        (r) => r.scheduledTime === sched && r.status !== 'skipped',
      )
    })
    return { medicine: m, pending }
  })
})

// ====== 生命周期 ======
onMounted(async () => {
  patient.value = (await db.patient.get(patientId)) ?? null
  if (!patient.value) {
    showToast('患者不存在')
    router.back()
    return
  }

  vitalsList.value = await db.vitalsRecord
    .where('patientId')
    .equals(patientId)
    .reverse()
    .toArray()

  medicines.value = await db.medicine.toArray()

  todayDoseRecords.value = await db.doseRecord
    .where('scheduledTime')
    .between(
      new Date(`${todayStr}T00:00:00`).getTime(),
      new Date(`${todayStr}T23:59:59`).getTime(),
    )
    .toArray()
})

function goEdit() {
  router.push(`/patients/${patientId}/edit`)
}

function goVitals() {
  router.push(`/patients/${patientId}/vitals`)
}

function goDose(medicineId: string) {
  router.push(`/medicines/${medicineId}/edit`)
}

async function handleDelete() {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除患者「${patient.value?.name}」吗？关联数据将一并清除。`,
      confirmButtonColor: '#ee0a24',
    })
    await db.patient.delete(patientId)
    await db.vitalsRecord.where('patientId').equals(patientId).delete()
    showToast({ type: 'success', message: '已删除' })
    router.push('/patients')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="patient-detail" v-if="patient">
    <van-nav-bar title="患者详情" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="delete" size="20" color="#ee0a24" @click="handleDelete" />
      </template>
    </van-nav-bar>

    <!-- 头部卡片 -->
    <div class="header-card">
      <div class="header-main">
        <div class="avatar">{{ patient.name[0] }}</div>
        <div class="header-info">
          <div class="header-name">{{ patient.name }}</div>
          <div class="header-meta">{{ patient.age }}岁 · {{ genderLabel }}</div>
          <div class="header-tags">
            <van-tag
              v-for="c in conditionTags.slice(0, 3)"
              :key="c"
              type="primary"
              plain
              style="margin-right:4px;font-size:11px;padding:2px 6px"
            >
              {{ c }}
            </van-tag>
            <van-tag v-if="conditionTags.length > 3" type="primary" plain style="font-size:11px;padding:2px 6px">
              +{{ conditionTags.length - 3 }}
            </van-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <van-button size="small" type="primary" plain @click="goVitals">记录体征</van-button>
        <van-button size="small" plain @click="goEdit">编辑资料</van-button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <van-tabs v-model:active="activeTab" sticky>
      <!-- 体征记录 -->
      <van-tab title="体征记录">
        <div v-if="vitalsInRange.length" class="tab-content">
          <div class="list-hint">最近 30 天记录</div>
          <div
            v-for="v in vitalsInRange"
            :key="v.id"
            class="vitals-card"
            :class="{ 'vitals-card--warn': bpWarning(v.systolic) }"
          >
            <div class="vitals-date">{{ formatDate(v.date) }}</div>
            <div class="vitals-items">
              <div class="vitals-item">
                <span class="vitals-val" :class="{ 'text-danger': bpWarning(v.systolic) }">{{ v.systolic }}</span>
                <span class="vitals-unit">/{{ v.diastolic }}</span>
                <span class="vitals-label">mmHg</span>
              </div>
              <div class="vitals-item">
                <span class="vitals-val">{{ v.heartRate }}</span>
                <span class="vitals-label">bpm</span>
              </div>
              <div class="vitals-item">
                <span class="vitals-val">{{ v.weight }}</span>
                <span class="vitals-label">kg</span>
              </div>
            </div>
            <div v-if="v.notes" class="vitals-note">{{ v.notes }}</div>
          </div>
        </div>
        <van-empty v-else description="暂无体征记录" class="tab-empty" />
      </van-tab>

      <!-- 用药方案 -->
      <van-tab title="用药方案">
        <div v-if="medicineStatuses.length" class="tab-content">
          <div
            v-for="{ medicine: m, pending } in medicineStatuses"
            :key="m.id"
            class="med-card"
            @click="goDose(m.id)"
          >
            <div class="med-head">
              <span class="med-name">{{ m.name }}</span>
              <van-tag v-if="pending.length" type="danger" style="font-size:11px;padding:2px 6px">
                今日待服 {{ pending.length }}
              </van-tag>
            </div>
            <div class="med-info">
              <span>{{ m.dose }} · {{ m.frequency }}</span>
              <span class="med-times">{{ m.reminderTimes.join('、') }}</span>
            </div>
          </div>
        </div>
        <van-empty v-else description="暂无用药方案" class="tab-empty" />
      </van-tab>

      <!-- 个人信息 -->
      <van-tab title="个人信息">
        <div class="tab-content">
          <van-cell-group>
            <van-cell title="姓名" :value="patient.name" />
            <van-cell title="性别" :value="genderLabel" />
            <van-cell title="年龄" :value="`${patient.age}岁`" />
            <van-cell title="联系方式" :value="patient.phone || '未填写'" />
          </van-cell-group>
          <van-cell-group style="margin-top:12px">
            <van-cell title="基础病" />
            <div class="info-tags">
              <van-tag
                v-for="c in conditionTags"
                :key="c"
                type="primary"
                plain
                style="margin:2px 6px 2px 0;font-size:12px;padding:2px 8px"
              >
                {{ c }}
              </van-tag>
              <span v-if="!conditionTags.length" class="info-empty">无</span>
            </div>
            <van-cell title="过敏史" :value="patient.allergies || '无'" />
            <van-cell title="备注" :label="patient.notes || '无'" />
          </van-cell-group>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.patient-detail {
  min-height: 100vh;
  background: #f7f8fa;
}

/* 头部 */
.header-card {
  background: #fff;
  padding: 16px;
  margin-bottom: 2px;
}
.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #1989fa;
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-info {
  flex: 1;
}
.header-name {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}
.header-meta {
  font-size: 13px;
  color: #969799;
  margin: 2px 0 4px;
}
.header-tags {
  display: flex;
  flex-wrap: wrap;
}
.header-actions {
  display: flex;
  gap: 8px;
}

/* Tab 内容 */
.tab-content {
  padding: 12px 16px;
}
.tab-empty {
  padding-top: 40px;
}
.list-hint {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

/* 体征卡片 */
.vitals-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border-left: 3px solid #07c160;
}
.vitals-card--warn {
  border-left-color: #ee0a24;
}
.vitals-date {
  font-size: 12px;
  color: #969799;
  margin-bottom: 6px;
}
.vitals-items {
  display: flex;
  gap: 24px;
}
.vitals-item {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.vitals-val {
  font-size: 20px;
  font-weight: 600;
  color: #323233;
}
.text-danger {
  color: #ee0a24;
}
.vitals-unit {
  font-size: 14px;
  color: #646566;
}
.vitals-label {
  font-size: 12px;
  color: #969799;
}
.vitals-note {
  font-size: 12px;
  color: #969799;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

/* 药品卡片 */
.med-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}
.med-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.med-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}
.med-info {
  font-size: 12px;
  color: #969799;
  display: flex;
  justify-content: space-between;
}
.med-times {
  color: #1989fa;
}

/* 个人信息 */
.info-tags {
  padding: 8px 16px 12px;
}
.info-empty {
  font-size: 13px;
  color: #c8c9cc;
}
</style>
