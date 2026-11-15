import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '../store'
import { addMessage, loadConversation } from '../store/converseSlice'
import { saveConverse, saveItem } from '../store/historySlice'
import { closeDrawer, openDrawer, openSaved, setView, toggleCollapsed } from '../store/uiSlice'
import { FILTERS, filterHistory, groupHistory, readTime } from './historyUtils'
import type { HistoryItem } from './api'
import App from '../App'
import Sidebar from '../components/Sidebar'
import SavedItem from '../pages/SavedItem'
import Essay from '../pages/Essay'
import Email from '../pages/Email'
import Improve from '../components/Improve'
import { setCurrentModel } from './api'

const NOW = new Date(2026, 10, 15, 12, 0, 0) // 15 Nov 2026, local time
const at = (m: number, d: number, h = 9) => new Date(2026, m, d, h).toISOString()
const item = (id: string, kind: HistoryItem['kind'], title: string, createdAt: string, payload: any = {}): HistoryItem =>
  ({ id, kind, title, payload, createdAt, updatedAt: createdAt })

const ITEMS = [
  item('1', 'converse', 'Cricket chat', at(10, 15), { messages: [{ role: 'user', content: 'hi' }], report: null }),
  item('2', 'essay', 'umbrella', at(10, 14), { input: { topic: 'umbrella' }, output: { title: 'Umbrella', essay: 'An umbrella.', wordCount: 524 } }),
  item('3', 'email', 'Leave request', at(10, 12), { output: { subject: 'Leave', body: 'Dear Sir' } }),
  item('4', 'grammar', 'present perfect', at(9, 1), { output: { title: 'Present Perfect', rule: 'have + V3', structure: 'S + have + V3' } }),
]

const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response
function mockFetch(items: HistoryItem[] = ITEMS) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/api/models')) return res({ models: [{ provider: 'groq', id: 'openai/gpt-oss-120b' }], providers: { groq: true, gemini: false }, errors: {} })
    if (init?.method === 'DELETE') return res({}, 204)
    if (url.includes('/api/history')) return res({ items })
    return res({})
  })
  globalThis.fetch = f as any
  return f
}
const render = (ui: React.ReactElement, store = makeStore()) => ({ store, ...rtlRender(<Provider store={store}>{ui}</Provider>) })

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  setCurrentModel({ models: [], providers: {}, errors: {} }, { provider: 'groq', model: 'm' })
  Element.prototype.scrollIntoView = vi.fn()
})

describe('history utils', () => {
  it('groups into Today / Yesterday / Previous 7 days / Older, newest first, skipping empty groups', () => {
    const groups = groupHistory(ITEMS, NOW)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Previous 7 days', 'Older'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['1'])
    expect(groupHistory([ITEMS[0]], NOW).map((g) => g.label)).toEqual(['Today'])
  })
  it('filters by chip and by search text (case-insensitive)', () => {
    expect(FILTERS.map((f) => f.label)).toEqual(['All', 'Chats', 'Essays', 'Emails', 'Grammar', 'Improve'])
    expect(filterHistory(ITEMS, 'essays', '').map((i) => i.id)).toEqual(['2'])
    expect(filterHistory(ITEMS, 'chats', '').map((i) => i.id)).toEqual(['1'])
    expect(filterHistory(ITEMS, 'all', 'LEAVE').map((i) => i.id)).toEqual(['3'])
    expect(filterHistory(ITEMS, 'all', '  ').length).toBe(4)
  })
  it('estimates reading time in whole minutes, at least 1', () => {
    expect(readTime(524)).toBe(3)
    expect(readTime(50)).toBe(1)
  })
})

describe('ui slice', () => {
  it('switches views, opens saved items, drawer and collapse', () => {
    const s = makeStore()
    expect(s.getState().ui.view).toBe('converse')
    s.dispatch(openDrawer())
    s.dispatch(setView('grammar'))
    expect(s.getState().ui).toMatchObject({ view: 'grammar', savedId: null, drawerOpen: false })
    s.dispatch(openDrawer())
    s.dispatch(openSaved('2'))
    expect(s.getState().ui).toMatchObject({ view: 'saved', savedId: '2', drawerOpen: false })
    s.dispatch(openDrawer())
    expect(s.getState().ui.drawerOpen).toBe(true)
    s.dispatch(closeDrawer())
    expect(s.getState().ui.drawerOpen).toBe(false)
    s.dispatch(toggleCollapsed())
    expect(s.getState().ui.collapsed).toBe(true)
  })
})

