import type { ChatMsg, Llm, ModelSelection } from './types.js'
import { withFallback } from './models/fallback.js'
import { createChatModel } from './models/providers.js'

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : (c as any)?.text ?? '')).join('')
  return String(content ?? '')
}

/** Build an Llm over an ordered list of models; automatically fails over when a model expires/limits. */
export function makeLlm(candidates: ModelSelection[], temperature = 0.7): Llm {
  const llm: Llm = {
    async invoke(messages: ChatMsg[]) {
      const { result, used } = await withFallback(candidates, async (sel) => {
        const model = createChatModel(sel, temperature)
        const res = await model.invoke(messages.map((m) => [m.role, m.content] as [string, string]))
        return textOf(res.content)
      })
      llm.lastUsed = used
      return result
    },
  }
  return llm
}
