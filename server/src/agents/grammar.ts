import { z } from 'zod'
import type { Llm } from '../types.js'
import { askJson, JSON_ONLY, Annotation, StateGraph, START, END } from './util.js'

const TenseSchema = z.object({
  title: z.string(), rule: z.string(), structure: z.string(),
  examples: z.array(z.object({ sentence: z.string(), note: z.string().default('') })),
  quiz: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
})
const VoiceSchema = z.object({
  direction: z.string(), original: z.string(), converted: z.string(),
  steps: z.array(z.string()).default([]),
  examples: z.array(z.object({ active: z.string(), passive: z.string() })).default([]),
})

export type GrammarInput =
  | { mode: 'tense'; tense: string }
  | { mode: 'voice'; direction: 'active-to-passive' | 'passive-to-active'; sentence: string }

const State = Annotation.Root({ input: Annotation<GrammarInput>(), out: Annotation<unknown>() })

export async function runGrammar(llm: Llm, input: GrammarInput): Promise<unknown> {
  const g = new StateGraph(State)
    .addNode('teach', async (s) => {
      const i = s.input
      if (i.mode === 'tense')
        return { out: await askJson(llm, [
          { role: 'system', content: `You are a patient English grammar teacher. Teach the tense "${i.tense}" (if "all", teach an overview of all 12 tenses inside "rule" and "structure", with one example each). Include affirmative/negative/question forms, when to use it, 5 examples, and a 3-question quiz with answers. ${JSON_ONLY} Keys: title, rule, structure, examples[{sentence,note}], quiz[{q,a}].` },
          { role: 'user', content: i.tense },
        ], TenseSchema) }
      return { out: await askJson(llm, [
        { role: 'system', content: `You are a patient English grammar teacher. Convert the sentence ${i.direction.replace('-to-', ' to ')} voice, explain step by step, and give 3 more example pairs. Preserve the tense. ${JSON_ONLY} Keys: direction, original, converted, steps[], examples[{active,passive}].` },
        { role: 'user', content: i.sentence },
      ], VoiceSchema) }
    })
    .addEdge(START, 'teach')
    .addEdge('teach', END)
    .compile()
  return (await g.invoke({ input })).out
}
