<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReminderPolling } from '../composables/useReminderPolling'
import { useInstallPrompt } from '../composables/useInstallPrompt'
import { db, type Medicine, type DoseRecord } from '../db'

const router = useRouter()
const { pendingCount, refresh } = useReminderPolling()
const { showInstallBanner, installApp, dismissBanner } = useInstallPrompt()

interface PendingDose {
  medicine: Medicine
  time: string
  record: DoseRecord | null
}
const pendingItems = ref<PendingDose[]>([])

async function loadPendingItems() {
  const today = new Date().toISOString().slice(0, 10)
  const now = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  const meds = await db.medicine.toArray()
  const existingRecords = await db.doseRecord
    .where('scheduledTime')
    .between(
      new Date(`${today}T00:00:00`).getTime(),
      new Date(`${today}T23:59:59`).getTime(),
    )
    .toArray()

  const recordMap = new Map<string, DoseRecord>()
  for (const r of existingRecords) {
    recordMap.set(`${r.medicineId}_${r.scheduledTime}`, r)
  }

  const list: PendingDose[] = []
  for (const m of meds) {
    for (const t of m.reminderTimes) {
      const sched = new Date(`${today}T${t}:00`).getTime()
      const key = `${m.id}_${sched}`
      const rec = recordMap.get(key)
      if (!rec && t <= now) {
        list.push({ medicine: m, time: t, record: null })
      }
    }
  }
  list.sort((a, b) => a.time.localeCompare(b.time))
  pendingItems.value = list.slice(0, 5) // 最多显示 5 条
}

onMounted(async () => {
  await loadPendingItems()
  await refresh()
})
</script>

<template>
  <div class="home">
    <!-- 待服卡片 -->
    <div class="pending-card" @click="router.push('/dose')">
      <div class="pending-header">
        <van-icon name="clock" color="#1989fa" size="20" />
        <span class="pending-title">今日待服</span>
        <van-tag v-if="pendingCount > 0" type="danger" round>{{ pendingCount }}</van-tag>
      </div>
      <div v-if="pendingItems.length" class="pending-list">
        <div v-for="item in pendingItems" :key="`${item.medicine.id}_${item.time}`" class="pending-item">
          <span class="pending-time">{{ item.time }}</span>
          <span class="pending-name">{{ item.medicine.name }}</span>
          <span class="pending-dose">{{ item.medicine.dose }}</span>
        </div>
        <div v-if="pendingCount > 5" class="more-hint">还有 {{ pendingCount - 5 }} 项 ></div>
      </div>
      <div v-else class="pending-empty">
        <van-icon name="success" color="#07c160" size="16" />
        <span>今日药品已全部服用</span>
      </div>
    </div>

    <!-- 功能入口 -->
    <div class="grid">
      <div class="grid-item" @click="router.push('/patients')">
        <div class="grid-icon" style="background:#1989fa20;color:#1989fa">
          <van-icon name="contact" size="28" />
        </div>
        <span>患者管理</span>
      </div>
      <div class="grid-item" @click="router.push('/dose')">
        <div class="grid-icon" style="background:#07c16020;color:#07c160">
          <van-icon name="todo" size="28" />
        </div>
        <span>用药看板</span>
      </div>
      <div class="grid-item" @click="router.push('/medicines')">
        <div class="grid-icon" style="background:#ee0a2420;color:#ee0a24">
          <van-icon name="medication" size="28" />
        </div>
        <span>药品库</span>
      </div>
      <div class="grid-item" @click="router.push('/data')">
        <div class="grid-icon" style="background:#7232dd20;color:#7232dd">
          <van-icon name="bar-chart" size="28" />
        </div>
        <span>数据管理</span>
      </div>
      <div class="grid-item" @click="router.push('/about')">
        <div class="grid-icon" style="background:#90939920;color:#909399">
          <van-icon name="info-o" size="28" />
        </div>
        <span>关于</span>
      </div>
    </div>

    <!-- 安装 Banner -->
    <van-action-sheet
      v-model:show="showInstallBanner"
      title="安装到主屏幕"
      description="将健康监测助手添加到主屏幕，获得更好的使用体验"
      closeable
      @select="installApp"
    >
      <div style="padding: 0 16px 20px; text-align:center;">
        <van-button type="primary" round block @click="installApp">
          安装到主屏幕
        </van-button>
        <van-button plain round block style="margin-top:8px" @click="dismissBanner">
          暂不安装
        </van-button>
      </div>
    </van-action-sheet>

    <!-- 免责声明 -->
    <div class="disclaimer">本工具仅为辅助记录，不构成医疗建议。用药请严格遵医嘱。</div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 16px;
}

.pending-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
}
.pending-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.pending-title {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}
.pending-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pending-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.pending-time {
  color: #1989fa;
  font-weight: 500;
  min-width: 40px;
}
.pending-name {
  color: #323233;
  flex: 1;
}
.pending-dose {
  color: #969799;
  font-size: 12px;
}
.more-hint {
  text-align: right;
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}
.pending-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #07c160;
  font-size: 13px;
  padding: 4px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 10px;
  padding: 20px 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  font-size: 13px;
  color: #323233;
}
.grid-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disclaimer {
  text-align: center;
  font-size: 11px;
  color: #c8c9cc;
  margin-top: 32px;
}
</style>
