import { describe, it, expect } from 'vitest'
import { withFallback, isRetryable } from '../src/models/fallback.js'

const err = (status: number, message = '') => Object.assign(new Error(message), { status })

describe('withFallback', () => {
  it('uses the next model when one is decommissioned', async () => {
    const calls: string[] = []
    const r = await withFallback(
      [{ provider: 'groq', model: 'old' }, { provider: 'gemini', model: 'new' }],
      async (s) => {
        calls.push(s.model)
        if (s.model === 'old') throw err(400, 'model has been decommissioned')
        return 'ok'
      },
    )
    expect(r).toEqual({ result: 'ok', used: { provider: 'gemini', model: 'new' } })
    expect(calls).toEqual(['old', 'new'])
  })

  it('does not retry on auth errors', async () => {
    await expect(
      withFallback([{ provider: 'groq', model: 'a' }, { provider: 'groq', model: 'b' }], async () => {
        throw err(401, 'bad key')
      }),
    ).rejects.toThrow('bad key')
  })

  it('throws the last error when all fail', async () => {
    await expect(
      withFallback([{ provider: 'groq', model: 'a' }], async () => {
        throw err(429, 'rate limited')
      }),
    ).rejects.toThrow('rate limited')
  })

  it('classifies retryable errors', () => {
    expect(isRetryable(err(404))).toBe(true)
    expect(isRetryable(err(429))).toBe(true)
    expect(isRetryable(err(503))).toBe(true)
    expect(isRetryable(err(401))).toBe(false)
  })
})
