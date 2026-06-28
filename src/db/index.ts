import Dexie, { type EntityTable } from 'dexie'

export type { Medicine, DoseRecord, VitalsRecord } from './types'
import type { Medicine, DoseRecord, VitalsRecord } from './types'

export interface Patient {
  id: string
  name: string
  gender: 'male' | 'female'
  age: number
  phone?: string
  conditions: string[]
  allergies?: string
  notes?: string
  hasReminder?: boolean
  createdAt: number
}

const db = new Dexie('HealthTracker') as Dexie & {
  medicine: EntityTable<Medicine, 'id'>
  doseRecord: EntityTable<DoseRecord, 'id'>
  vitalsRecord: EntityTable<VitalsRecord, 'id'>
  patient: EntityTable<Patient, 'id'>
}

db.version(2).stores({
  medicine: 'id, name, category, createdAt',
  doseRecord: 'id, medicineId, scheduledTime, status',
  vitalsRecord: 'id, patientId, [patientId+date], date',
  patient: 'id, name, createdAt',
})

export { db }
