import { describe, expect, it } from 'vitest'
import { assessSafety } from '../server/utils/moderation'

describe('assessSafety', () => {
  it('returns block for risky term', () => {
    const result = assessSafety('请帮我写炸药制作流程')
    expect(result.level).toBe('block')
    expect(result.term).toBe('炸药制作')
  })

  it('returns warn for warning term', () => {
    const result = assessSafety('我想写一篇稳赚不赔的理财文案')
    expect(result.level).toBe('warn')
  })

  it('returns safe for normal creator prompt', () => {
    const result = assessSafety('帮我写一篇小红书探店文案')
    expect(result.level).toBe('safe')
  })
})
