import express, { type Request, type Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import { z } from 'zod'
import type { ChatMsg, Llm, ModelSelection } from './types.js'
import type { ModelList } from './models/registry.js'
import type { VoiceKind } from './voice/tts-gemini.js'
import { runPartner } from './agents/partner.js'
import { runImprove } from './agents/improve.js'
import { runCoach } from './agents/coach.js'
import { runGrammar } from './agents/grammar.js'
import { runEssay } from './agents/essay.js'
import { runEmail } from './agents/email.js'
import { KINDS, type HistoryStore } from './history.js'

export interface Deps {
  listModels: () => Promise<ModelList>
  makeLlm: (candidates: ModelSelection[], temperature?: number) => Llm
  stt: (audio: Buffer, filename: string, mime: string) => Promise<string>
  tts: (text: string, voice: VoiceKind) => Promise<Buffer | null>
  history: HistoryStore
}

const Sel = z.object({ provider: z.enum(['groq', 'gemini']), model: z.string().min(1) })
const Base = z.object({ model: Sel, fallbacks: z.array(Sel).default([]) })
const Msgs = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1)

export interface AppOptions { corsOrigins?: string[] }

export function createApp(deps: Deps, opts: AppOptions = {}) {
  const app = express()
  // With CORS_ORIGINS set (production), only those sites may call the API; otherwise open for local dev.
  app.use(cors(opts.corsOrigins?.length ? { origin: opts.corsOrigins } : undefined))
  app.use(express.json({ limit: '1mb' }))
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

  /** Validate body, build an Llm with fallback chain, run the handler, map errors. */
  const route = <S extends z.ZodTypeAny>(schema: S, run: (llm: Llm, body: z.infer<S>) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return void res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
      const b = parsed.data as z.infer<typeof Base>
      try {
        const llm = deps.makeLlm([b.model, ...b.fallbacks])
        const out = await run(llm, parsed.data)
        res.json({ ...(typeof out === 'object' && out !== null ? out : { result: out }), modelUsed: llm.lastUsed ?? b.model })
      } catch (e) {
        res.status(502).json({ error: (e as Error).message ?? 'Model error' })
      }
    }

  app.get('/api/health', (_q, r) => void r.json({ ok: true }))
  app.get('/api/models', async (_q, r) => void r.json(await deps.listModels()))

  app.post('/api/chat', route(Base.extend({ messages: Msgs }), async (llm, b) => ({ reply: await runPartner(llm, b.messages as ChatMsg[]) })))
  app.post('/api/coach', route(Base.extend({ messages: Msgs }), (llm, b) => runCoach(llm, b.messages as ChatMsg[])))
  app.post('/api/improve', route(Base.extend({ text: z.string().min(1) }), (llm, b) => runImprove(llm, b.text)))
  app.post('/api/grammar', route(
    Base.and(z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('tense'), tense: z.string().min(1) }),
      z.object({ mode: z.literal('voice'), direction: z.enum(['active-to-passive', 'passive-to-active']), sentence: z.string().min(1) }),
    ])),
    (llm, b) => runGrammar(llm, b as any),
  ))
  app.post('/api/essay', route(Base.extend({ topic: z.string().min(1) }), (llm, b) => runEssay(llm, b.topic)))
  app.post('/api/email', route(
    Base.extend({ notes: z.string().default(''), recipient: z.string().optional(), tone: z.string().optional(), length: z.string().optional(), ownDraft: z.string().optional() })
      .refine((v) => v.notes || v.ownDraft, { message: 'notes or ownDraft required' }),
    (llm, b) => runEmail(llm, b),
  ))

  app.post('/api/stt', upload.single('audio'), async (req, res) => {
    if (!req.file) return void res.status(400).json({ error: 'audio file required' })
    try {
      res.json({ text: await deps.stt(req.file.buffer, req.file.originalname || 'audio.webm', req.file.mimetype || 'audio/webm') })
    } catch (e) {
      res.status(502).json({ error: (e as Error).message })
    }
  })

  app.post('/api/tts', async (req, res) => {
    const p = z.object({ text: z.string().min(1).max(8000), voice: z.enum(['female', 'male']) }).safeParse(req.body)
    if (!p.success) return void res.status(400).json({ error: 'text and voice required' })
    const audio = await deps.tts(p.data.text, p.data.voice)
    if (!audio) return void res.status(501).json({ fallback: true, error: 'Server TTS unavailable; use browser voice' })
    res.type('audio/wav').send(audio)
  })

  // ---- history (persisted in Postgres; in-memory fallback without DATABASE_URL) ----
  const Id = z.string().uuid()
  const guard = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try { await fn(req, res) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
  }
  app.get('/api/history', guard(async (req, res) => {
    const kind = z.enum(KINDS).optional().safeParse(req.query.kind)
    if (!kind.success) return void res.status(400).json({ error: 'invalid kind' })
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    res.json({ items: await deps.history.list(kind.data, limit) })
  }))
  app.get('/api/history/:id', guard(async (req, res) => {
    if (!Id.safeParse(String(req.params.id)).success) return void res.status(404).json({ error: 'not found' })
    const item = await deps.history.get(String(req.params.id))
    item ? res.json(item) : res.status(404).json({ error: 'not found' })
  }))
  app.post('/api/history', guard(async (req, res) => {
    const p = z.object({ kind: z.enum(KINDS), title: z.string().min(1).max(200), payload: z.unknown().default({}) }).safeParse(req.body)
    if (!p.success) return void res.status(400).json({ error: p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
    res.status(201).json(await deps.history.create(p.data.kind, p.data.title, p.data.payload))
  }))
  app.put('/api/history/:id', guard(async (req, res) => {
    const p = z.object({ title: z.string().min(1).max(200).optional(), payload: z.unknown().optional() }).safeParse(req.body)
    if (!p.success || !Id.safeParse(String(req.params.id)).success) return void res.status(400).json({ error: 'invalid request' })
    const item = await deps.history.update(String(req.params.id), p.data)
    item ? res.json(item) : res.status(404).json({ error: 'not found' })
  }))
  app.delete('/api/history/:id', guard(async (req, res) => {
    if (!Id.safeParse(String(req.params.id)).success) return void res.status(404).json({ error: 'not found' })
    ;(await deps.history.remove(String(req.params.id))) ? res.status(204).end() : res.status(404).json({ error: 'not found' })
  }))

  return app
}
