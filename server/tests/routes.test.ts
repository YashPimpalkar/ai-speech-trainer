import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { pcmToWav } from '../src/voice/tts-gemini.js'

const sel = { provider: 'groq', model: 'm1' }
const llmReply = (text: string) => ({ invoke: async () => text })
const base = {
  listModels: async () => ({ models: [{ provider: 'groq', id: 'm1' }], providers: { groq: true, gemini: false }, errors: {} }),
  makeLlm: () => llmReply('Hello there!'),
  stt: async () => 'hello world',
  tts: async () => null,
}

describe('api', () => {
  it('GET /api/models', async () => {
    const r = await request(createApp(base as any)).get('/api/models')
    expect(r.body.models[0].id).toBe('m1')
    expect(r.body.providers.gemini).toBe(false)
  })

  it('POST /api/chat returns reply and model used', async () => {
    const r = await request(createApp(base as any)).post('/api/chat').send({ model: sel, messages: [{ role: 'user', content: 'hi' }] })
    expect(r.status).toBe(200)
    expect(r.body.reply).toBe('Hello there!')
  })

  it('validates input', async () => {
    const r = await request(createApp(base as any)).post('/api/chat').send({ model: sel })
    expect(r.status).toBe(400)
  })

  it('POST /api/improve', async () => {
    const app = createApp({ ...base, makeLlm: () => llmReply('{"corrected":"a","improved":"b","why":[],"accentTips":[]}') } as any)
    const r = await request(app).post('/api/improve').send({ model: sel, text: 'x' })
    expect(r.body.improved).toBe('b')
  })

  it('POST /api/grammar validates mode', async () => {
    const r = await request(createApp(base as any)).post('/api/grammar').send({ model: sel, mode: 'nope' })
    expect(r.status).toBe(400)
  })

  it('POST /api/stt returns text from uploaded audio', async () => {
    const r = await request(createApp(base as any)).post('/api/stt').attach('audio', Buffer.from('abc'), 'a.webm')
    expect(r.body.text).toBe('hello world')
  })

  it('POST /api/tts signals browser fallback when no audio is available', async () => {
    const r = await request(createApp(base as any)).post('/api/tts').send({ text: 'hi', voice: 'female' })
    expect(r.status).toBe(501)
    expect(r.body.fallback).toBe(true)
  })

  it('POST /api/tts returns wav when available', async () => {
    const app = createApp({ ...base, tts: async () => Buffer.from('RIFFxxxx') } as any)
    const r = await request(app).post('/api/tts').send({ text: 'hi', voice: 'male' })
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toContain('audio/wav')
  })

  it('reports model errors as 502 with message', async () => {
    const app = createApp({ ...base, makeLlm: () => ({ invoke: async () => { throw Object.assign(new Error('bad key'), { status: 401 }) } }) } as any)
    const r = await request(app).post('/api/chat').send({ model: sel, messages: [{ role: 'user', content: 'hi' }] })
    expect(r.status).toBe(502)
    expect(r.body.error).toContain('bad key')
  })
})

describe('pcmToWav', () => {
  it('prepends a 44-byte RIFF header', () => {
    const wav = pcmToWav(Buffer.alloc(100))
    expect(wav.length).toBe(144)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(24000)
  })
})
