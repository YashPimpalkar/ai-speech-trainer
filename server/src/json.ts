import type { ZodType } from 'zod'

/** Extract and validate the first JSON object in an LLM reply (tolerates code fences / chatter). */
export function parseJson<T>(text: string, schema: ZodType<T>): T {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model did not return JSON')
  return schema.parse(JSON.parse(text.slice(start, end + 1)))
}
