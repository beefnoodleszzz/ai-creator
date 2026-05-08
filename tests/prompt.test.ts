import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildUserPrompt } from '../server/utils/prompt'

describe('prompt builders', () => {
  it('contains platform specific hints', () => {
    const systemPrompt = buildSystemPrompt({
      platform: 'xiaohongshu',
      tone: 'viral',
      topic: '测试主题',
    })
    expect(systemPrompt).toContain('小红书')
    expect(systemPrompt).toContain('吸睛爆款')
  })

  it('injects custom prompt into user prompt', () => {
    const userPrompt = buildUserPrompt({
      platform: 'douyin',
      tone: 'chatty',
      topic: '测试主题',
      customPrompt: '要强调门店名',
    })
    expect(userPrompt).toContain('要强调门店名')
    expect(userPrompt).toContain('抖音')
  })
})
