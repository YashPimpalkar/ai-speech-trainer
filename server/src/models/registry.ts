import type { ModelInfo, Provider } from '../types.js'

type Keys = Partial<Record<Provider, string>>
export interface ModelList {
  models: ModelInfo[]
  providers: Record<Provider, boolean>
  errors: Partial<Record<Provider, string>>
}

const NON_CHAT = /whisper|tts|embed|guard|imagen|veo|aqa|playai|orpheus|moderation/i
const TTL_MS = 10 * 60 * 1000
let cache: { key: string; at: number; value: ModelList } | undefined

export const resetModelCache = () => { cache = undefined }

async function getJson(fetchImpl: typeof fetch, url: string, init?: RequestInit) {
  const res = await fetchImpl(url, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<any>
}

async function groqModels(key: string, f: typeof fetch): Promise<ModelInfo[]> {
  const body = await getJson(f, 'https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } })
  return (body.data ?? [])
    .map((m: any) => m.id as string)
    .filter((id: string) => !NON_CHAT.test(id))
    .map((id: string) => ({ provider: 'groq' as const, id }))
}

async function geminiModels(key: string, f: typeof fetch): Promise<ModelInfo[]> {
  const body = await getJson(f, `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`)
  return (body.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m.name).replace(/^models\//, ''))
    .filter((id: string) => !NON_CHAT.test(id))
    .map((id: string) => ({ provider: 'gemini' as const, id }))
}

/** Live model discovery: new provider models show up with no code change. */
export async function listModels(keys: Keys, fetchImpl: typeof fetch = fetch): Promise<ModelList> {
  const ck = `${keys.groq ?? ''}|${keys.gemini ?? ''}`
  if (cache && cache.key === ck && Date.now() - cache.at < TTL_MS) return cache.value
  const value: ModelList = { models: [], providers: { groq: !!keys.groq, gemini: !!keys.gemini }, errors: {} }
  const jobs: [Provider, Promise<ModelInfo[]>][] = []
  if (keys.groq) jobs.push(['groq', groqModels(keys.groq, fetchImpl)])
  if (keys.gemini) jobs.push(['gemini', geminiModels(keys.gemini, fetchImpl)])
  for (const [p, job] of jobs) {
    try { value.models.push(...(await job)) } catch (e) { value.errors[p] = (e as Error).message }
  }
  if (!Object.keys(value.errors).length) cache = { key: ck, at: Date.now(), value }
  return value
}
