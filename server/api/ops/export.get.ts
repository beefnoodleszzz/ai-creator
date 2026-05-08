import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readJsonFile } from '../../utils/jsonStore'
import type { CloudHistoryItem } from '../../utils/historyStore'

type AnalyticsRow = {
  event: string
  sessionId: string
  serverAt?: string
}

function toDayKey(v: string) {
  return new Date(v).toISOString().slice(0, 10)
}

function inDateRange(iso: string, dateFrom?: string, dateTo?: string) {
  const day = toDayKey(iso)
  if (dateFrom && day < dateFrom) return false
  if (dateTo && day > dateTo) return false
  return true
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const query = getQuery(event)
  const key = typeof query.key === 'string' ? query.key : ''
  const type = typeof query.type === 'string' ? query.type : 'history'
  const platform = typeof query.platform === 'string' ? query.platform : ''
  const tone = typeof query.tone === 'string' ? query.tone : ''
  const userType = typeof query.userType === 'string' ? query.userType : ''
  const userId = typeof query.userId === 'string' ? query.userId.trim() : ''
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : ''
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : ''

  if (runtimeConfig.opsKey && key !== runtimeConfig.opsKey) {
    throw createError({ statusCode: 403, statusMessage: '无访问权限' })
  }

  if (type === 'funnel') {
    const analyticsFile = resolve(process.cwd(), '.data/analytics.ndjson')
    let analytics: AnalyticsRow[] = []
    try {
      const raw = await readFile(analyticsFile, 'utf-8')
      analytics = raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as AnalyticsRow)
    } catch {
      analytics = []
    }

    if (dateFrom || dateTo) {
      analytics = analytics.filter(item => inDateRange(item.serverAt || new Date().toISOString(), dateFrom || undefined, dateTo || undefined))
    }

    const map = new Map<string, { sessions: Set<string>, generate_start: number, generate_success: number, generate_error: number }>()
    for (const row of analytics) {
      const day = toDayKey(row.serverAt || new Date().toISOString())
      const current = map.get(day) ?? {
        sessions: new Set<string>(),
        generate_start: 0,
        generate_success: 0,
        generate_error: 0,
      }
      current.sessions.add(row.sessionId)
      if (row.event === 'generate_start') current.generate_start += 1
      if (row.event === 'generate_success') current.generate_success += 1
      if (row.event === 'generate_error') current.generate_error += 1
      map.set(day, current)
    }

    const rows = Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(([date, v]) => {
        const successRate = v.generate_start > 0 ? (v.generate_success / v.generate_start) : 0
        return `${date},${v.sessions.size},${v.generate_start},${v.generate_success},${v.generate_error},${successRate.toFixed(4)}`
      })

    const csv = ['date,sessions,generate_start,generate_success,generate_error,success_rate', ...rows].join('\n')
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="ops-funnel.csv"')
    return csv
  }

  if (type === 'error-distribution') {
    const analyticsFile = resolve(process.cwd(), '.data/analytics.ndjson')
    let analytics: AnalyticsRow[] = []
    try {
      const raw = await readFile(analyticsFile, 'utf-8')
      analytics = raw.split('\n').filter(Boolean).map(line => JSON.parse(line) as AnalyticsRow)
    } catch {
      analytics = []
    }

    if (dateFrom || dateTo) {
      analytics = analytics.filter(item => inDateRange(item.serverAt || new Date().toISOString(), dateFrom || undefined, dateTo || undefined))
    }

    const rows = analytics
      .filter(item => item.event === 'generate_error')
      .map(item => {
        const day = toDayKey(item.serverAt || new Date().toISOString())
        const payload = (item as any).payload || {}
        const code = payload.errorCode || 'E_UNKNOWN'
        const platformName = payload.platform || 'unknown'
        return `${day},${platformName},${code},1`
      })

    const csv = ['date,platform,error_code,count', ...rows].join('\n')
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="ops-error-distribution.csv"')
    return csv
  }

  if (type === 'quality-trend') {
    const allHistory = await readJsonFile<CloudHistoryItem[]>('history.json', [])
    const history = allHistory.filter(item => {
      if (platform && item.platform !== platform) return false
      if (tone && item.tone !== tone) return false
      if (userType === 'logged' && !item.userId) return false
      if (userType === 'guest' && item.userId) return false
      if (userId && item.userId !== userId) return false
      if ((dateFrom || dateTo) && !inDateRange(item.createdAt, dateFrom || undefined, dateTo || undefined)) return false
      return true
    })

    const rows = history
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(item => {
        const structure = (item as any).qualityStructure ?? ''
        const publishability = (item as any).qualityPublishability ?? ''
        const repetition = (item as any).qualityRepetition ?? ''
        const overall = item.qualityScore ?? ''
        return `${item.createdAt},${item.platform},${item.tone},${structure},${publishability},${repetition},${overall}`
      })

    const csv = ['createdAt,platform,tone,quality_structure,quality_publishability,quality_repetition,quality_overall', ...rows].join('\n')
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="ops-quality-trend.csv"')
    return csv
  }

  const allHistory = await readJsonFile<CloudHistoryItem[]>('history.json', [])
  const history = allHistory.filter(item => {
    if (platform && item.platform !== platform) return false
    if (tone && item.tone !== tone) return false
    if (userType === 'logged' && !item.userId) return false
    if (userType === 'guest' && item.userId) return false
    if (userId && item.userId !== userId) return false
    if ((dateFrom || dateTo) && !inDateRange(item.createdAt, dateFrom || undefined, dateTo || undefined)) return false
    return true
  })

  const rows = history
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(item => {
      const escapedTopic = `"${item.topic.replaceAll('"', '""')}"`
      const escapedScene = `"${(item.sceneName || '').replaceAll('"', '""')}"`
      return `${item.createdAt},${item.platform},${item.tone},${escapedScene},${escapedTopic},${item.deviceId}`
    })
  const csv = ['createdAt,platform,tone,sceneName,topic,deviceId', ...rows].join('\n')
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="ops-history.csv"')
  return csv
})
