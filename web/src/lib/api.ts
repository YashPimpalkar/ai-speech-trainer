import { apiUrl } from './apiUrl'
import { buildFallbacks, resolveSelection, type ModelsResponse, type Sel } from './models'

let current: { model: Sel; fallbacks: Sel[] } | null = null
export const setCurrentModel = (list: ModelsResponse, model: Sel) => { current = { model, fallbacks: buildFallbacks(list, model) } }
export const currentModel = () => current?.model ?? null

const UNREACHABLE = "Can't reach the API. Check your connection, and that VITE_API_URL (backend URL) and the backend's CORS_ORIGINS are set correctly."

/** fetch that turns network failures into a readable message. */
const net = (url: string, init?: RequestInit) => fetch(url, init).catch(() => { throw new Error(UNREACHABLE) })

function httpError(status: number) {
  if (status === 404) return 'API not found (404). Check that VITE_API_URL points to your backend.'
  if (status >= 500) return `The API had a problem (${status}). Try again in a moment.`
  return `Request failed (${status})`
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as any).error ?? httpError(res.status))
  return body as T
}

export const fetchModels = async (): Promise<ModelsResponse> => {
  const list = await json<ModelsResponse>(await net(apiUrl('/api/models')))
  const sel = resolveSelection(list)
  if (sel) setCurrentModel(list, sel)
  return list
}

/** POST to a model-backed endpoint; attaches the chosen model and failover chain. */
export async function post<T>(path: string, body: Record<string, unknown>): Promise<T & { modelUsed?: Sel }> {
  if (!current) throw new Error('No model selected yet. Check your API keys.')
  return json(await net(apiUrl(`/api/${path}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, model: current.model, fallbacks: current.fallbacks }),
  }))
}

export interface Improvement { corrected: string; improved: string; why: string[]; accentTips: string[] }
export const improve = (text: string) => post<Improvement>('improve', { text })

// ---- history (stored server-side in Postgres) ----
export type Kind = 'converse' | 'improve' | 'grammar' | 'essay' | 'email'
export interface HistoryItem { id: string; kind: Kind; title: string; payload: any; createdAt: string; updatedAt: string }

export const listHistory = async (kind?: Kind) =>
  (await json<{ items: HistoryItem[] }>(await net(apiUrl(`/api/history${kind ? `?kind=${kind}` : ''}`)))).items
export const createHistory = async (kind: Kind, title: string, payload: unknown) =>
  json<HistoryItem>(await net(apiUrl('/api/history'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, title, payload }) }))
export const updateHistory = async (id: string, patch: { title?: string; payload?: unknown }) =>
  json<HistoryItem>(await net(apiUrl(`/api/history/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }))
export const deleteHistory = async (id: string) => {
  const res = await net(apiUrl(`/api/history/${id}`), { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}
