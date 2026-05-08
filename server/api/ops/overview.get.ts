import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readJsonFile } from '../../utils/jsonStore'
import type { CloudHistoryItem } from '../../utils/historyStore'

type AnalyticsRow = {
  event: string
  sessionId: string
  serverAt?: string
  payload?: {
    errorCode?: string
    safetyLevel?: 'safe' | 'warn' | 'block'
  }
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
  const platform = typeof query.platform === 'string' ? query.platform : ''
  const tone = typeof query.tone === 'string' ? query.tone : ''
  const userType = typeof query.userType === 'string' ? query.userType : ''
  const userId = typeof query.userId === 'string' ? query.userId.trim() : ''
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : ''
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : ''
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)))
  const historySort = query.historySort === 'asc' ? 'asc' : 'desc'

  if (runtimeConfig.opsKey && key !== runtimeConfig.opsKey) {
    throw createError({ statusCode: 403, statusMessage: '无访问权限' })
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
  const deviceCount = new Set(history.map(item => item.deviceId)).size

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

  const funnel = Array.from(map.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .slice(0, 7)
    .map(([date, v]) => ({
      date,
      sessions: v.sessions.size,
      generate_start: v.generate_start,
      generate_success: v.generate_success,
      generate_error: v.generate_error,
      success_rate: v.generate_start > 0 ? Number((v.generate_success / v.generate_start).toFixed(4)) : 0,
    }))

  const totalGenerateStart = funnel.reduce((sum, row) => sum + row.generate_start, 0)
  const totalGenerateSuccess = funnel.reduce((sum, row) => sum + row.generate_success, 0)
  const totalGenerateError = funnel.reduce((sum, row) => sum + row.generate_error, 0)
  const totalSessions = new Set(analytics.map(item => item.sessionId)).size
  const errorCodeMap = analytics
    .filter(item => item.event === 'generate_error')
    .reduce<Record<string, number>>((acc, item) => {
      const code = item.payload?.errorCode || 'E_UNKNOWN'
      acc[code] = (acc[code] || 0) + 1
      return acc
    }, {})
  const topErrorCode = Object.entries(errorCodeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  const topErrorCount = Object.entries(errorCodeMap).sort((a, b) => b[1] - a[1])[0]?.[1] || 0
  const safetyWarnEvents = analytics.filter(item => item.event === 'generate_success' && item.payload?.safetyLevel === 'warn').length

  const errorByDayMap = analytics
    .filter(item => item.event === 'generate_error')
    .reduce<Record<string, Record<string, number>>>((acc, item) => {
      const day = toDayKey(item.serverAt || new Date().toISOString())
      const code = item.payload?.errorCode || 'E_UNKNOWN'
      acc[day] = acc[day] || {}
      acc[day][code] = (acc[day][code] || 0) + 1
      return acc
    }, {})

  const errorByPlatformMap = analytics
    .filter(item => item.event === 'generate_error')
    .reduce<Record<string, Record<string, number>>>((acc, item) => {
      const platformKey = (item.payload as any)?.platform || 'unknown'
      const code = item.payload?.errorCode || 'E_UNKNOWN'
      acc[platformKey] = acc[platformKey] || {}
      acc[platformKey][code] = (acc[platformKey][code] || 0) + 1
      return acc
    }, {})

  const scored = history.filter(item => typeof item.qualityScore === 'number')
  const sortedScores = scored.map(item => item.qualityScore || 0).sort((a, b) => a - b)
  const p50QualityScore = sortedScores.length > 0 ? sortedScores[Math.floor((sortedScores.length - 1) * 0.5)] : 0
  const p90QualityScore = sortedScores.length > 0 ? sortedScores[Math.floor((sortedScores.length - 1) * 0.9)] : 0
  const avgQualityScore = scored.length > 0
    ? Number((scored.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / scored.length).toFixed(1))
    : 0
  const warnCount = history.filter(item => item.safetyLevel === 'warn').length

  const qualityTrendMap = history.reduce<Record<string, { structure: number[], publishability: number[], repetition: number[] }>>((acc, item) => {
    const day = toDayKey(item.createdAt)
    acc[day] = acc[day] || { structure: [], publishability: [], repetition: [] }
    if (typeof item.qualityStructure === 'number') acc[day].structure.push(item.qualityStructure)
    if (typeof item.qualityPublishability === 'number') acc[day].publishability.push(item.qualityPublishability)
    if (typeof item.qualityRepetition === 'number') acc[day].repetition.push(item.qualityRepetition)
    return acc
  }, {})

  const qualityTrend = Object.entries(qualityTrendMap)
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .slice(0, 7)
    .map(([date, v]) => {
      const avg = (arr: number[]) => (arr.length ? Number((arr.reduce((s, n) => s + n, 0) / arr.length).toFixed(1)) : 0)
      return {
        date,
        structure: avg(v.structure),
        publishability: avg(v.publishability),
        repetition: avg(v.repetition),
      }
    })

  return {
    summary: {
      history_total: history.length,
      devices_total: deviceCount,
      events_total: analytics.length,
      today_generate_start: funnel[0]?.generate_start ?? 0,
      today_generate_success: funnel[0]?.generate_success ?? 0,
      success_rate_total: totalGenerateStart > 0 ? Number((totalGenerateSuccess / totalGenerateStart).toFixed(4)) : 0,
      error_rate_total: totalGenerateStart > 0 ? Number((totalGenerateError / totalGenerateStart).toFixed(4)) : 0,
      avg_generate_per_session: totalSessions > 0 ? Number((totalGenerateStart / totalSessions).toFixed(2)) : 0,
      avg_quality_score: avgQualityScore,
      p50_quality_score: p50QualityScore,
      p90_quality_score: p90QualityScore,
      warning_count: warnCount,
      safety_warn_events: safetyWarnEvents,
      top_error_code: topErrorCode,
      top_error_count: topErrorCount,
    },
    funnel,
    recent_history: history
      .sort((a, b) => {
        if (historySort === 'asc') return a.createdAt > b.createdAt ? 1 : -1
        return a.createdAt < b.createdAt ? 1 : -1
      })
      .slice((page - 1) * pageSize, page * pageSize),
    pagination: {
      page,
      pageSize,
      total: history.length,
      totalPages: Math.max(1, Math.ceil(history.length / pageSize)),
    },
    error_by_day: Object.entries(errorByDayMap)
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .slice(0, 7)
      .map(([date, codes]) => ({ date, codes })),
    error_by_platform: Object.entries(errorByPlatformMap).map(([platformName, codes]) => ({ platform: platformName, codes })),
    quality_trend: qualityTrend,
  }
})
