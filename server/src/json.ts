import { z, type ZodType } from 'zod'

/** Extract and validate the first JSON object in an LLM reply (tolerates code fences / chatter). */
export function parseJson<T>(text: string, schema: ZodType<T>): T {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Model did not return JSON')
  return schema.parse(JSON.parse(text.slice(start, end + 1)))
}

/** Render any JSON value as readable text (objects -> "key: value" lines). */
export function toText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(toText).join('\n')
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${toText(x)}`).join('\n')
  return String(v)
}

/** String field that tolerates models returning objects/arrays/null instead of text. */
export const looseText = z.preprocess(toText, z.string())
