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

export const COMMON_CONDITIONS = [
  '高血压',
  '糖尿病',
  '高血脂',
  '冠心病',
  '脑卒中',
  '慢性肾病',
  '慢阻肺',
  '阿尔茨海默',
  '帕金森',
  '骨质疏松',
  '类风湿',
  '甲亢',
  '甲减',
  '痛风',
  '贫血',
  '肝炎',
  '胃炎',
  '失眠',
  '焦虑',
  '抑郁',
]