describe('history list stays live', () => {
  it('adds a new conversation at the top, then updates it in place', async () => {
    const created = item('c1', 'converse', 'hello', at(10, 15))
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(res(created, 201))
      .mockResolvedValueOnce(res({ ...created, payload: { messages: [1, 2], report: null } })) as any
    const s = makeStore()
    s.dispatch(addMessage({ role: 'user', content: 'hello' }))
    await s.dispatch(saveConverse())
    expect(s.getState().history.items.map((i) => i.id)).toEqual(['c1'])
    s.dispatch(addMessage({ role: 'assistant', content: 'hi' }))
    await s.dispatch(saveConverse())
    expect(s.getState().history.items).toHaveLength(1)
    expect((s.getState().history.items[0].payload as any).messages).toHaveLength(2)
  })
  it('adds one-off results (essay, email…) to the top', async () => {
    globalThis.fetch = vi.fn(async () => res(item('e1', 'essay', 'pen', at(10, 15)), 201)) as any
    const s = makeStore()
    await s.dispatch(saveItem({ kind: 'essay', title: 'pen', payload: {} }))
    expect(s.getState().history.items.map((i) => i.id)).toEqual(['e1'])
  })
})

describe('Sidebar (history panel)', () => {
  it('lists saved items under date headings', async () => {
    mockFetch()
    render(<Sidebar />)
    expect(await screen.findByText('Cricket chat')).toBeInTheDocument()
    for (const h of ['Today', 'Yesterday', 'Previous 7 days', 'Older']) expect(screen.getByText(h)).toBeInTheDocument()
  })

  it('opening a conversation continues it in Converse', async () => {
    mockFetch()
    const { store } = render(<Sidebar />)
    fireEvent.click(await screen.findByText('Cricket chat'))
    expect(store.getState().converse.historyId).toBe('1')
    expect(store.getState().converse.messages[0].content).toBe('hi')
    expect(store.getState().ui.view).toBe('converse')
  })

  it('opening an essay shows the saved item', async () => {
    mockFetch()
    const { store } = render(<Sidebar />)
    fireEvent.click(await screen.findByText('umbrella'))
    expect(store.getState().ui).toMatchObject({ view: 'saved', savedId: '2' })
  })

  it('deletes an item', async () => {
    mockFetch()
    render(<Sidebar />)
    await screen.findByText('umbrella')
    fireEvent.click(screen.getByLabelText('Delete umbrella'))
    await waitFor(() => expect(screen.queryByText('umbrella')).not.toBeInTheDocument())
  })

  it('filters with chips and search', async () => {
    mockFetch()
    render(<Sidebar />)
    await screen.findByText('umbrella')
    fireEvent.click(screen.getByRole('button', { name: 'Essays' }))
    expect(screen.queryByText('Cricket chat')).not.toBeInTheDocument()
    expect(screen.getByText('umbrella')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByPlaceholderText('Search history…'), { target: { value: 'leave' } })
    expect(screen.getByText('Leave request')).toBeInTheDocument()
    expect(screen.queryByText('umbrella')).not.toBeInTheDocument()
  })

  it('navigates between features and starts a new chat', async () => {
    mockFetch()
    const { store } = render(<Sidebar />)
    store.dispatch(addMessage({ role: 'user', content: 'x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Essay Studio' }))
    expect(store.getState().ui.view).toBe('essay')
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    expect(store.getState().ui.view).toBe('converse')
    expect(store.getState().converse.messages).toEqual([])
    expect(screen.getByRole('button', { name: 'Converse' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows an empty state', async () => {
    mockFetch([])
    render(<Sidebar />)
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument()
  })
})

describe('App shell', () => {
  it('opens and closes the mobile drawer (menu button, backdrop, choosing a page)', async () => {
    mockFetch()
    render(<App />)
    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar.className).toMatch(/-translate-x-full/)
    expect(screen.queryByTestId('drawer-backdrop')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(sidebar.className).toMatch(/(^|\s)translate-x-0(\s|$)/)
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByTestId('drawer-backdrop')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Open menu'))
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Grammar Coach' }))
    expect(screen.queryByTestId('drawer-backdrop')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grammar Coach' })).toBeInTheDocument()
  })

  it('collapses the sidebar on desktop and the menu button brings it back', async () => {
    mockFetch()
    const { store } = render(<App />)
    fireEvent.click(screen.getByLabelText('Collapse sidebar'))
    expect(store.getState().ui.collapsed).toBe(true)
    expect(screen.getByTestId('sidebar').className).toMatch(/lg:hidden/)
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(store.getState().ui.collapsed).toBe(false)
  })

  it('has a single black/white mode toggle that flips the page', async () => {
    mockFetch()
    render(<App />)
    const toggle = screen.getByLabelText(/Switch to (black|white) mode/)
    const before = document.documentElement.classList.contains('dark')
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(!before)
    expect(screen.getAllByLabelText(/Switch to (black|white) mode/)).toHaveLength(1)
  })

  it('shows a saved item from the sidebar in the centre column', async () => {
    mockFetch()
    render(<App />)
    fireEvent.click(await screen.findByText('umbrella'))
    expect(await screen.findByText('Saved Essay')).toBeInTheDocument()
    expect(screen.getByText('An umbrella.')).toBeInTheDocument()
  })
})

describe('SavedItem', () => {
  const stateFor = (id: string) => ({ history: { items: ITEMS, status: 'idle', error: '' }, ui: { view: 'saved', savedId: id, drawerOpen: false, collapsed: false } }) as any

  it('continues a saved essay in Essay Studio', () => {
    const s = makeStore(stateFor('2'))
    render(<SavedItem />, s)
    expect(screen.getByText('Saved Essay')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Essay Studio' }))
    expect(s.getState().results.essay).toEqual(ITEMS[1].payload.output)
    expect(s.getState().ui.view).toBe('essay')
  })

  it('continues a saved grammar lesson and email too', () => {
    const g = makeStore(stateFor('4'))
    render(<SavedItem />, g)
    fireEvent.click(screen.getByRole('button', { name: 'Continue in Grammar Coach' }))
    expect(g.getState().results.grammar).toEqual(ITEMS[3].payload.output)
    expect(g.getState().ui.view).toBe('grammar')
  })

  it('deletes and returns to Converse', async () => {
    mockFetch()
    const s = makeStore(stateFor('2'))
    render(<SavedItem />, s)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(s.getState().ui.view).toBe('converse'))
    expect(s.getState().history.items.find((i) => i.id === '2')).toBeUndefined()
  })

  it('explains when the item is gone', () => {
    render(<SavedItem />, makeStore(stateFor('nope')))
    expect(screen.getByText(/no longer available/)).toBeInTheDocument()
  })
})

describe('feature screens follow the design', () => {
  it('Improve panel: Corrected, Polished native phrasing, Why it changed, Accent tips', async () => {
    globalThis.fetch = vi.fn(async () => res({ corrected: 'a', improved: 'b', why: ['reason one'], accentTips: ['tip one'] })) as any
    render(<Improve text="hello" />)
    fireEvent.click(screen.getByText(/Improve my English/))
    expect(await screen.findByText('Polished native phrasing')).toBeInTheDocument()
    for (const t of ['Corrected', 'Why it changed', 'Accent tips', 'reason one', 'tip one']) expect(screen.getByText(t)).toBeInTheDocument()
    expect(screen.getByTestId('improve-panel').className).toMatch(/text-left/)
  })

  it('Essay result shows word count and reading time', () => {
    const s = makeStore({ results: { essay: { title: 'Umbrella', essay: 'An umbrella.', wordCount: 524 } } } as any)
    render(<Essay />, s)
    expect(screen.getByText(/524 words · 3 min read/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Essay Studio' })).toBeInTheDocument()
  })

  it('Email result: alternative tones are chips that swap the shown text', () => {
    const s = makeStore({ results: { email: { subject: 'S', body: 'Main body', alternatives: [{ tone: 'friendly', body: 'Alt body' }], notes: [] } } } as any)
    render(<Email />, s)
    expect(screen.getByText('Main body')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'friendly' }))
    expect(screen.getByText('Alt body')).toBeInTheDocument()
    expect(screen.queryByText('Main body')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Primary' }))
    expect(screen.getByText('Main body')).toBeInTheDocument()
  })

  it('loadConversation still restores a chat', () => {
    const s = makeStore()
    s.dispatch(loadConversation({ id: 'x', messages: [{ role: 'user', content: 'a' }], report: null }))
    expect(s.getState().converse.historyId).toBe('x')
  })
})
