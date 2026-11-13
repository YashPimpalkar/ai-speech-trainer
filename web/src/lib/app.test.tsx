import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from '../store'
import History from '../pages/History'
import { applyTheme } from './theme'
import { buildFallbacks, resolveSelection, setSelection } from './models'
import { pickBrowserVoice, speak } from './speech'
import ThemeToggle from '../components/ThemeToggle'
import Converse from '../pages/Converse'
import Grammar from '../pages/Grammar'
import Essay from '../pages/Essay'
import Email from '../pages/Email'
import Improve from '../components/Improve'

const render = (ui: React.ReactElement, store = makeStore()) => rtlRender(<Provider store={store}>{ui}</Provider>)

beforeEach(() => { localStorage.clear(); document.documentElement.className = '' })

describe('theme', () => {
  it('toggle flips the dark class and persists', () => {
    applyTheme('light')
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('models', () => {
  const list = { models: [{ provider: 'groq', id: 'a' }, { provider: 'groq', id: 'b' }, { provider: 'gemini', id: 'g' }] as any, providers: {}, errors: {} }
  it('falls back to first model when saved one disappeared', () => {
    setSelection({ provider: 'groq', model: 'gone' })
    expect(resolveSelection(list)).toEqual({ provider: 'groq', model: 'a' })
  })
  it('keeps a still-valid saved model', () => {
    setSelection({ provider: 'gemini', model: 'g' })
    expect(resolveSelection(list)).toEqual({ provider: 'gemini', model: 'g' })
  })
  it('puts other providers first in fallback chain', () => {
    expect(buildFallbacks(list, { provider: 'groq', model: 'a' })[0]).toEqual({ provider: 'gemini', model: 'g' })
  })
})

describe('speech', () => {
  const v = (name: string, lang = 'en-US') => ({ name, lang }) as SpeechSynthesisVoice
  it('picks gendered browser voices', () => {
    const voices = [v('Microsoft David'), v('Microsoft Zira'), v('Deutsch', 'de-DE')]
    expect(pickBrowserVoice(voices, 'female')?.name).toContain('Zira')
    expect(pickBrowserVoice(voices, 'male')?.name).toContain('David')
  })
  it('falls back to browser speech when server TTS is unavailable', async () => {
    const speakSpy = vi.fn((u: any) => u.onend())
    ;(window as any).speechSynthesis = { cancel: vi.fn(), speak: speakSpy, getVoices: () => [] }
    ;(window as any).SpeechSynthesisUtterance = class { onend?: () => void }
    const f = vi.fn(async () => ({ ok: false, status: 501 }) as Response)
    await speak('hello', 'female', f as any)
    expect(speakSpy).toHaveBeenCalled()
  })
})

describe('every feature offers Improve', () => {
  it('Converse shows Improve on a user turn mid-chat, and Essay after generating', async () => {
    const { setCurrentModel } = await import('./api')
    setCurrentModel({ models: [], providers: {}, errors: {} }, { provider: 'groq', model: 'm' })
    ;(window as any).speechSynthesis = { cancel: vi.fn(), speak: (u: any) => u.onend?.(), getVoices: () => [] }
    ;(window as any).SpeechSynthesisUtterance = class {}
    globalThis.fetch = vi.fn(async (url: string) => ({
      ok: url !== '/api/tts', status: url === '/api/tts' ? 501 : 200,
      json: async () => (url.includes('essay') ? { title: 'Pen', essay: 'A pen.', wordCount: 2 } : { reply: 'Hi!' }),
    })) as any
    render(<Converse />)
    fireEvent.change(screen.getByPlaceholderText(/type here/), { target: { value: 'I goed home' } })
    fireEvent.click(screen.getByText('Send'))
    expect(await screen.findByText('Hi!')).toBeInTheDocument()
    expect(screen.getByText('✦ Improve this')).toBeInTheDocument()
    cleanupAndRender(<Essay />)
    fireEvent.change(screen.getByPlaceholderText(/umbrella/), { target: { value: 'pen' } })
    fireEvent.click(screen.getByText(/Write 500-word essay/))
    expect(await screen.findByText('✦ Improve my English')).toBeInTheDocument()
  })
  it('Grammar voice mode, Essay and Email render an Improve button', async () => {
    render(<Email />)
    expect(screen.getAllByText(/Improve my English/).length).toBeGreaterThan(0)
    cleanupAndRender(<Essay />)
    cleanupAndRender(<Grammar />)
    fireEvent.click(screen.getByText(/Active/))
    expect(screen.getAllByText(/Improve my sentence/).length).toBeGreaterThan(0)
  })
})

function cleanupAndRender(ui: React.ReactElement) { document.body.innerHTML = ''; render(ui) }

describe('Improve panel layout', () => {
  it('is left-aligned even inside a right-aligned parent', async () => {
    const { setCurrentModel } = await import('./api')
    setCurrentModel({ models: [], providers: {}, errors: {} }, { provider: 'groq', model: 'm' })
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ corrected: 'a', improved: 'b', why: ['w'], accentTips: ['t'] }) })) as any
    render(<div className="text-right"><Improve text="hello" /></div>)
    fireEvent.click(screen.getByText(/Improve my English/))
    const panel = await screen.findByTestId('improve-panel')
    expect(panel).toHaveClass('text-left')
  })
})

