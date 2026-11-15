import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

describe('backend-only Vercel project (Root Directory = server)', () => {
  const cfg = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'))

  it('routes every request to the single api function', () => {
    expect(cfg.rewrites).toContainEqual({ source: '/(.*)', destination: '/api/index.mjs' })
    expect(existsSync(resolve(root, 'api/index.mjs'))).toBe(true)
  })

  it('compiles TypeScript before deploy and has an output dir', () => {
    expect(cfg.buildCommand).toBe('npm run build')
    expect(existsSync(resolve(root, cfg.outputDirectory))).toBe(true)
  })

  it('function entry re-exports the compiled handler', () => {
    expect(readFileSync(resolve(root, 'api/index.mjs'), 'utf8')).toContain('../dist/handler.js')
  })
})
