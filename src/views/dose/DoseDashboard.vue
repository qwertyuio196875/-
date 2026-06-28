<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { db, type Medicine, type DoseRecord } from '../../db'

const todayStr = new Date().toISOString().slice(0, 10)

interface DoseItem {
  medicine: Medicine
  time: string
  record: DoseRecord | null
}

const items = ref<DoseItem[]>([])

const pendingItems = computed(() => items.value.filter((i) => !i.record))
const takenItems = computed(() => items.value.filter((i) => i.record?.status === 'taken'))
const skippedItems = computed(() => items.value.filter((i) => i.record?.status === 'skipped'))

async function loadToday() {
  const meds = await db.medicine.toArray()
  const allRecords = await db.doseRecord
    .where('scheduledTime')
    .between(
      new Date(`${todayStr}T00:00:00`).getTime(),
      new Date(`${todayStr}T23:59:59`).getTime(),
    )
    .toArray()

  const recordMap = new Map<string, DoseRecord>()
  for (const r of allRecords) {
    recordMap.set(`${r.medicineId}_${r.scheduledTime}`, r)
  }

  const list: DoseItem[] = []
  const now = new Date()
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  for (const m of meds) {
    for (const t of m.reminderTimes) {
      const sched = new Date(`${todayStr}T${t}:00`).getTime()
      const key = `${m.id}_${sched}`
      const record = recordMap.get(key) ?? null
      // 只有到了提醒时间或已有记录才展示
      if (t <= nowStr || record) {
        list.push({ medicine: m, time: t, record })
      }
    }
  }
  list.sort((a, b) => a.time.localeCompare(b.time))
  items.value = list
}

async function takeDose(item: DoseItem) {
  const schedTime = new Date(`${todayStr}T${item.time}:00`).getTime()
  if (item.record) {
    await db.doseRecord.update(item.record.id, {
      status: 'taken',
      actualTime: Date.now(),
    })
  } else {
    const rec: DoseRecord = {
      id: crypto.randomUUID(),
      medicineId: item.medicine.id,
      scheduledTime: schedTime,
      actualTime: Date.now(),
      status: 'taken',
    }
    await db.doseRecord.add(rec)
  }
  showToast({ type: 'success', message: `已服 ${item.medicine.name}` })
  await loadToday()
}

async function skipDose(item: DoseItem) {
  const schedTime = new Date(`${todayStr}T${item.time}:00`).getTime()
  if (item.record) {
    await db.doseRecord.update(item.record.id, {
      status: 'skipped',
    })
  } else {
    const rec: DoseRecord = {
      id: crypto.randomUUID(),
      medicineId: item.medicine.id,
      scheduledTime: schedTime,
      status: 'skipped',
    }
    await db.doseRecord.add(rec)
  }
  showToast({ message: `已跳过 ${item.medicine.name}` })
  await loadToday()
}

onMounted(loadToday)
</script>

<template>
  <div class="dashboard">
    <div class="section">
      <div class="section-title">待服药</div>
      <div v-if="!pendingItems.length" class="empty-hint">
        <van-icon name="success" color="#07c160" size="20" />
        <span>今日药品已全部服用</span>
      </div>
      <div v-for="item in pendingItems" :key="`${item.medicine.id}_${item.time}`" class="dose-card dose-card--pending">
        <div class="dose-left">
          <div class="dose-time">{{ item.time }}</div>
          <div class="dose-info">
            <div class="dose-name">{{ item.medicine.name }}</div>
            <div class="dose-desc">{{ item.medicine.dose }} · {{ item.medicine.frequency }}</div>
          </div>
        </div>
        <div class="dose-actions">
          <van-button size="mini" type="success" @click="takeDose(item)">已服</van-button>
          <van-button size="mini" plain @click="skipDose(item)">跳过</van-button>
        </div>
      </div>
    </div>

    <div class="section" v-if="takenItems.length">
      <div class="section-title">已服用</div>
      <div v-for="item in takenItems" :key="`taken_${item.medicine.id}_${item.time}`" class="dose-card dose-card--taken">
        <div class="dose-left">
          <div class="dose-time dose-time--done">{{ item.time }}</div>
          <div class="dose-info">
            <div class="dose-name">{{ item.medicine.name }}</div>
            <div class="dose-desc">{{ item.medicine.dose }} · {{ item.medicine.frequency }}</div>
          </div>
        </div>
        <van-icon name="success" color="#07c160" size="20" />
      </div>
    </div>

    <div class="section" v-if="skippedItems.length">
      <div class="section-title">已跳过</div>
      <div v-for="item in skippedItems" :key="`skip_${item.medicine.id}_${item.time}`" class="dose-card dose-card--skipped">
        <div class="dose-left">
          <div class="dose-time dose-time--done">{{ item.time }}</div>
          <div class="dose-info">
            <div class="dose-name">{{ item.medicine.name }}</div>
            <div class="dose-desc">{{ item.medicine.dose }} · {{ item.medicine.frequency }}</div>
          </div>
        </div>
        <van-icon name="clear" color="#969799" size="20" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 12px 16px;
}
.section {
  margin-bottom: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
  padding-left: 4px;
}
.empty-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 20px 0;
  color: #07c160;
  font-size: 14px;
  justify-content: center;
}
.dose-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.dose-card--pending {
  border-left: 3px solid #1989fa;
}
.dose-card--taken {
  border-left: 3px solid #07c160;
  opacity: 0.75;
}
.dose-card--skipped {
  border-left: 3px solid #969799;
  opacity: 0.55;
}
.dose-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.dose-time {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  min-width: 48px;
}
.dose-time--done {
  color: #969799;
}
.dose-info {
  flex: 1;
}
.dose-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}
.dose-desc {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}
.dose-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
