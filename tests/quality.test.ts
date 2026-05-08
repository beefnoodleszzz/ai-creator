import { describe, expect, it } from 'vitest'
import { scoreContentQuality } from '../server/utils/quality'

describe('scoreContentQuality', () => {
  it('returns bounded score fields', () => {
    const score = scoreContentQuality('标题\n这是正文内容。\n#标签')
    expect(score.overall).toBeGreaterThanOrEqual(0)
    expect(score.overall).toBeLessThanOrEqual(100)
    expect(score.structure).toBeGreaterThanOrEqual(0)
    expect(score.publishability).toBeGreaterThanOrEqual(0)
    expect(score.repetition).toBeGreaterThanOrEqual(0)
  })
})
