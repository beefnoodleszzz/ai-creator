/**
 * 从 LLM 流式输出中解析结构化的「发布成品包」
 * 使用 ===TAG=== / ===END_TAG=== 分隔标记
 */

export interface StructuredContent {
  titles: string[]
  cover: string
  body: string
  tags: string[]
  firstComments: string[]
  meta?: string // 抖音专属：时长/BGM
  /** 原始全文（用于兼容旧逻辑） */
  raw: string
}

const SECTION_REGEX = /===(\w+)===([\s\S]*?)===END_\1===/g

/**
 * 从完整文本中提取结构化内容
 */
export function parseStructuredContent(raw: string): StructuredContent {
  const result: StructuredContent = {
    titles: [],
    cover: '',
    body: '',
    tags: [],
    firstComments: [],
    raw,
  }

  const matches = raw.matchAll(SECTION_REGEX)

  for (const match of matches) {
    const tag = match[1]
    const content = match[2].trim()

    switch (tag) {
      case 'TITLE':
        result.titles = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'COVER':
        result.cover = content
        break
      case 'BODY':
        result.body = content
        break
      case 'TAGS':
        result.tags = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'FIRST_COMMENTS':
        result.firstComments = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'META':
        result.meta = content
        break
    }
  }

  // 降级处理：如果解析失败，用原始内容填充 body
  if (!result.body && raw) {
    // 尝试去掉所有标记，取剩余内容
    const stripped = raw.replace(/===\w+===[\s\S]*?===END_\w+===/g, '').trim()
    result.body = stripped || raw
  }

  return result
}

/**
 * 流式解析：检查当前缓冲区是否包含完整的 section
 * 返回已解析的部分和剩余未完成的缓冲区
 */
export function parseStreamChunk(buffer: string): {
  parsed: Partial<StructuredContent>
  remaining: string
} {
  const result: Partial<StructuredContent> = {}
  let lastEnd = 0

  const matches = buffer.matchAll(SECTION_REGEX)

  for (const match of matches) {
    const tag = match[1]
    const content = match[2].trim()
    const endIdx = (match.index ?? 0) + match[0].length

    switch (tag) {
      case 'TITLE':
        result.titles = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'COVER':
        result.cover = content
        break
      case 'BODY':
        result.body = content
        break
      case 'TAGS':
        result.tags = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'FIRST_COMMENTS':
        result.firstComments = content.split('\n').map(l => l.trim()).filter(Boolean)
        break
      case 'META':
        result.meta = content
        break
    }

    lastEnd = endIdx
  }

  return {
    parsed: result,
    remaining: buffer.slice(lastEnd),
  }
}
