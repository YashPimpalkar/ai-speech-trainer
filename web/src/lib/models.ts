export interface Sel { provider: 'groq' | 'gemini'; model: string }
export interface ModelsResponse {
  models: { provider: Sel['provider']; id: string }[]
  providers: Record<string, boolean>
  errors: Record<string, string>
}
const KEY = 'model-selection'

export function getSelection(): Sel | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
export function setSelection(s: Sel) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** Picks the stored model if it still exists, else the first available one. */
export function resolveSelection(list: ModelsResponse): Sel | null {
  const saved = getSelection()
  if (saved && list.models.some((m) => m.provider === saved.provider && m.id === saved.model)) return saved
  const first = list.models[0]
  return first ? { provider: first.provider, model: first.id } : null
}

/** Automatic failover chain: every other available model, other providers first. */
export function buildFallbacks(list: ModelsResponse, primary: Sel): Sel[] {
  return list.models
    .filter((m) => !(m.provider === primary.provider && m.id === primary.model))
    .sort((a, b) => Number(a.provider === primary.provider) - Number(b.provider === primary.provider))
    .slice(0, 4)
    .map((m) => ({ provider: m.provider, model: m.id }))
}
