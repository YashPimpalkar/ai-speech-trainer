import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { parseOrigins } from '../src/config.js'

describe('cors', () => {
  it('parses a comma separated origin list', () => {
    expect(parseOrigins(' https://a.vercel.app/, http://localhost:5173 ,')).toEqual(['https://a.vercel.app', 'http://localhost:5173'])
    expect(parseOrigins(undefined)).toEqual([])
  })

  it('allows only configured origins when set', async () => {
    const app = createApp({} as any, { corsOrigins: ['https://good.vercel.app'] })
    const good = await request(app).get('/api/health').set('Origin', 'https://good.vercel.app')
    expect(good.headers['access-control-allow-origin']).toBe('https://good.vercel.app')
    const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('allows any origin when none are configured (local dev)', async () => {
    const r = await request(createApp({} as any)).get('/api/health').set('Origin', 'http://localhost:5173')
    expect(r.headers['access-control-allow-origin']).toBeDefined()
  })
})
