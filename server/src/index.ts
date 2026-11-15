import { createApp } from './app.js'
import { config } from './config.js'
import { listModels } from './models/registry.js'
import { makeLlm } from './llm.js'
import { transcribe } from './voice/stt-groq.js'
import { synthesize } from './voice/tts-gemini.js'
import { memoryStore, pgStore } from './history.js'

let history
if (process.env.DATABASE_URL) {
  history = await pgStore(process.env.DATABASE_URL)
  console.log('History: Postgres')
} else {
  history = memoryStore()
  console.warn('History: DATABASE_URL not set, using in-memory store (lost on restart)')
}

const app = createApp({
  history,
  listModels: () => listModels(config.keys()),
  makeLlm,
  stt: (audio, name, mime) => transcribe(audio, name, mime),
  tts: (text, voice) => synthesize(text, voice),
})
app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`))
