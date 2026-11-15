import { describe, it, expect } from 'vitest'
import http from 'node:http'
import handler from '../src/handler.js'

describe('serverless handler', () => {
  it('serves the express app as a plain (req, res) function', async () => {
    const server = http.createServer(handler)
    await new Promise<void>((r) => server.listen(0, r))
    const port = (server.address() as any).port
    const res = await fetch(`http://localhost:${port}/api/health`)
    expect(await res.json()).toEqual({ ok: true })
    server.close()
  })
})
