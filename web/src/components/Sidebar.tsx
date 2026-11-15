import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchHistory, removeHistory } from '../store/historySlice'
import { loadConversation, resetConverse } from '../store/converseSlice'
import { closeDrawer, openSaved, setView, toggleCollapsed, type View } from '../store/uiSlice'
import { FILTERS, filterHistory, groupHistory, type FilterId } from '../lib/historyUtils'
import type { HistoryItem } from '../lib/api'
import ModelPicker from './ModelPicker'

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

const NAV: { id: Exclude<View, 'saved'>; label: string; icon: string }[] = [
  { id: 'converse', label: 'Converse', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'grammar', label: 'Grammar Coach', icon: 'M4 20 10 4l6 16M6.5 14h7M17.5 12l2 2 3.5-4' },
  { id: 'essay', label: 'Essay Studio', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' },
  { id: 'email', label: 'Email Assistant', icon: 'M4 4h16v16H4zM4 6l8 7 8-7' },
]

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector((s) => s.history)
  const { view, savedId, drawerOpen, collapsed } = useAppSelector((s) => s.ui)
  const activeChat = useAppSelector((s) => s.converse.historyId)
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  useEffect(() => { dispatch(fetchHistory()) }, [dispatch])

  const groups = groupHistory(filterHistory(items, filter, query))
  const open = (item: HistoryItem) => {
    if (item.kind === 'converse') {
      dispatch(loadConversation({ id: item.id, messages: item.payload?.messages ?? [], report: item.payload?.report ?? null }))
      dispatch(setView('converse'))
    } else dispatch(openSaved(item.id))
  }
  const isActive = (item: HistoryItem) => (item.kind === 'converse' ? view === 'converse' && activeChat === item.id : view === 'saved' && savedId === item.id)

  return (
    <aside
      data-testid="sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex w-[85%] max-w-xs flex-col border-r border-black/10 bg-neutral-50 transition-transform dark:border-white/10 dark:bg-neutral-950 ${
        drawerOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0 lg:translate-x-0 ${collapsed ? 'lg:hidden' : ''}`}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight"><span className="h-2 w-2 rounded-full bg-blue-500" />Speak.AI</span>
        <button aria-label="Collapse sidebar" onClick={() => dispatch(toggleCollapsed())} className="hidden h-8 w-8 cursor-pointer place-items-center rounded-full opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10 lg:grid">‹</button>
        <button aria-label="Close menu" onClick={() => dispatch(closeDrawer())} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10 lg:hidden">✕</button>
      </div>

      <div className="px-3">
        <button
          onClick={() => { dispatch(resetConverse()); dispatch(setView('converse')) }}
          className="w-full cursor-pointer rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 max-lg:min-h-11"
        ><span aria-hidden="true">+</span> New chat</button>
        <nav className="mt-3 space-y-0.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => dispatch(setView(n.id))}
              aria-current={view === n.id ? 'page' : undefined}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm max-lg:min-h-11 ${
                view === n.id
                  ? 'border-blue-500/30 bg-blue-500/10 font-medium text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
              }`}
            ><Icon d={n.icon} />{n.label}</button>
          ))}
        </nav>
      </div>

      <div className="mt-4 px-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history…" aria-label="Search history"
          className="w-full rounded-full border border-black/10 bg-transparent px-4 py-2 text-base outline-none focus:border-blue-500 dark:border-white/15 dark:focus:border-blue-400 sm:text-sm"
        />
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 font-mono text-[11px] ${filter === f.id ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/10 text-neutral-500 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10'}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {status === 'error' && <p role="alert" className="px-2 py-2 text-xs text-neutral-500">{error}</p>}
        {status === 'idle' && !groups.length && (
          <p className="px-3 py-6 text-center text-xs text-neutral-500">{items.length ? 'No matches.' : 'Nothing here yet. Your chats, essays, emails and improvements are saved automatically.'}</p>
        )}
        {groups.map((g) => (
          <section key={g.label} className="mt-3">
            <h3 className="px-3 pb-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500">{g.label}</h3>
            <ul>
              {g.items.map((item) => (
                <li key={item.id} className="group relative">
                  <button
                    onClick={() => open(item)}
                    className={`block w-full cursor-pointer truncate rounded-lg px-3 py-2 pr-9 text-left text-sm max-lg:min-h-11 ${isActive(item) ? 'bg-black/10 font-medium dark:bg-white/10' : 'text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'}`}
                  >
                    {item.title}
                  </button>
                  <button
                    aria-label={`Delete ${item.title}`}
                    onClick={() => dispatch(removeHistory(item.id))}
                    className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-xs opacity-60 hover:bg-black/10 hover:opacity-100 focus:opacity-100 dark:hover:bg-white/15 lg:opacity-0 lg:group-hover:opacity-60"
                  >🗑</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-black/10 p-3 dark:border-white/10">
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-neutral-500">AI model</span>
        <ModelPicker />
      </div>
    </aside>
  )
}
