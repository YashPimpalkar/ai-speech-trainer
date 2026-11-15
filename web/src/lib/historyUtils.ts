import type { HistoryItem, Kind } from './api'

export type FilterId = 'all' | 'chats' | 'essays' | 'emails' | 'grammar' | 'improve'
export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'chats', label: 'Chats' }, { id: 'essays', label: 'Essays' },
  { id: 'emails', label: 'Emails' }, { id: 'grammar', label: 'Grammar' }, { id: 'improve', label: 'Improve' },
]
const KIND_OF: Record<Exclude<FilterId, 'all'>, Kind> = { chats: 'converse', essays: 'essay', emails: 'email', grammar: 'grammar', improve: 'improve' }

export function filterHistory(items: HistoryItem[], filter: FilterId, query: string): HistoryItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((i) => (filter === 'all' || i.kind === KIND_OF[filter]) && (!q || i.title.toLowerCase().includes(q)))
}

export type GroupLabel = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older'
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Groups (already newest-first) items by calendar day, like Claude's history panel. Empty groups are dropped. */
export function groupHistory(items: HistoryItem[], now = new Date()): { label: GroupLabel; items: HistoryItem[] }[] {
  const order: GroupLabel[] = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
  const buckets = new Map<GroupLabel, HistoryItem[]>(order.map((l) => [l, []]))
  for (const item of items) {
    const days = Math.round((startOfDay(now) - startOfDay(new Date(item.createdAt))) / 86_400_000)
    buckets.get(days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days <= 7 ? 'Previous 7 days' : 'Older')!.push(item)
  }
  return order.filter((l) => buckets.get(l)!.length).map((label) => ({ label, items: buckets.get(label)! }))
}

/** Rough reading time in whole minutes (about 200 words per minute). */
export const readTime = (words: number) => Math.max(1, Math.round(words / 200))
