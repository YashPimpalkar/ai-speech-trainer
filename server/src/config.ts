import 'dotenv/config'
import type { Provider } from './types.js'

export const config = {
  port: Number(process.env.PORT ?? 8787),
  keys: (): Partial<Record<Provider, string>> => ({
    groq: process.env.GROQ_API_KEY || undefined,
    gemini: process.env.GEMINI_API_KEY || undefined,
  }),
  // Defaults are env-overridable so nothing is pinned to a model that may expire.
  sttModel: process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo',
  ttsModel: process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts',
}
