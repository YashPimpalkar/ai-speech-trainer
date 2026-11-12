import { z } from 'zod'
import type { Llm } from '../types.js'
import { askJson, JSON_ONLY, Annotation, StateGraph, START, END } from './util.js'

const EssaySchema = z.object({ title: z.string(), essay: z.string() })
export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const MIN = 450, MAX = 550, ATTEMPTS = 3

const State = Annotation.Root({
  topic: Annotation<string>(),
  title: Annotation<string>(),
  essay: Annotation<string>(),
  wordCount: Annotation<number>(),
  attempts: Annotation<number>(),
})

export async function runEssay(llm: Llm, topic: string) {
  const g = new StateGraph(State)
    .addNode('writeStep', async (s) => {
      const hint = s.attempts && s.wordCount
        ? ` Your previous draft had ${s.wordCount} words; rewrite so it has EXACTLY about 500 words.`
        : ''
      const r = await askJson(llm, [
        { role: 'system', content: `You are an expert English writer. Write a clear, engaging essay of about 500 words on the given object/topic, in natural fluent English suitable for a learner to read aloud (paragraphs separated by blank lines).${hint} ${JSON_ONLY} Keys: title, essay.` },
        { role: 'user', content: s.topic },
      ], EssaySchema)
      return { title: r.title, essay: r.essay, wordCount: countWords(r.essay), attempts: (s.attempts ?? 0) + 1 }
    })
    .addEdge(START, 'writeStep')
    .addConditionalEdges('writeStep', (s) =>
      s.wordCount >= MIN && s.wordCount <= MAX ? END : s.attempts >= ATTEMPTS ? END : 'writeStep')
    .compile()
  const out = await g.invoke({ topic, attempts: 0 })
  return { title: out.title, essay: out.essay, wordCount: out.wordCount }
}
