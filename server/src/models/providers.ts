import { ChatGroq } from '@langchain/groq'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { ModelSelection } from '../types.js'
import { config } from '../config.js'

type Factory = (model: string, key: string, temperature: number) => BaseChatModel

/** Add a provider here (plus a key in config + discovery in registry.ts) — see skill add-model-provider. */
const factories: Record<string, Factory> = {
  groq: (model, apiKey, temperature) => new ChatGroq({ model, apiKey, temperature, maxRetries: 0 }),
  gemini: (model, apiKey, temperature) => new ChatGoogleGenerativeAI({ model, apiKey, temperature, maxRetries: 0 }),
}

export function createChatModel(sel: ModelSelection, temperature = 0.7): BaseChatModel {
  const key = config.keys()[sel.provider]
  const make = factories[sel.provider]
  if (!make) throw Object.assign(new Error(`Unknown provider ${sel.provider}`), { status: 400 })
  if (!key) throw Object.assign(new Error(`No API key for ${sel.provider}`), { status: 401 })
  return make(sel.model, key, temperature)
}
