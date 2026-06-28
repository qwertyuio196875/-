import { db } from '../db'
import { encryptData, decryptData, type ExportData, type EncryptedPayload } from './crypto'

// xlsx 使用动态导入，见 exportExcel()

async function collectExportData(): Promise<ExportData> {
  const [patient, medicine, doseRecord, vitalsRecord] = await Promise.all([
    db.patient.toArray(),
    db.medicine.toArray(),
    db.doseRecord.toArray(),
    db.vitalsRecord.toArray(),
  ])
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    data: {
      patient: patient as unknown as Record<string, unknown>[],
      medicine: medicine as unknown as Record<string, unknown>[],
      doseRecord: doseRecord as unknown as Record<string, unknown>[],
      vitalsRecord: vitalsRecord as unknown as Record<string, unknown>[],
    },
  }
}

export async function exportEncrypted(password: string, filename: string = '健康数据') {
  const data = await collectExportData()
  const encrypted = await encryptData(data, password)
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, `${filename}.med.json`)
}

export async function importEncrypted(
  file: File,
  password: string,
): Promise<ExportData> {
  const text = await file.text()
  const payload: EncryptedPayload = JSON.parse(text)
  return decryptData(payload, password)
}

export async function exportExcel(filename: string = '健康数据') {
  const XLSX = await import('xlsx')
  const data = await collectExportData()

  const patients = data.data.patient.map((p: any) => ({
    '姓名': p.name,
    '性别': p.gender === 'male' ? '男' : '女',
    '年龄': p.age,
    '联系方式': p.phone ?? '',
    '基础病': Array.isArray(p.conditions) ? p.conditions.join('、') : '',
    '过敏史': p.allergies ?? '',
    '备注': p.notes ?? '',
    '创建时间': new Date(p.createdAt).toLocaleString('zh-CN'),
  }))

  const vitals = data.data.vitalsRecord.map((v: any) => ({
    '患者ID': v.patientId,
    '日期': v.date,
    '收缩压(mmHg)': v.systolic,
    '舒张压(mmHg)': v.diastolic,
    '心跳(bpm)': v.heartRate,
    '体重(kg)': v.weight,
    '备注': v.notes ?? '',
  }))

  const doses = data.data.doseRecord.map((d: any) => ({
    '药品ID': d.medicineId,
    '计划时间': new Date(d.scheduledTime).toLocaleString('zh-CN'),
    '实际时间': d.actualTime ? new Date(d.actualTime).toLocaleString('zh-CN') : '',
    '状态': d.status === 'taken' ? '已服' : d.status === 'skipped' ? '跳过' : '延迟',
    '备注': d.note ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(patients)
  XLSX.utils.book_append_sheet(wb, ws1, '患者信息')
  const ws2 = XLSX.utils.json_to_sheet(vitals)
  XLSX.utils.book_append_sheet(wb, ws2, '体征记录')
  const ws3 = XLSX.utils.json_to_sheet(doses)
  XLSX.utils.book_append_sheet(wb, ws3, '用药记录')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  downloadBlob(blob, `${filename}.xlsx`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
