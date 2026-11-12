import { describe, it, expect, vi } from 'vitest'
import { listModels, resetModelCache } from '../src/models/registry.js'

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('listModels', () => {
  it('discovers chat models from both providers and drops non-chat ones', async () => {
    resetModelCache()
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('groq.com'))
        return json({ data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'whisper-large-v3' }, { id: 'playai-tts' }] })
      return json({
        models: [
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
        ],
      })
    })
    const out = await listModels({ groq: 'g', gemini: 'k' }, fetchImpl as unknown as typeof fetch)
    expect(out.models.map((m) => `${m.provider}:${m.id}`)).toEqual([
      'groq:llama-3.3-70b-versatile',
      'gemini:gemini-2.5-flash',
    ])
    expect(out.providers).toEqual({ groq: true, gemini: true })
  })

  it('skips a provider without a key and reports it disabled', async () => {
    resetModelCache()
    const fetchImpl = vi.fn(async () => json({ data: [{ id: 'm1' }] }))
    const out = await listModels({ groq: 'g' }, fetchImpl as unknown as typeof fetch)
    expect(out.providers).toEqual({ groq: true, gemini: false })
    expect(out.models).toHaveLength(1)
  })

  it('survives a provider failure', async () => {
    resetModelCache()
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response)
    const out = await listModels({ groq: 'g' }, fetchImpl as unknown as typeof fetch)
    expect(out.models).toEqual([])
    expect(out.errors.groq).toBeDefined()
  })
})
