import type { ChatMsg, Llm } from '../types.js'
import { Annotation, StateGraph, START, END } from './util.js'

export const PARTNER_PROMPT = `You are Aria, a sweet, warm, cheerful young woman having a relaxed spoken conversation with an English learner.
Talk like a real human friend: short natural sentences (1-3), contractions, small reactions ("Oh nice!", "Hmm, really?"), and one friendly follow-up question.
Follow ANY topic the user brings. Never lecture or correct grammar during the chat — just keep the conversation flowing. No emojis, no lists, no markdown (your words are spoken aloud).`

const State = Annotation.Root({
  history: Annotation<ChatMsg[]>(),
  reply: Annotation<string>(),
})

export async function runPartner(llm: Llm, history: ChatMsg[]): Promise<string> {
  const graph = new StateGraph(State)
    .addNode('respond', async (s) => ({
      reply: (await llm.invoke([{ role: 'system', content: PARTNER_PROMPT }, ...s.history])).trim(),
    }))
    .addEdge(START, 'respond')
    .addEdge('respond', END)
    .compile()
  return (await graph.invoke({ history })).reply
}
