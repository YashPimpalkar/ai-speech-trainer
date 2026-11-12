import type { ModelSelection } from '../types.js'

export function isRetryable(e: unknown): boolean {
  const err = e as { status?: number; message?: string }
  const s = err?.status
  if (s === 404 || s === 408 || s === 429 || (s !== undefined && s >= 500)) return true
  return /decommission|deprecated|not found|no longer|does not exist|rate limit|overloaded|quota/i.test(err?.message ?? '')
}

/** Try each model in order; move on only for model-level failures (expired, rate-limited, down). */
export async function withFallback<T>(
  candidates: ModelSelection[],
  run: (sel: ModelSelection) => Promise<T>,
): Promise<{ result: T; used: ModelSelection }> {
  let last: unknown
  for (const sel of candidates) {
    try {
      return { result: await run(sel), used: sel }
    } catch (e) {
      last = e
      if (!isRetryable(e)) throw e
    }
  }
  throw last ?? new Error('No models configured')
}
