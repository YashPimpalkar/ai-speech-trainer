import { createApp } from './app.js'
import { config } from './config.js'
import { lazyStore, memoryStore, pgStore } from './history.js'
import { makeLlm } from './llm.js'
import { listModels } from './models/registry.js'
import { transcribe } from './voice/stt-groq.js'
import { synthesize } from './voice/tts-gemini.js'

/** One place that wires the app; used by the local server (index.ts) and the Vercel function (handler.ts). */
export function buildApp() {
  const url = process.env.DATABASE_URL
  if (!url) console.warn('History: DATABASE_URL not set, using in-memory store (lost on restart)')
  const history = url
    ? lazyStore(async () => { const s = await pgStore(url); console.log('History: Postgres'); return s })
    : memoryStore()

  return createApp({
    history,
    listModels: () => listModels(config.keys()),
    makeLlm,
    stt: (audio, name, mime) => transcribe(audio, name, mime),
    tts: (text, voice) => synthesize(text, voice),
  }, { corsOrigins: config.corsOrigins })
}
