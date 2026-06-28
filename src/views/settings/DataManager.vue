<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import 'vant/es/action-sheet/style'
import { exportEncrypted, exportExcel, importEncrypted } from '../../utils/dataManager'
import { db } from '../../db'

const router = useRouter()

const exportPassword = ref('')
const confirmPassword = ref('')
const showExportPwd = ref(false)

const importPassword = ref('')
const showImportPwd = ref(false)
const importFile = ref<File | null>(null)
const importFileName = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInput.value?.click()
}

// ActionSheet
const showConflictSheet = ref(false)
const conflictResolve = ref<((mode: string | null) => void) | null>(null)
const conflictInfo = ref('')

function pickConflictMode(): Promise<string | null> {
  return new Promise((resolve) => {
    conflictResolve.value = resolve
    showConflictSheet.value = true
  })
}

function onConflictSelect(action: { name: string } | null) {
  showConflictSheet.value = false
  conflictResolve.value?.(action?.name ?? null)
}

// ---------- 加密导出 ----------
async function handleExportEncrypted() {
  if (!exportPassword.value) { showToast('请输入密码'); return }
  if (exportPassword.value.length < 6) { showToast('密码至少 6 位'); return }
  if (exportPassword.value !== confirmPassword.value) { showToast('两次密码不一致'); return }

  showLoadingToast({ message: '导出中...', forbidClick: true })
  try {
    await exportEncrypted(exportPassword.value)
    closeToast()
    showSuccessToast('导出成功')
    showExportPwd.value = false
    exportPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    closeToast()
    showFailToast('导出失败')
    console.error(e)
  }
}

// ---------- Excel 导出 ----------
async function handleExportExcel() {
  showLoadingToast({ message: '生成中...', forbidClick: true })
  try {
    await exportExcel()
    closeToast()
    showSuccessToast('导出成功')
  } catch (e) {
    closeToast()
    showFailToast('导出失败')
    console.error(e)
  }
}

// ---------- 导入 ----------
function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  importFile.value = file
  importFileName.value = file.name
  showImportPwd.value = true
}

async function handleImport() {
  if (!importFile.value) { showToast('请选择文件'); return }
  if (!importPassword.value) { showToast('请输入密码'); return }

  showLoadingToast({ message: '解密中...', forbidClick: true })
  let data: any
  try {
    data = await importEncrypted(importFile.value, importPassword.value)
    closeToast()
  } catch {
    closeToast()
    showFailToast('解密失败，请检查密码或文件')
    return
  }

  if (!data.schemaVersion || data.schemaVersion < 1) {
    showFailToast('数据格式不兼容')
    return
  }

  const patientCount = data.data?.patient?.length ?? 0
  const doseCount = data.data?.doseRecord?.length ?? 0
  const vitalsCount = data.data?.vitalsRecord?.length ?? 0

  conflictInfo.value = `检测到 ${patientCount} 位患者、${doseCount} 条用药记录、${vitalsCount} 条体征记录`
  const mode = await pickConflictMode()
  if (!mode) return

  showLoadingToast({ message: '导入中...', forbidClick: true })
  try {
    await writeImportData(data, mode)
    closeToast()
    showSuccessToast('导入完成')
    showImportPwd.value = false
    importPassword.value = ''
    importFile.value = null
    importFileName.value = ''
  } catch (e) {
    closeToast()
    showFailToast('导入失败')
    console.error(e)
  }
}

async function writeImportData(data: any, mode: string) {
  const { patient, medicine, doseRecord, vitalsRecord } = data.data || {}

  if (mode === '覆盖导入（清空现有数据）') {
    await db.delete()
    await db.open()
    // 重新创建后再写入
    await writeAll(patient, medicine, doseRecord, vitalsRecord)
  } else if (mode === '跳过冲突（仅新增）') {
    // 跳过冲突：新记录 ID 已存在则跳过
    await writeWithSkip(patient, medicine, doseRecord, vitalsRecord)
  } else {
    // 合并：逐条覆盖
    await writeAll(patient, medicine, doseRecord, vitalsRecord)
  }
}

async function writeAll(
  patient: any[], medicine: any[], doseRecord: any[], vitalsRecord: any[],
) {
  if (patient) {
    for (const p of patient) await db.patient.put(p)
  }
  if (medicine) {
    for (const m of medicine) await db.medicine.put(m)
  }
  if (doseRecord) {
    for (const d of doseRecord) await db.doseRecord.put(d)
  }
  if (vitalsRecord) {
    for (const v of vitalsRecord) await db.vitalsRecord.put(v)
  }
}

