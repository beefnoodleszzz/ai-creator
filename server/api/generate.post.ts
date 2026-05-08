import { z } from 'zod'
import { $fetch } from 'ofetch'
import { buildSystemPrompt, buildUserPrompt } from '../utils/prompt'
import { checkRateLimit } from '../utils/rateLimit'
import { assessSafety } from '../utils/moderation'

const generateSchema = z.object({
  platform: z.enum(['xiaohongshu', 'douyin']).default('xiaohongshu'),
  tone: z.enum(['viral', 'professional', 'chatty']).default('viral'),
  goal: z.enum(['growth', 'engagement', 'conversion', 'branding']).default('growth'),
  topic: z.string().trim().min(2).max(500).optional(),
  industry: z.string().optional(),
  scene: z.string().optional(),
  customPrompt: z.string().optional(),
  keywords: z.string().max(300).optional(),
  bannedWords: z.string().max(300).optional(),
  brandVoice: z.string().max(300).optional(),
  audience: z.string().max(300).optional(),
}).refine(data => data.topic, {
  message: '请选择一个场景',
  path: ['topic'],
})

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const limitResult = checkRateLimit(ip, 20, 60_000)
  if (!limitResult.ok) {
    setHeader(event, 'X-Error-Code', 'E_RATE_LIMIT')
    setResponseStatus(event, 429)
    throw createError({
      statusCode: 429,
      statusMessage: '请求过于频繁，请稍后再试',
    })
  }

  const body = await readBody(event)
  const parsed = generateSchema.safeParse(body)

  if (!parsed.success) {
    setHeader(event, 'X-Error-Code', 'E_BAD_REQUEST')
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? '请求参数无效',
    })
  }

  const moderationInput = [
    parsed.data.topic ?? '',
    parsed.data.customPrompt ?? '',
    parsed.data.scene ?? '',
    parsed.data.keywords ?? '',
    parsed.data.bannedWords ?? '',
    parsed.data.brandVoice ?? '',
    parsed.data.audience ?? '',
  ].join('\n')

  const safety = assessSafety(moderationInput)
  if (safety.level === 'block') {
    setHeader(event, 'X-Error-Code', 'E_SAFETY_BLOCK')
    throw createError({
      statusCode: 400,
      statusMessage: `请求包含高风险内容：${safety.term}`,
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const apiKey = process.env.OPENAI_API_KEY || runtimeConfig.openaiApiKey
  const baseURL = process.env.BASE_URL || runtimeConfig.openaiBaseUrl || 'https://api.xiaomimimo.com/v1'
  const model = process.env.OPENAI_MODEL || runtimeConfig.openaiModel || 'mimo-v2.5-pro'
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || runtimeConfig.openaiFallbackModel || model

  if (!apiKey) {
    setHeader(event, 'X-Error-Code', 'E_API_KEY_MISSING')
    throw createError({
      statusCode: 500,
      statusMessage: '服务端未配置 OPENAI_API_KEY',
    })
  }

  const payload = {
    platform: parsed.data.platform,
    tone: parsed.data.tone,
    goal: parsed.data.goal,
    topic: parsed.data.topic || '',
    industry: parsed.data.industry,
    scene: parsed.data.scene,
    customPrompt: parsed.data.customPrompt,
    keywords: parsed.data.keywords,
    bannedWords: parsed.data.bannedWords,
    brandVoice: parsed.data.brandVoice,
    audience: parsed.data.audience,
  }

  const systemPrompt = buildSystemPrompt(payload)
  const userPrompt = buildUserPrompt(payload)

  async function requestStream(targetModel: string, temperature: number) {
    return await $fetch.raw(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 3000,
        temperature,
        top_p: 0.95,
        stream: true,
      }),
      responseType: 'stream',
    })
  }

  try {
    let response
    try {
      response = await requestStream(model, 0.8)
    } catch {
      response = await requestStream(fallbackModel, 0.65)
    }

    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
      'X-Safety-Level': safety.level,
      'X-Safety-Term': safety.term || '',
    })

    const reader = response.body?.getReader()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  controller.close()
                  return
                }

                try {
                  const json = JSON.parse(data)
                  const choice = json.choices?.[0]
                  const delta = choice?.delta?.content
                  const fallback = choice?.message?.content
                  const textChunk = typeof delta === 'string'
                    ? delta
                    : typeof fallback === 'string'
                      ? fallback
                      : ''

                  if (textChunk) {
                    controller.enqueue(encoder.encode(textChunk))
                  }
                } catch {
                  // 跳过解析错误
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: any) {
    console.error('MiMo API Error:', error.message)
    setHeader(event, 'X-Error-Code', 'E_UPSTREAM')
    throw createError({
      statusCode: 500,
      statusMessage: `API 调用失败: ${error.message}`,
    })
  }
})
