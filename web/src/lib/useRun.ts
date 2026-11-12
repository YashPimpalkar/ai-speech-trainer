import { useCallback, useState } from 'react'

/** Tracks loading/error around an async action. */
export function useRun() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true); setError('')
    try { return await fn() } catch (e) { setError((e as Error).message); return undefined } finally { setLoading(false) }
  }, [])
  return { loading, error, run }
}
