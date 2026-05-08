import { getAnalyticsEvents } from '../../utils/analyticsStore'

type EventRow = {
  event: string
  sessionId: string
  serverAt?: string
}

function toDayKey(v: string) {
  return new Date(v).toISOString().slice(0, 10)
}

export default defineEventHandler(async () => {
  const rawEvents = await getAnalyticsEvents()
  const rows: EventRow[] = rawEvents as EventRow[]

  const map = new Map<string, { sessions: Set<string>, step_change: number, generate_start: number, generate_success: number, generate_error: number }>()

  for (const row of rows) {
    const date = toDayKey(row.serverAt || new Date().toISOString())
    const current = map.get(date) ?? {
      sessions: new Set<string>(),
      step_change: 0,
      generate_start: 0,
      generate_success: 0,
      generate_error: 0,
    }

    current.sessions.add(row.sessionId)
    if (row.event === 'step_change') current.step_change += 1
    if (row.event === 'generate_start') current.generate_start += 1
    if (row.event === 'generate_success') current.generate_success += 1
    if (row.event === 'generate_error') current.generate_error += 1
    map.set(date, current)
  }

  const days = Array.from(map.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .slice(0, 14)
    .map(([date, v]) => ({
      date,
      sessions: v.sessions.size,
      step_change: v.step_change,
      generate_start: v.generate_start,
      generate_success: v.generate_success,
      generate_error: v.generate_error,
      success_rate: v.generate_start > 0 ? Number((v.generate_success / v.generate_start).toFixed(4)) : 0,
    }))

  return { days }
})
