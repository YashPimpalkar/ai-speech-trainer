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

/**
 * Rough quality score from the model id alone (no hardcoded model names, so new models rank sensibly):
 * bigger parameter count (e.g. 120b) wins; Gemini pro > flash; lite/mini/nano variants are halved.
 */
export function modelScore(id: string): number {
  let score = Number(/(\d+(?:\.\d+)?)b\b/i.exec(id)?.[1] ?? 0)
  if (/(^|[-/])pro\b/i.test(id)) score = Math.max(score, 200)
  else if (/flash/i.test(id)) score = Math.max(score, 100)
  if (/(^|[-/])(lite|mini|nano)\b/i.test(id)) score *= 0.5
  return score
}

/** Strongest first; models with equal score keep the provider's order. */
export const sortModels = <T extends { id: string }>(models: T[]): T[] =>
  [...models].sort((a, b) => modelScore(b.id) - modelScore(a.id))

/** Picks the stored model if it still exists, else the strongest available one. */
export function resolveSelection(list: ModelsResponse): Sel | null {
  const saved = getSelection()
  if (saved && list.models.some((m) => m.provider === saved.provider && m.id === saved.model)) return saved
  const first = sortModels(list.models)[0]
  return first ? { provider: first.provider, model: first.id } : null
}

/** Automatic failover chain: every other available model, other providers first. */
export function buildFallbacks(list: ModelsResponse, primary: Sel): Sel[] {
  return sortModels(list.models)
    .filter((m) => !(m.provider === primary.provider && m.id === primary.model))
    .sort((a, b) => Number(a.provider === primary.provider) - Number(b.provider === primary.provider))
    .slice(0, 4)
    .map((m) => ({ provider: m.provider, model: m.id }))
}
