import { z } from 'zod'
import { addHistory } from '../utils/historyStore'
import { getAuthUser } from '../utils/auth'

const bodySchema = z.object({
  deviceId: z.string().min(8).max(128),
  platform: z.enum(['xiaohongshu', 'douyin']),
  tone: z.enum(['viral', 'professional', 'chatty']),
  goal: z.enum(['growth', 'engagement', 'conversion', 'branding']).optional(),
  safetyLevel: z.enum(['safe', 'warn', 'block']).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  qualityStructure: z.number().min(0).max(100).optional(),
  qualityPublishability: z.number().min(0).max(100).optional(),
  qualityRepetition: z.number().min(0).max(100).optional(),
  industryName: z.string().optional(),
  sceneName: z.string().optional(),
  topic: z.string().min(1).max(500),
  content: z.string().min(1).max(8000),
  structured: z.object({
    titles: z.array(z.string()),
    cover: z.string(),
    body: z.string(),
    tags: z.array(z.string()),
    firstComments: z.array(z.string()),
    meta: z.string().optional(),
  }).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '历史记录参数无效' })
  }

  await addHistory({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    userId: user?.id,
    ...parsed.data,
  })

  return { ok: true }
})
