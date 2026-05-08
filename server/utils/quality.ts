export interface QualityScore {
  overall: number
  structure: number
  publishability: number
  repetition: number
}

export interface AIQualityScore {
  overall: number
  hookStrength: number
  platformFit: number
  authenticity: number
  engagement: number
  suggestions: string[]
}

export function scoreContentQuality(content: string): QualityScore {
  const text = content.trim()
  const length = text.length
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

  const structure = Math.min(100, Math.round((lines.length >= 6 ? 70 : lines.length * 10) + (text.includes('标题') ? 15 : 0) + (text.includes('#') ? 15 : 0)))
  const publishability = Math.min(100, Math.round((length >= 300 ? 60 : length / 5) + (/[！？。]/.test(text) ? 20 : 0) + (text.includes('http') ? -15 : 20)))

  const words = text.split(/\s+/).filter(Boolean)
  const uniqueWords = new Set(words)
  const uniqRatio = words.length > 0 ? uniqueWords.size / words.length : 1
  const repetition = Math.max(0, Math.min(100, Math.round(uniqRatio * 100)))

  const overall = Math.round(structure * 0.35 + publishability * 0.4 + repetition * 0.25)
  return { overall, structure, publishability, repetition }
}

/**
 * LLM 深度质量评估
 * 返回多维度评分 + 可操作的改进建议
 */
export async function scoreContentQualityLLM(
  content: string,
  platform?: string,
): Promise<AIQualityScore> {
  const runtimeConfig = useRuntimeConfig()
  const apiKey = process.env.OPENAI_API_KEY || runtimeConfig.openaiApiKey
  const baseURL = process.env.BASE_URL || runtimeConfig.openaiBaseUrl || 'https://api.xiaomimimo.com/v1'
  const model = process.env.OPENAI_MODEL || runtimeConfig.openaiModel || 'mimo-v2.5-pro'

  if (!apiKey) {
    throw new Error('API key not configured')
  }

  const platformName = platform === 'douyin' ? '抖音短视频' : '小红书图文'

  const evalPrompt = `你是一位资深自媒体内容审核专家。请对以下${platformName}内容进行专业评估。

【评估维度】（每项0-100分）
1. hookStrength - 开头钩子力：前1-2句是否能抓住眼球？是否有悬念/痛点/反转？
2. platformFit - 平台适配度：排版、语气、标签使用是否符合${platformName}的原生风格？
3. authenticity - 真实感：内容是否像真人写的？有没有明显的AI味、广告感或模板感？
4. engagement - 互动潜力：是否能引发评论/收藏/分享？结尾引导是否自然？

【改进建议】
给出2-3条具体可操作的改进建议，每条建议必须是具体的修改动作（如"把第二段的'非常好吃'改为'一口咬下去汁水直接飙出来'"），而非泛泛的建议。

请严格以 JSON 格式输出，不要输出任何其他内容：
{"overall":分数,"hookStrength":分数,"platformFit":分数,"authenticity":分数,"engagement":分数,"suggestions":["建议1","建议2"]}`

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: evalPrompt },
        { role: 'user', content: `\n\n---\n以下是待评估内容：\n\n${content.slice(0, 4000)}` },
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM eval failed: ${response.status}`)
  }

  const data = await response.json() as any
  const text = data.choices?.[0]?.message?.content || '{}'

  try {
    const parsed = JSON.parse(text)
    return {
      overall: Math.min(100, Math.max(0, parsed.overall || 0)),
      hookStrength: Math.min(100, Math.max(0, parsed.hookStrength || 0)),
      platformFit: Math.min(100, Math.max(0, parsed.platformFit || 0)),
      authenticity: Math.min(100, Math.max(0, parsed.authenticity || 0)),
      engagement: Math.min(100, Math.max(0, parsed.engagement || 0)),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
    }
  } catch {
    throw new Error('Failed to parse LLM eval response')
  }
}
