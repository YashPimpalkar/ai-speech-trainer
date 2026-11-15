import { describe, it, expect } from 'vitest'
// `?raw` is handled by Vite (typed by vite/client), so no Node types are needed in the web build.
import raw from '../../vercel.json?raw'

// Frontend Vercel project uses Root Directory = web, so paths here are relative to web/.
const cfg = JSON.parse(raw)

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
