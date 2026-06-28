<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import { useRouter } from 'vue-router'
import { db, type Medicine } from '../../db'

const router = useRouter()
const medicines = ref<Medicine[]>([])

const CATEGORY_LABELS: Record<string, string> = {
  antihypertensive: '降压',
  hypoglycemic: '降糖',
  healthcare: '保健',
}

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat
}

onMounted(async () => {
  medicines.value = await db.medicine.orderBy('createdAt').reverse().toArray()
})

async function handleDelete(m: Medicine) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除药品「${m.name}」吗？`,
      confirmButtonColor: '#ee0a24',
    })
    await db.medicine.delete(m.id)
    await db.doseRecord.where('medicineId').equals(m.id).delete()
    medicines.value = medicines.value.filter((item) => item.id !== m.id)
    showToast({ type: 'success', message: '已删除' })
  } catch {
    // 用户取消
  }
}

function goAdd() {
  router.push('/medicines/add')
}

function goEdit(m: Medicine) {
  router.push(`/medicines/${m.id}/edit`)
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="药品库" left-arrow @click-left="router.push('/')">
      <template #right>
        <van-icon name="plus" size="20" @click="goAdd" />
      </template>
    </van-nav-bar>

    <div class="list">
      <van-card
        v-for="m in medicines"
        :key="m.id"
        :title="m.name"
        :desc="`${m.dose} · ${m.frequency}`"
        @click="goEdit(m)"
      >
        <template #tags>
          <van-tag type="primary" plain style="margin-right: 4px">
            {{ categoryLabel(m.category) }}
          </van-tag>
          <van-tag
            v-for="t in m.reminderTimes"
            :key="t"
            type="warning"
            plain
            style="margin-right: 4px"
          >
            {{ t }}
          </van-tag>
        </template>
        <template #footer>
          <van-button
            size="mini"
            type="danger"
            plain
            @click.stop="handleDelete(m)"
          >
            删除
          </van-button>
        </template>
      </van-card>

      <van-empty v-if="!medicines.length" description="暂无药品，点击右上角 + 添加" />
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.list {
  padding: 12px 16px;
}
:deep(.van-card) {
  border-radius: 8px;
  margin-bottom: 12px;
}
</style>
