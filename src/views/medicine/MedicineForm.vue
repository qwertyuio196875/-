<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import 'vant/es/toast/style'
import { db, type Medicine } from '../../db'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const CATEGORIES = [
  { value: 'antihypertensive', label: '降压' },
  { value: 'hypoglycemic', label: '降糖' },
  { value: 'healthcare', label: '保健' },
]

const form = ref({
  name: '',
  dose: '',
  frequency: '',
  reminderTimes: [''],
  category: 'healthcare' as string,
  notes: '',
})

const customCategory = ref('')
const allCategories = ref<{ value: string; label: string }[]>([...CATEGORIES])

onMounted(async () => {
  if (isEdit) {
    const m = await db.medicine.get(route.params.id as string)
    if (m) {
      form.value = {
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        reminderTimes: m.reminderTimes.length ? [...m.reminderTimes] : [''],
        category: m.category,
        notes: m.notes ?? '',
      }
      if (!CATEGORIES.some((c) => c.value === m.category)) {
        allCategories.value.push({ value: m.category, label: m.category })
      }
    }
  }
})

function addTime() {
  form.value.reminderTimes.push('')
}

function removeTime(idx: number) {
  form.value.reminderTimes.splice(idx, 1)
  if (!form.value.reminderTimes.length) form.value.reminderTimes.push('')
}

function addCustomCategory() {
  const val = customCategory.value.trim()
  if (!val) return
  if (!allCategories.value.some((c) => c.value === val)) {
    allCategories.value.push({ value: val, label: val })
  }
  form.value.category = val
  customCategory.value = ''
}

async function onSubmit() {
  if (!form.value.name) { showToast('请输入药品名称'); return }
  if (!form.value.dose) { showToast('请输入规格剂量'); return }
  if (!form.value.frequency) { showToast('请输入用药频次'); return }

  const times = form.value.reminderTimes
    .map((t) => t.trim())
    .filter(Boolean)
    .sort()
  if (!times.length) { showToast('请添加至少一个提醒时间'); return }

  if (isEdit) {
    await db.medicine.update(route.params.id as string, {
      name: form.value.name,
      dose: form.value.dose,
      frequency: form.value.frequency,
      reminderTimes: times,
      category: form.value.category,
      notes: form.value.notes || undefined,
    })
    showSuccessToast('已更新')
  } else {
    const med: Medicine = {
      id: crypto.randomUUID(),
      name: form.value.name,
      dose: form.value.dose,
      frequency: form.value.frequency,
      reminderTimes: times,
      category: form.value.category,
      notes: form.value.notes || undefined,
      createdAt: Date.now(),
      schemaVersion: 1,
    }
    await db.medicine.add(med)
    showSuccessToast('已添加')
  }
  router.push('/medicines')
}
</script>

<template>
  <div class="page">
    <van-nav-bar
      :title="isEdit ? '编辑药品' : '添加药品'"
      left-arrow
      @click-left="router.back()"
    />

    <van-form @submit="onSubmit">
      <van-cell-group title="基本信息">
        <van-field
          v-model="form.name"
          label="药品名称"
          placeholder="请输入"
          :rules="[{ required: true, message: '请填写名称' }]"
          clearable
        />
        <van-field
          v-model="form.dose"
          label="规格剂量"
          placeholder="如：5mg、1片"
          :rules="[{ required: true, message: '请填写规格剂量' }]"
          clearable
        />
        <van-field
          v-model="form.frequency"
          label="用药频次"
          placeholder="如：每日一次、每日两次"
          :rules="[{ required: true, message: '请填写频次' }]"
          clearable
        />
      </van-cell-group>

      <van-cell-group title="分类">
        <van-cell title="选择分类" />
        <div class="category-tags">
          <van-tag
            v-for="c in allCategories"
            :key="c.value"
            :type="form.category === c.value ? 'primary' : 'default'"
            :plain="form.category !== c.value"
            size="medium"
            class="cat-tag"
            @click="form.category = c.value"
          >
            {{ c.label }}
          </van-tag>
        </div>
        <div class="custom-row">
          <van-field
            v-model="customCategory"
            placeholder="输入自定义分类"
            clearable
            @keypress.enter="addCustomCategory"
          />
          <van-button type="primary" size="small" @click="addCustomCategory">
            添加
          </van-button>
        </div>
      </van-cell-group>

      <van-cell-group title="提醒时间">
        <div v-for="(_, idx) in form.reminderTimes" :key="idx" class="time-row">
          <van-field
            v-model="form.reminderTimes[idx]"
            type="time"
            :label="`时间 ${idx + 1}`"
            placeholder="HH:mm"
          />
          <van-button
            v-if="form.reminderTimes.length > 1"
            icon="delete"
            type="danger"
            size="small"
            plain
            @click="removeTime(idx)"
          />
        </div>
        <van-button
          plain
          type="primary"
          size="small"
          style="margin: 8px 16px"
          @click="addTime"
        >
          + 添加提醒时间
        </van-button>
      </van-cell-group>

      <van-cell-group title="备注">
        <van-field
          v-model="form.notes"
          type="textarea"
          placeholder="选填"
          rows="3"
          clearable
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit">
          {{ isEdit ? '保存修改' : '添加药品' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px 12px;
}
.cat-tag {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
}
.custom-row {
  display: flex;
  align-items: center;
  padding-right: 16px;
}
.time-row {
  display: flex;
  align-items: center;
}
</style>
