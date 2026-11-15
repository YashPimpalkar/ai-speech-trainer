import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Frontend Vercel project uses Root Directory = web, so paths here are relative to web/.
const cfg = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8'))

describe('frontend vercel.json (Root Directory = web)', () => {
  it('outputs to dist relative to web, not web/dist', () => {
    expect(cfg.outputDirectory).toBe('dist')
  })
  it('declares no serverless functions or API rewrites (the API is a separate project)', () => {
    expect(cfg.functions).toBeUndefined()
    expect(cfg.rewrites).toBeUndefined()
  })
  it('builds with the web build script', () => {
    expect(cfg.buildCommand).toBe('npm run build')
  })
})
