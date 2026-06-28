<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import 'vant/es/toast/style'
import { db, type Patient } from '../../db'
import { COMMON_CONDITIONS } from '../../types/patient'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id

const form = ref<{
  name: string
  gender: Patient['gender']
  age: number
  phone: string
  conditions: string[]
  allergies: string
  notes: string
}>({
  name: '',
  gender: 'male',
  age: 0,
  phone: '',
  conditions: [],
  allergies: '',
  notes: '',
})

const customCondition = ref('')
const allConditions = ref<string[]>([...COMMON_CONDITIONS])

onMounted(async () => {
  if (isEdit) {
    const p = await db.patient.get(route.params.id as string)
    if (p) {
      form.value = {
        name: p.name,
        gender: p.gender,
        age: p.age,
        phone: p.phone ?? '',
        conditions: p.conditions,
        allergies: p.allergies ?? '',
        notes: p.notes ?? '',
      }
      // 合并已有基础病到列表中
      for (const c of p.conditions) {
        if (!allConditions.value.includes(c)) {
          allConditions.value.push(c)
        }
      }
    }
  }
})

function toggleCondition(cond: string) {
  const idx = form.value.conditions.indexOf(cond)
  if (idx >= 0) {
    form.value.conditions.splice(idx, 1)
  } else {
    form.value.conditions.push(cond)
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function addCustomCondition() {
  const val = customCondition.value.trim()
  if (!val) return
  if (!allConditions.value.includes(val)) {
    allConditions.value.push(val)
  }
  if (!form.value.conditions.includes(val)) {
    form.value.conditions.push(val)
  }
  customCondition.value = ''
}

async function onSubmit() {
  if (!form.value.name) {
    showToast('请输入患者姓名')
    return
  }
  if (form.value.age <= 0 || form.value.age > 150) {
    showToast('请输入有效年龄')
    return
  }

  try {
    const payload = JSON.parse(JSON.stringify(form.value))
    if (isEdit) {
      await db.patient.update(route.params.id as string, {
        ...payload,
        phone: payload.phone || undefined,
        allergies: payload.allergies || undefined,
        notes: payload.notes || undefined,
      })
      showSuccessToast('已更新')
    } else {
      const newPatient: Patient = {
        id: generateId(),
        ...payload,
        phone: payload.phone || undefined,
        allergies: payload.allergies || undefined,
        notes: payload.notes || undefined,
        hasReminder: false,
        createdAt: Date.now(),
      }
      await db.patient.add(newPatient)
      showSuccessToast('已添加')
    }
    router.push('/patients')
  } catch (e: any) {
    showToast(e?.message || '操作失败，请重试')
  }
}
</script>

<template>
  <div class="patient-form-page">
    <van-nav-bar
      :title="isEdit ? '编辑患者' : '添加患者'"
      left-arrow
      @click-left="router.back()"
    />

    <van-form @submit="onSubmit" class="form">
      <!-- 基础信息 -->
      <van-cell-group title="基础信息">
        <van-field
          v-model="form.name"
          name="name"
          label="姓名"
          placeholder="请输入患者姓名"
          :rules="[{ required: true, message: '请填写姓名' }]"
          clearable
        />

        <van-field name="gender" label="性别">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field
          v-model.number="form.age"
          name="age"
          label="年龄"
          placeholder="请输入年龄"
          type="number"
          :rules="[
            { required: true, message: '请填写年龄' },
            { validator: (v: number) => v > 0 && v <= 150, message: '年龄范围 1-150' },
          ]"
          clearable
        />

        <van-field
          v-model="form.phone"
          name="phone"
          label="联系方式"
          placeholder="选填"
          type="tel"
          clearable
        />
      </van-cell-group>

      <!-- 健康档案 -->
      <van-cell-group title="健康档案">
        <van-cell title="基础病" />
        <div class="condition-tags">
          <van-tag
            v-for="c in allConditions"
            :key="c"
            :type="form.conditions.includes(c) ? 'primary' : 'default'"
            :plain="!form.conditions.includes(c)"
            size="medium"
            class="cond-tag"
            @click="toggleCondition(c)"
          >
            {{ c }}
          </van-tag>
        </div>

        <div class="custom-condition-row">
          <van-field
            v-model="customCondition"
            placeholder="输入自定义基础病"
            clearable
            @keypress.enter="addCustomCondition"
          />
          <van-button type="primary" size="small" @click="addCustomCondition">
            添加
          </van-button>
        </div>

        <van-field
          v-model="form.allergies"
          name="allergies"
          label="过敏史"
          placeholder="选填，如：青霉素过敏"
          clearable
        />

        <van-field
          v-model="form.notes"
          name="notes"
          label="备注"
          placeholder="选填，特殊护理注意事项"
          type="textarea"
          rows="3"
          clearable
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit">
          {{ isEdit ? '保存修改' : '添加患者' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.patient-form-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.form {
  padding-bottom: 32px;
}

.condition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px 12px;
}

.cond-tag {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
}

.custom-condition-row {
  display: flex;
  align-items: center;
  padding-right: 16px;
}
</style>