describe('Converse chat layout', () => {
  it('scrolls messages in their own area, keeps the input outside it, and follows the latest message', async () => {
    const { setCurrentModel } = await import('./api')
    setCurrentModel({ models: [], providers: {}, errors: {} }, { provider: 'groq', model: 'm' })
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    ;(window as any).speechSynthesis = { cancel: vi.fn(), speak: (u: any) => u.onend?.(), getVoices: () => [] }
    ;(window as any).SpeechSynthesisUtterance = class {}
    globalThis.fetch = vi.fn(async (url: string) => ({ ok: url !== '/api/tts', status: url === '/api/tts' ? 501 : 200, json: async () => ({ reply: 'Hi!' }) })) as any
    render(<Converse />)
    const area = screen.getByTestId('messages')
    expect(area).toHaveClass('overflow-y-auto')
    const input = screen.getByPlaceholderText(/type here/)
    expect(area.contains(input)).toBe(false)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.click(screen.getByText('Send'))
    await screen.findByText('Hi!')
    expect(scroll).toHaveBeenCalled()
  })
})

describe('History tab', () => {
  const items = [
    { id: '1', kind: 'converse', title: 'Cricket chat', createdAt: '2026-11-12T10:00:00Z', updatedAt: '', payload: { messages: [{ role: 'user', content: 'hi' }], report: null } },
    { id: '2', kind: 'essay', title: 'umbrella', createdAt: '2026-11-12T11:00:00Z', updatedAt: '', payload: { output: { title: 'Umbrella', essay: 'An umbrella.' } } },
  ]
  it('lists saved items, continues a conversation, and deletes', async () => {
    const f = vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'DELETE'
      ? ({ ok: true, status: 204, json: async () => ({}) } as Response)
      : ({ ok: true, status: 200, json: async () => ({ items }) } as Response))
    globalThis.fetch = f as any
    const store = makeStore()
    const onContinue = vi.fn()
    render(<History onContinue={onContinue} />, store)
    expect(await screen.findByText('Cricket chat')).toBeInTheDocument()
    expect(screen.getByText('umbrella')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Continue chat'))
    expect(store.getState().converse.historyId).toBe('1')
    expect(store.getState().converse.messages[0].content).toBe('hi')
    expect(onContinue).toHaveBeenCalled()

    fireEvent.click(screen.getAllByText('Delete')[1])
    await waitFor(() => expect(screen.queryByText('umbrella')).not.toBeInTheDocument())
  })

  it('shows an empty state', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) })) as any
    render(<History onContinue={() => {}} />)
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument()
  })
})
