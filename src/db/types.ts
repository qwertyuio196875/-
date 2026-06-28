export interface Medicine {
  id: string
  name: string
  dose: string
  frequency: string
  reminderTimes: string[]
  category: string
  notes?: string
  createdAt: number
  schemaVersion: number
}

export interface DoseRecord {
  id: string
  medicineId: string
  scheduledTime: number
  actualTime?: number
  status: 'taken' | 'skipped' | 'delayed'
  note?: string
}

export interface VitalsRecord {
  id: string
  patientId: string
  date: string
  systolic: number
  diastolic: number
  heartRate: number
  weight: number
  notes?: string
}
