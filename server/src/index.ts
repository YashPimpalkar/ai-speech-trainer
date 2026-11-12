import { createApp } from './app.js'
import { config } from './config.js'
import { listModels } from './models/registry.js'
import { makeLlm } from './llm.js'
import { transcribe } from './voice/stt-groq.js'
import { synthesize } from './voice/tts-gemini.js'

const app = createApp({
  listModels: () => listModels(config.keys()),
  makeLlm,
  stt: (audio, name, mime) => transcribe(audio, name, mime),
  tts: (text, voice) => synthesize(text, voice),
})
app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`))
