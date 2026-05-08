import { z } from 'zod'
import { scoreContentQuality, scoreContentQualityLLM } from '../utils/quality'

const bodySchema = z.object({
  content: z.string().min(1).max(20000),
  platform: z.enum(['xiaohongshu', 'douyin']).optional(),
  useAI: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '质量评分参数无效' })
  }

  // 基础规则评分（快速，始终返回）
  const baseScore = scoreContentQuality(parsed.data.content)

  // LLM 深度评估（可选）
  if (parsed.data.useAI) {
    try {
      const aiResult = await scoreContentQualityLLM(parsed.data.content, parsed.data.platform)
      return {
        score: baseScore,
        aiScore: aiResult,
      }
    } catch {
      // LLM 评估失败时降级到规则评分
      return { score: baseScore }
    }
  }

  return { score: baseScore }
})
