import { readJsonFile } from '../../utils/jsonStore'
import { getAnalyticsEvents } from '../../utils/analyticsStore'
import type { CloudHistoryItem } from '../../utils/historyStore'

type AnalyticsRow = {
  event: string
  sessionId: string
  serverAt?: string
}

function toDayKey(v: string) {
  return new Date(v).toISOString().slice(0, 10)
}

function getRecentDays(days: number) {
  const list: string[] = []
  const now = new Date()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    list.push(toDayKey(d.toISOString()))
  }
  return new Set(list)
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const query = getQuery(event)
  const key = typeof query.key === 'string' ? query.key : ''
  if (runtimeConfig.opsKey && key !== runtimeConfig.opsKey) {
    throw createError({ statusCode: 403, statusMessage: '无访问权限' })
  }

  const daySet = getRecentDays(7)
  const history = await readJsonFile<CloudHistoryItem[]>('history.json', [])
  const weekHistory = history.filter(item => daySet.has(toDayKey(item.createdAt)))

  const analyticsRaw = await getAnalyticsEvents()
  const analytics: AnalyticsRow[] = analyticsRaw as AnalyticsRow[]
  const weekAnalytics = analytics.filter(item => daySet.has(toDayKey(item.serverAt || new Date().toISOString())))

  const starts = weekAnalytics.filter(item => item.event === 'generate_start').length
  const success = weekAnalytics.filter(item => item.event === 'generate_success').length
  const errors = weekAnalytics.filter(item => item.event === 'generate_error').length
  const successRate = starts > 0 ? success / starts : 0

  const platformCount = weekHistory.reduce<Record<string, number>>((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1
    return acc
  }, {})
  const toneCount = weekHistory.reduce<Record<string, number>>((acc, item) => {
    acc[item.tone] = (acc[item.tone] || 0) + 1
    return acc
  }, {})

  const topPlatform = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'
  const topTone = Object.entries(toneCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'

  const highlights = [
    `近7天共发起 ${starts} 次生成，成功 ${success} 次，成功率 ${(successRate * 100).toFixed(1)}%。`,
    `高频平台：${topPlatform === 'xiaohongshu' ? '小红书' : topPlatform === 'douyin' ? '抖音' : topPlatform}，高频语气：${topTone}。`,
    errors > 0
      ? `检测到 ${errors} 次失败，请优先排查模型可用性与限流阈值。`
      : '本周未出现生成失败，稳定性表现良好。',
  ]

  const actions = [
    '将高成功率模板固定在风格页前两位，并持续 A/B 测试标题结构。',
    '对失败请求增加错误码分层统计，区分模型错误/网络错误/风控拦截。',
    '按平台拆分成功率，针对低表现平台迭代提示词与输出格式。',
  ]

  return {
    period: 'last_7_days',
    metrics: {
      starts,
      success,
      errors,
      successRate: Number(successRate.toFixed(4)),
    },
    highlights,
    actions,
  }
})
