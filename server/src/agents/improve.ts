import { z } from 'zod'
import type { Llm } from '../types.js'
import { askJson, JSON_ONLY, Annotation, StateGraph, START, END } from './util.js'

export const ImproveSchema = z.object({
  corrected: z.string(),
  improved: z.string(),
  why: z.array(z.string()).default([]),
  accentTips: z.array(z.string()).default([]),
})
export type Improvement = z.infer<typeof ImproveSchema>

const SYSTEM = `You are a supportive male English coach with a clear, confident, neutral-professional accent.
Given the learner's text: (1) "corrected" = same meaning with grammar fixed; (2) "improved" = a more natural, fluent, advanced version a confident native man would say; (3) "why" = short bullet reasons for the changes; (4) "accentTips" = how to pronounce/stress key words so it sounds right when spoken.
${JSON_ONLY} Keys: corrected, improved, why[], accentTips[].`

const State = Annotation.Root({ text: Annotation<string>(), out: Annotation<Improvement>() })

export async function runImprove(llm: Llm, text: string): Promise<Improvement> {
  const g = new StateGraph(State)
    .addNode('improve', async (s) => ({
      out: await askJson(llm, [{ role: 'system', content: SYSTEM }, { role: 'user', content: s.text }], ImproveSchema),
    }))
    .addEdge(START, 'improve')
    .addEdge('improve', END)
    .compile()
  return (await g.invoke({ text })).out
}
