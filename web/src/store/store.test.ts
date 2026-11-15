import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeStore } from './index'
import { addMessage, loadConversation, resetConverse, setReport } from './converseSlice'
import { saveConverse, fetchHistory, removeHistory, saveItem } from './historySlice'
import { setResult } from './resultsSlice'

const item = (id: string, over = {}) => ({ id, kind: 'converse', title: 't', payload: {}, createdAt: '', updatedAt: '', ...over })
const ok = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body }) as Response

beforeEach(() => { globalThis.fetch = vi.fn() as any })

describe('converse slice', () => {
  it('adds messages, sets report, resets and loads', () => {
    const s = makeStore()
    s.dispatch(addMessage({ role: 'user', content: 'hi' }))
    s.dispatch(addMessage({ role: 'assistant', content: 'hello' }))
    s.dispatch(setReport({ score: 70 } as any))
    expect(s.getState().converse.messages).toHaveLength(2)
    expect(s.getState().converse.report).toEqual({ score: 70 })
    s.dispatch(resetConverse())
    expect(s.getState().converse).toMatchObject({ messages: [], report: null, historyId: null })
    s.dispatch(loadConversation({ id: 'x', messages: [{ role: 'user', content: 'a' }], report: null }))
    expect(s.getState().converse.historyId).toBe('x')
  })
})

describe('saveConverse', () => {
  it('creates a history item first, then updates the same one', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(ok(item('abc'), 201))
      .mockResolvedValueOnce(ok(item('abc')))
    globalThis.fetch = f as any
    const s = makeStore()
    s.dispatch(addMessage({ role: 'user', content: 'I like cricket a lot' }))
    await s.dispatch(saveConverse())
    expect(f.mock.calls[0][0]).toBe('/api/history')
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ kind: 'converse', title: 'I like cricket a lot' })
    expect(s.getState().converse.historyId).toBe('abc')
    s.dispatch(addMessage({ role: 'assistant', content: 'Nice!' }))
    await s.dispatch(saveConverse())
    expect(f.mock.calls[1][0]).toBe('/api/history/abc')
    expect(f.mock.calls[1][1].method).toBe('PUT')
  })

  it('does not create duplicates when saves overlap', async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) => ok(item('one'), init?.method === 'PUT' ? 200 : 201))
    globalThis.fetch = f as any
    const s = makeStore()
    s.dispatch(addMessage({ role: 'user', content: 'x' }))
    await Promise.all([s.dispatch(saveConverse()), s.dispatch(saveConverse())])
    expect(f.mock.calls.filter((c) => c[1]?.method === 'POST')).toHaveLength(1)
  })

  it('never throws when the server is down', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline') }) as any
    const s = makeStore()
    s.dispatch(addMessage({ role: 'user', content: 'x' }))
    await expect(s.dispatch(saveConverse())).resolves.toBeDefined()
  })
})

describe('history slice', () => {
  it('fetches and removes items', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(ok({ items: [item('1'), item('2')] }))
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) } as Response) as any
    const s = makeStore()
    await s.dispatch(fetchHistory())
    expect(s.getState().history.items.map((i) => i.id)).toEqual(['1', '2'])
    await s.dispatch(removeHistory('1'))
    expect(s.getState().history.items.map((i) => i.id)).toEqual(['2'])
  })

  it('saveItem posts a one-off result', async () => {
    const f = vi.fn(async () => ok(item('n', { kind: 'essay' }), 201))
    globalThis.fetch = f as any
    const s = makeStore()
    await s.dispatch(saveItem({ kind: 'essay', title: 'umbrella', payload: { a: 1 } }))
    expect(JSON.parse((f.mock.calls[0] as any)[1].body)).toMatchObject({ kind: 'essay', title: 'umbrella' })
  })
})

describe('results slice', () => {
  it('keeps the latest result per page', () => {
    const s = makeStore()
    s.dispatch(setResult({ page: 'essay', value: { title: 'Pen' } }))
    expect(s.getState().results.essay).toEqual({ title: 'Pen' })
  })
})
