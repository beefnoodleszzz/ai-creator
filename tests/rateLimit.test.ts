import { describe, expect, it } from 'vitest'
import { checkRateLimit } from '../server/utils/rateLimit'

describe('checkRateLimit', () => {
  it('allows requests under limit and blocks overflow', () => {
    const key = `test-${Math.random()}`
    const first = checkRateLimit(key, 2, 1000)
    const second = checkRateLimit(key, 2, 1000)
    const third = checkRateLimit(key, 2, 1000)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(false)
  })
})
