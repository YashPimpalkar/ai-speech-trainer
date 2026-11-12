import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import type { ZodType } from 'zod'
import type { Llm, ChatMsg } from '../types.js'
import { parseJson } from '../json.js'

export { Annotation, StateGraph, START, END }

/** Ask for JSON; retry once with a reminder if the reply can't be parsed/validated. */
export async function askJson<T>(llm: Llm, messages: ChatMsg[], schema: ZodType<T>): Promise<T> {
  let reply = await llm.invoke(messages)
  try {
    return parseJson(reply, schema)
  } catch {
    reply = await llm.invoke([
      ...messages,
      { role: 'assistant', content: reply },
      { role: 'user', content: 'Invalid. Reply again with ONLY the valid JSON object, no other text.' },
    ])
    return parseJson(reply, schema)
  }
}

export const JSON_ONLY = 'Respond with ONLY a single valid JSON object, no markdown, no commentary.'
