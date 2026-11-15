import { describe, it, expect } from 'vitest'
import type { Llm } from '../src/types.js'
import { runPartner } from '../src/agents/partner.js'
import { runImprove } from '../src/agents/improve.js'
import { runCoach } from '../src/agents/coach.js'
import { runGrammar } from '../src/agents/grammar.js'
import { runEssay, countWords } from '../src/agents/essay.js'
import { runEmail } from '../src/agents/email.js'
import { parseJson } from '../src/json.js'
import { z } from 'zod'

const fake = (...replies: string[]): Llm & { calls: number } => {
  const l = { calls: 0, async invoke() { return replies[Math.min(l.calls++, replies.length - 1)] } }
  return l
}

describe('parseJson', () => {
  it('handles fenced and wrapped json', () => {
    expect(parseJson('```json\n{"a":1}\n```', z.object({ a: z.number() }))).toEqual({ a: 1 })
    expect(parseJson('Sure! {"a":2} done', z.object({ a: z.number() }))).toEqual({ a: 2 })
  })
  it('throws on schema mismatch', () => {
    expect(() => parseJson('{"a":"x"}', z.object({ a: z.number() }))).toThrow()
  })
})

describe('agents', () => {
  it('partner returns the reply text', async () => {
    expect(await runPartner(fake('Hey! Tell me more.'), [{ role: 'user', content: 'hi' }])).toBe('Hey! Tell me more.')
  })

  it('improve returns corrected/improved structure', async () => {
    const out = await runImprove(fake('{"corrected":"I went home.","improved":"I headed home.","why":["past tense"],"accentTips":["stress HEAD-ed"]}'), 'I go home yesterday')
    expect(out.improved).toBe('I headed home.')
    expect(out.why).toHaveLength(1)
  })

  it('improve retries once when the model returns bad json', async () => {
    const llm = fake('not json', '{"corrected":"a","improved":"b","why":[],"accentTips":[]}')
    const out = await runImprove(llm, 'x')
    expect(out.improved).toBe('b')
    expect(llm.calls).toBe(2)
  })

  it('coach runs analyze then rewrite', async () => {
    const llm = fake(
      '{"errors":[{"original":"I goed","corrected":"I went","rule":"irregular past"}],"score":70}',
      '{"improvedVersion":"I went to the market.","tips":["use past simple"],"accentTips":["market: MAR-kit"]}',
    )
    const r = await runCoach(llm, [{ role: 'user', content: 'I goed to market' }])
    expect(r.errors[0].corrected).toBe('I went')
    expect(r.improvedVersion).toContain('market')
    expect(llm.calls).toBe(2)
  })

  it('grammar supports tense and voice modes', async () => {
    const tense = await runGrammar(fake('{"title":"Present Perfect","rule":"have/has + V3","structure":"S + have + V3","examples":[{"sentence":"I have eaten.","note":"done"}],"quiz":[{"q":"She ___ (go)","a":"has gone"}]}'), { mode: 'tense', tense: 'present perfect' })
    expect((tense as any).title).toBe('Present Perfect')
    const voice = await runGrammar(fake('{"direction":"active-to-passive","original":"Tom ate the cake.","converted":"The cake was eaten by Tom.","steps":["swap"],"examples":[{"active":"A","passive":"B"}]}'), { mode: 'voice', direction: 'active-to-passive', sentence: 'Tom ate the cake.' })
    expect((voice as any).converted).toContain('was eaten')
  })

  it('grammar tolerates structured values where text is expected', async () => {
    const out: any = await runGrammar(fake('{"title":"All Tenses","rule":["Simple: base verb","Perfect: have + V3"],"structure":{"simple present":"S + V1","simple past":"S + V2"},"examples":[{"sentence":"I eat.","note":null}],"quiz":[{"q":"She ___ (go)","a":{"answer":"goes"}}]}'), { mode: 'tense', tense: 'all' })
    expect(typeof out.structure).toBe('string')
    expect(out.structure).toContain('simple present: S + V1')
    expect(out.rule).toContain('Perfect: have + V3')
    expect(out.examples[0].note).toBe('')
  })

  it('essay retries until near 500 words', async () => {
    const short = Array(100).fill('word').join(' ')
    const good = Array(500).fill('word').join(' ')
    const llm = fake(`{"title":"Pen","essay":"${short}"}`, `{"title":"Pen","essay":"${good}"}`)
    const r = await runEssay(llm, 'pen')
    expect(r.wordCount).toBe(500)
    expect(llm.calls).toBe(2)
    expect(countWords('a b  c')).toBe(3)
  })

  it('essay gives up after max attempts and returns the best effort', async () => {
    const short = Array(100).fill('word').join(' ')
    const llm = fake(`{"title":"Pen","essay":"${short}"}`)
    const r = await runEssay(llm, 'pen')
    expect(r.wordCount).toBe(100)
    expect(llm.calls).toBe(3)
  })

  it('email drafts then polishes', async () => {
    const llm = fake(
      '{"subject":"Leave request","body":"Dear Sir,\\nI need leave.\\nRegards"}',
      '{"subject":"Leave Request: 12 Nov","body":"Dear Mr. Rao,\\nI would like to request leave.\\nKind regards,\\nSujay","alternatives":[{"tone":"friendly","body":"Hi Rao,..."}],"notes":["more polite"]}',
    )
    const r = await runEmail(llm, { notes: 'need leave', recipient: 'boss', tone: 'formal' })
    expect(r.subject).toContain('Leave')
    expect(r.alternatives).toHaveLength(1)
    expect(llm.calls).toBe(2)
  })
})
