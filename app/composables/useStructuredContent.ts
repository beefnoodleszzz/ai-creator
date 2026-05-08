/**
 * 解析 LLM 输出中的结构化「发布成品包」
 * 使用 ===TAG=== / ===END_TAG=== 分隔标记
 */

import type { StructuredContent } from '~/types/creator'

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
  }

  if (!raw) return result

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

  // 降级：如果没解析到 body，用原始内容
  if (!result.body && raw) {
    const stripped = raw.replace(/===\w+===[\s\S]*?===END_\w+===/g, '').trim()
    result.body = stripped || raw
  }

  return result
}

/**
 * Composable：实时解析流式内容中的结构化部分
 */
export function useStructuredContent(content: Ref<string>) {
  const structured = computed(() => parseStructuredContent(content.value))

  const hasStructure = computed(() =>
    structured.value.titles.length > 0
    || structured.value.tags.length > 0
    || structured.value.firstComments.length > 0
  )

  /** 渲染正文（去除标记，保留纯内容） */
  const displayBody = computed(() => {
    // 如果解析到了结构化 body，直接用
    if (structured.value.body) return structured.value.body
    // 否则去掉所有标记显示原始内容
    return content.value.replace(/===\w+===[\s\S]*?===END_\w+===/g, '').trim()
  })

  /** 纯净全文（去除所有标记，用于兼容旧逻辑如复制全部） */
  const cleanContent = computed(() => {
    return content.value.replace(/===\w+===[\s\S]*?===END_\w+===/g, '').trim()
  })

  return {
    structured,
    hasStructure,
    displayBody,
    cleanContent,
  }
}
