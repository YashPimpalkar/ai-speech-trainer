import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { applyTheme } from './theme'
import { buildFallbacks, resolveSelection, setSelection } from './models'
import { pickBrowserVoice, speak } from './speech'
import ThemeToggle from '../components/ThemeToggle'
import Converse from '../pages/Converse'
import Grammar from '../pages/Grammar'
import Essay from '../pages/Essay'
import Email from '../pages/Email'
import Improve from '../components/Improve'

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
