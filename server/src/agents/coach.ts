import { z } from 'zod'
import type { ChatMsg, Llm } from '../types.js'
import { askJson, JSON_ONLY, Annotation, StateGraph, START, END } from './util.js'

const AnalyzeSchema = z.object({
  errors: z.array(z.object({ original: z.string(), corrected: z.string(), rule: z.string() })).default([]),
  score: z.number().default(0),
})
const RewriteSchema = z.object({
  improvedVersion: z.string(),
  tips: z.array(z.string()).default([]),
  accentTips: z.array(z.string()).default([]),
})
export type CoachReport = z.infer<typeof AnalyzeSchema> & z.infer<typeof RewriteSchema>

const State = Annotation.Root({
  transcript: Annotation<string>(),
  analysis: Annotation<z.infer<typeof AnalyzeSchema>>(),
  rewrite: Annotation<z.infer<typeof RewriteSchema>>(),
})

export async function runCoach(llm: Llm, history: ChatMsg[]): Promise<CoachReport> {
  const transcript = history.filter((m) => m.role === 'user').map((m) => `- ${m.content}`).join('\n')
  const g = new StateGraph(State)
    .addNode('analyze', async (s) => ({
      analysis: await askJson(llm, [
        { role: 'system', content: `You are an English grammar examiner. List each grammar/tense/word-choice mistake in the learner's sentences (original, corrected, short rule name) and a 0-100 fluency score. ${JSON_ONLY} Keys: errors[{original,corrected,rule}], score.` },
        { role: 'user', content: s.transcript },
      ], AnalyzeSchema),
    }))
    .addNode('rewriteStep', async (s) => ({
      rewrite: await askJson(llm, [
        { role: 'system', content: `You are a confident male English coach. Rewrite everything the learner said as ONE improved, natural, fluent spoken passage a native man would say ("improvedVersion"), then give "tips" (what to practise) and "accentTips" (stress/pronunciation). Mistakes found: ${JSON.stringify(s.analysis.errors)}. ${JSON_ONLY} Keys: improvedVersion, tips[], accentTips[].` },
        { role: 'user', content: s.transcript },
      ], RewriteSchema),
    }))
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'rewriteStep')
    .addEdge('rewriteStep', END)
    .compile()
  const out = await g.invoke({ transcript })
  return { ...out.analysis, ...out.rewrite }
}
