<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import { useRouter } from 'vue-router'
import { db, type Patient } from '../../db'

const router = useRouter()
const patients = ref<Patient[]>([])

onMounted(async () => {
  patients.value = await db.patient.orderBy('createdAt').reverse().toArray()
})

async function handleDelete(p: Patient) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除患者「${p.name}」吗？关联数据将一并清除。`,
      confirmButtonColor: '#ee0a24',
    })
    await db.patient.delete(p.id)
    patients.value = patients.value.filter((item) => item.id !== p.id)
    showToast({ type: 'success', message: '已删除' })
  } catch {
    // 用户取消
  }
}

function goAdd() {
  if (patients.value.length >= 10) {
    showToast('患者已达上限（10人），请先归档后添加')
    return
  }
  router.push('/patients/add')
}

function goDetail(p: Patient) {
  router.push(`/patients/${p.id}`)
}

function goEdit(p: Patient) {
  router.push(`/patients/${p.id}/edit`)
}

function goVitals(p: Patient) {
  router.push(`/patients/${p.id}/vitals`)
}

function formatGender(g: Patient['gender']) {
  return g === 'male' ? '男' : '女'
}
</script>

<template>
  <div class="patient-page">
    <van-nav-bar title="患者管理" left-arrow @click-left="router.push('/')">
      <template #right>
        <van-icon name="plus" size="20" @click="goAdd" />
      </template>
    </van-nav-bar>

    <div class="patient-list">
      <van-card
        v-for="p in patients"
        :key="p.id"
        :class="{ 'card--has-reminder': p.hasReminder }"
        :title="p.name"
        :desc="`${p.age}岁 · ${formatGender(p.gender)}`"
        :thumb="p.gender === 'male' ? undefined : undefined"
        @click="goDetail(p)"
      >
        <template #tags>
          <van-tag
            v-for="c in p.conditions"
            :key="c"
            type="primary"
            plain
            style="margin: 2px 4px 2px 0"
          >
            {{ c }}
          </van-tag>
        </template>
        <template #footer>
          <van-button
            size="mini"
            type="primary"
            plain
            @click.stop="goVitals(p)"
          >
            记录体征
          </van-button>
          <van-button
            size="mini"
            plain
            @click.stop="goEdit(p)"
          >
            编辑
          </van-button>
          <van-button
            size="mini"
            type="danger"
            plain
            @click.stop="handleDelete(p)"
          >
            删除
          </van-button>
        </template>
      </van-card>

      <van-empty
        v-if="!patients.length"
        description="暂无患者，点击右上角 + 添加"
      />
    </div>
  </div>
</template>

<style scoped>
.patient-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.patient-list {
  padding: 12px 16px;
}

:deep(.van-card) {
  border-radius: 8px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
}

.card--has-reminder {
  :deep(.van-card) {
    border: 2px solid #ff976a;
  }
}
</style>
