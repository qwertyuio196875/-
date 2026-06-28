import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '../db'

export function useReminderPolling() {
  const pendingCount = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  async function getPendingForNotification() {
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

    const takenKeys = new Set(existingRecords.map((r) => `${r.medicineId}_${r.scheduledTime}`))

    const due: { name: string; time: string }[] = []
    for (const m of meds) {
      for (const t of m.reminderTimes) {
        const sched = new Date(`${today}T${t}:00`).getTime()
        if (t === now && !takenKeys.has(`${m.id}_${sched}`)) {
          due.push({ name: m.name, time: t })
        }
      }
    }
    return due
  }

  async function poll() {
    const due = await getPendingForNotification()
    for (const d of due) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('用药提醒', {
          body: `${d.name} · 计划时间 ${d.time}`,
          icon: '/favicon.svg',
        })
      }
    }
    pendingCount.value = await getTodayPendingCount()
  }

  async function getTodayPendingCount(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10)
    const meds = await db.medicine.toArray()
    const existingRecords = await db.doseRecord
      .where('scheduledTime')
      .between(
        new Date(`${today}T00:00:00`).getTime(),
        new Date(`${today}T23:59:59`).getTime(),
      )
      .toArray()

    const takenKeys = new Set(existingRecords.map((r) => `${r.medicineId}_${r.scheduledTime}`))
    let count = 0
    for (const m of meds) {
      for (const t of m.reminderTimes) {
        const sched = new Date(`${today}T${t}:00`).getTime()
        if (!takenKeys.has(`${m.id}_${sched}`)) count++
      }
    }
    return count
  }

  async function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  onMounted(async () => {
    await requestPermission()
    await poll()
    timer = setInterval(poll, 60000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { pendingCount, refresh: poll, getTodayPendingCount }
}
