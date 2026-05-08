import { z } from 'zod'
import { checkRateLimit } from '../utils/rateLimit'
import { persistAnalyticsEvent } from '../utils/analyticsStore'

const analyticsSchema = z.object({
  event: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).default({}),
  sessionId: z.string().min(8).max(128),
  path: z.string().max(256).optional(),
  ts: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const limitResult = checkRateLimit(`analytics:${ip}`, 120, 60_000)

  if (!limitResult.ok) {
    throw createError({
      statusCode: 429,
      statusMessage: '埋点请求过于频繁',
    })
  }

  const body = await readBody(event)
  const parsed = analyticsSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '埋点参数无效',
    })
  }

  const eventData = {
    ...parsed.data,
    ip,
    serverAt: new Date().toISOString(),
  }

  await persistAnalyticsEvent(eventData)

  return { ok: true }
})
