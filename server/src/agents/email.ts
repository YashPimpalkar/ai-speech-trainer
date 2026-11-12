import { z } from 'zod'
import type { Llm } from '../types.js'
import { askJson, JSON_ONLY, Annotation, StateGraph, START, END } from './util.js'

const DraftSchema = z.object({ subject: z.string(), body: z.string() })
const FinalSchema = DraftSchema.extend({
  alternatives: z.array(z.object({ tone: z.string(), body: z.string() })).default([]),
  notes: z.array(z.string()).default([]),
})
export type EmailResult = z.infer<typeof FinalSchema>
export interface EmailInput { notes: string; recipient?: string; tone?: string; length?: string; ownDraft?: string }

const State = Annotation.Root({
  input: Annotation<EmailInput>(),
  draft: Annotation<z.infer<typeof DraftSchema>>(),
  out: Annotation<EmailResult>(),
})

export async function runEmail(llm: Llm, input: EmailInput): Promise<EmailResult> {
  const ctx = `Recipient: ${input.recipient ?? 'colleague'}. Tone: ${input.tone ?? 'formal'}. Length: ${input.length ?? 'medium'}.`
  const g = new StateGraph(State)
    .addNode('draftStep', async (s) => ({
      draft: await askJson(llm, [
        { role: 'system', content: `You write professional workplace emails in correct, natural English. ${ctx} ${s.input.ownDraft ? 'Rewrite the user\'s own draft professionally, keeping its meaning.' : 'Write the email from the user\'s notes.'} ${JSON_ONLY} Keys: subject, body (with greeting and sign-off).` },
        { role: 'user', content: s.input.ownDraft ? `Notes: ${s.input.notes}\nMy draft:\n${s.input.ownDraft}` : s.input.notes },
      ], DraftSchema),
    }))
    .addNode('polishStep', async (s) => ({
      out: await askJson(llm, [
        { role: 'system', content: `Polish this email for clarity, concision and professional tone. ${ctx} Also give 2 short alternative versions in other tones ("alternatives") and brief "notes" on what you improved. ${JSON_ONLY} Keys: subject, body, alternatives[{tone,body}], notes[].` },
        { role: 'user', content: JSON.stringify(s.draft) },
      ], FinalSchema),
    }))
    .addEdge(START, 'draftStep')
    .addEdge('draftStep', 'polishStep')
    .addEdge('polishStep', END)
    .compile()
  return (await g.invoke({ input })).out
}
