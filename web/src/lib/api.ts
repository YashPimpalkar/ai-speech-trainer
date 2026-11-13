import { apiUrl } from './apiUrl'
import { buildFallbacks, resolveSelection, type ModelsResponse, type Sel } from './models'

let current: { model: Sel; fallbacks: Sel[] } | null = null
export const setCurrentModel = (list: ModelsResponse, model: Sel) => { current = { model, fallbacks: buildFallbacks(list, model) } }
export const currentModel = () => current?.model ?? null

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as any).error ?? `Request failed (${res.status})`)
  return body as T
}

export const fetchModels = async (): Promise<ModelsResponse> => {
  const list = await json<ModelsResponse>(await fetch(apiUrl('/api/models')))
  const sel = resolveSelection(list)
  if (sel) setCurrentModel(list, sel)
  return list
}

/** POST to a model-backed endpoint; attaches the chosen model and failover chain. */
export async function post<T>(path: string, body: Record<string, unknown>): Promise<T & { modelUsed?: Sel }> {
  if (!current) throw new Error('No model selected yet. Check your API keys.')
  return json(await fetch(apiUrl(`/api/${path}`), {
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
  (await json<{ items: HistoryItem[] }>(await fetch(apiUrl(`/api/history${kind ? `?kind=${kind}` : ''}`)))).items
export const createHistory = async (kind: Kind, title: string, payload: unknown) =>
  json<HistoryItem>(await fetch(apiUrl('/api/history'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, title, payload }) }))
export const updateHistory = async (id: string, patch: { title?: string; payload?: unknown }) =>
  json<HistoryItem>(await fetch(apiUrl(`/api/history/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }))
export const deleteHistory = async (id: string) => {
  const res = await fetch(apiUrl(`/api/history/${id}`), { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}
