import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { memoryStore } from '../src/history.js'

const mk = () => createApp({ history: memoryStore() } as any)

describe('history api', () => {
  it('creates, reads, updates and deletes an item', async () => {
    const app = mk()
    const c = await request(app).post('/api/history').send({ kind: 'converse', title: 'Cricket chat', payload: { messages: [{ role: 'user', content: 'hi' }] } })
    expect(c.status).toBe(201)
    const id = c.body.id
    expect((await request(app).get(`/api/history/${id}`)).body.title).toBe('Cricket chat')

    const u = await request(app).put(`/api/history/${id}`).send({ payload: { messages: [], report: { score: 80 } } })
    expect(u.body.payload.report.score).toBe(80)
    expect(u.body.title).toBe('Cricket chat')

    expect((await request(app).delete(`/api/history/${id}`)).status).toBe(204)
    expect((await request(app).get(`/api/history/${id}`)).status).toBe(404)
  })

  it('lists newest first and filters by kind', async () => {
    const app = mk()
    await request(app).post('/api/history').send({ kind: 'essay', title: 'A', payload: {} })
    await request(app).post('/api/history').send({ kind: 'email', title: 'B', payload: {} })
    await request(app).post('/api/history').send({ kind: 'essay', title: 'C', payload: {} })
    const all = (await request(app).get('/api/history')).body.items
    expect(all.map((i: any) => i.title)).toEqual(['C', 'B', 'A'])
    const essays = (await request(app).get('/api/history?kind=essay')).body.items
    expect(essays.map((i: any) => i.title)).toEqual(['C', 'A'])
  })

  it('validates kind and title', async () => {
    const app = mk()
    expect((await request(app).post('/api/history').send({ kind: 'nope', title: 'x', payload: {} })).status).toBe(400)
    expect((await request(app).post('/api/history').send({ kind: 'essay', payload: {} })).status).toBe(400)
  })

  it('returns 404 when updating or deleting a missing item', async () => {
    const app = mk()
    const id = '00000000-0000-0000-0000-000000000000'
    expect((await request(app).put(`/api/history/${id}`).send({ payload: {} })).status).toBe(404)
    expect((await request(app).delete(`/api/history/${id}`)).status).toBe(404)
  })
})