async function writeWithSkip(
  patient: any[], medicine: any[], doseRecord: any[], vitalsRecord: any[],
) {
  if (patient) {
    for (const p of patient) {
      const exists = await db.patient.get(p.id)
      if (!exists) await db.patient.add(p)
    }
  }
  if (medicine) {
    for (const m of medicine) {
      const exists = await db.medicine.get(m.id)
      if (!exists) await db.medicine.add(m)
    }
  }
  if (doseRecord) {
    for (const d of doseRecord) {
      const exists = await db.doseRecord.get(d.id)
      if (!exists) await db.doseRecord.add(d)
    }
  }
  if (vitalsRecord) {
    for (const v of vitalsRecord) {
      const exists = await db.vitalsRecord.get(v.id)
      if (!exists) await db.vitalsRecord.add(v)
    }
  }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="数据管理" left-arrow @click-left="router.back()" />

    <div class="content">
      <!-- 备份提醒 -->
      <div class="backup-alert">
        <van-icon name="bullhorn-o" color="#ee0a24" size="20" />
        <div class="backup-alert-text">
          <strong>定期导出备份</strong>
          <p>数据仅保存在设备本地，清除浏览器缓存将导致数据丢失。建议每周至少导出一次。</p>
        </div>
      </div>

      <!-- 加密导出 -->
      <van-cell-group title="加密导出（.med.json）">
        <van-cell title="导出加密数据包" label="AES-GCM 加密，需密码解密后导入" />
        <van-field
          v-if="showExportPwd"
          v-model="exportPassword"
          type="password"
          label="设置密码"
          placeholder="至少 6 位"
          autocomplete="new-password"
        />
        <van-field
          v-if="showExportPwd"
          v-model="confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再次输入"
          autocomplete="new-password"
        />
        <div class="btn-row">
          <van-button
            v-if="!showExportPwd"
            type="primary"
            size="small"
            @click="showExportPwd = true"
          >
            加密导出
          </van-button>
          <template v-if="showExportPwd">
            <van-button type="primary" size="small" @click="handleExportEncrypted">
              确认导出
            </van-button>
            <van-button size="small" @click="showExportPwd = false">
              取消
            </van-button>
          </template>
        </div>
      </van-cell-group>

      <!-- Excel 导出 -->
      <van-cell-group title="Excel 导出（.xlsx）">
        <van-cell
          title="导出 Excel 表格"
          label="Sheet1 患者信息 / Sheet2 体征记录 / Sheet3 用药记录"
        />
        <div class="btn-row">
          <van-button type="success" size="small" @click="handleExportExcel">
            导出 Excel
          </van-button>
        </div>
      </van-cell-group>

      <!-- 导入 -->
      <van-cell-group title="导入加密数据">
        <van-cell title="选择 .med.json 文件" :label="importFileName || 'AES-GCM 加密格式'" />
        <div class="btn-row">
          <van-button type="warning" size="small" @click="triggerFileInput">
            选择文件
          </van-button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept=".json,.med.json"
          style="display:none"
          @change="onFileSelected"
        />
        <van-field
          v-if="showImportPwd"
          v-model="importPassword"
          type="password"
          label="解密密码"
          placeholder="输入导出时设置的密码"
          autocomplete="off"
        />
        <div class="btn-row" v-if="showImportPwd">
          <van-button type="primary" size="small" @click="handleImport">
            开始导入
          </van-button>
          <van-button size="small" @click="showImportPwd = false; importFile = null; importFileName = ''">
            取消
          </van-button>
        </div>
      </van-cell-group>

      <!-- 提示 -->
      <div class="tips">
        <van-icon name="info-o" color="#1989fa" size="14" />
        <span>数据仅保存在本地浏览器，定期导出备份以防丢失</span>
      </div>
    </div>

    <!-- 冲突模式选择 -->
    <van-action-sheet
      v-model:show="showConflictSheet"
      :title="conflictInfo"
      :actions="[
        { name: '覆盖导入（清空现有数据）' },
        { name: '跳过冲突（仅新增）' },
        { name: '合并导入（逐条覆盖）' },
      ]"
      cancel-text="取消"
      @select="onConflictSelect"
      @cancel="onConflictSelect(null)"
      @close="onConflictSelect(null)"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding-bottom: 32px;
}
.btn-row {
  display: flex;
  gap: 8px;
  padding: 8px 16px 16px;
}
.tips {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px;
  font-size: 12px;
  color: #969799;
}
.backup-alert {
  display: flex;
  gap: 10px;
  background: #fff;
  margin: 8px 16px;
  padding: 14px;
  border-radius: 8px;
  border-left: 3px solid #ee0a24;
}
.backup-alert-text strong {
  font-size: 14px;
  color: #323233;
}
.backup-alert-text p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}
</style>
