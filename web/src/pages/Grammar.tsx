import { useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { saveItem } from '../store/historySlice'
import { setResult } from '../store/resultsSlice'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Badge, Button, Card, ErrorMsg, Field, Label, PageHeader, optionCls } from '../components/ui'

export const TENSES = [
  'all tenses overview',
  'simple present', 'present continuous', 'present perfect', 'present perfect continuous',
  'simple past', 'past continuous', 'past perfect', 'past perfect continuous',
  'simple future', 'future continuous', 'future perfect', 'future perfect continuous',
]

export default function Grammar() {
  const [mode, setMode] = useState<'tense' | 'voice'>('tense')
  const [tense, setTense] = useState(TENSES[0])
  const [direction, setDirection] = useState<'active-to-passive' | 'passive-to-active'>('active-to-passive')
  const [sentence, setSentence] = useState('')
  const [practice, setPractice] = useState('')
  const dispatch = useAppDispatch()
  const out = useAppSelector((st) => st.results.grammar) ?? null
  const setOut = (value: unknown) => dispatch(setResult({ page: 'grammar', value }))
  const { loading, error, run } = useRun()

  const go = async () => {
    const body = mode === 'tense' ? { mode, tense: tense.startsWith('all') ? 'all' : tense } : { mode, direction, sentence }
    const r = await run(() => post<any>('grammar', body))
    if (!r) return
    setOut(r)
    void dispatch(saveItem({ kind: 'grammar', title: mode === 'tense' ? tense : sentence, payload: { input: body, output: r } }))
  }

  return (
    <div>
      <PageHeader title="Grammar Coach" subtitle="Learn any tense, or flip sentences between the two voices." />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['tense', 'voice'] as const).map((m) => (
          <Button key={m} variant={mode === m ? 'solid' : 'ghost'} onClick={() => { setMode(m); setOut(null) }}>
            {m === 'tense' ? 'Tenses' : 'Active ⇄ Passive'}
          </Button>
        ))}
      </div>

      <Card className="space-y-3">
        {mode === 'tense' ? (
          <label><Label>Tense</Label>
            <select className={Field} value={tense} onChange={(e) => setTense(e.target.value)}>
              {TENSES.map((t) => <option key={t} className={optionCls}>{t}</option>)}
            </select></label>
        ) : (
          <>
            <label><Label>Direction</Label>
              <select className={Field} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                <option value="active-to-passive" className={optionCls}>Active → Passive</option>
                <option value="passive-to-active" className={optionCls}>Passive → Active</option>
              </select></label>
            <label><Label>Sentence</Label>
              <textarea className={Field} rows={2} value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="Tom ate the cake." /></label>
            <Improve text={sentence} label="Improve my sentence" />
          </>
        )}
        <Button onClick={go} disabled={loading || (mode === 'voice' && !sentence.trim())}>{loading ? 'Thinking…' : 'Teach me'}</Button>
        <ErrorMsg text={error} />
      </Card>

      {out && mode === 'tense' && (
        <Card className="mt-5 space-y-5 text-sm">
          <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold tracking-tight">{out.title}</h2><Badge>Lesson</Badge></div>
          <div><Label>Core rule</Label><p className="whitespace-pre-wrap leading-relaxed">{out.rule}</p></div>
          <div><Label>Syntax structure</Label><p className="whitespace-pre-wrap rounded-xl border border-black/10 bg-neutral-50 p-3 font-mono text-xs dark:border-white/10 dark:bg-black">{out.structure}</p></div>
          <div>
            <Label>Examples</Label>
            <ul className="space-y-1.5">{out.examples?.map((e: any, i: number) => <li key={i}>• <b>{e.sentence}</b> <span className="text-neutral-500">{e.note}</span></li>)}</ul>
            <div className="mt-2"><Listen text={(out.examples ?? []).map((e: any) => e.sentence).join(' ')} /></div>
          </div>
          {out.quiz?.length > 0 && (
            <div><Label>Checkpoint quiz</Label>
              {out.quiz.map((q: any, i: number) => <details key={i} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10 [&:not(:first-of-type)]:mt-2"><summary className="cursor-pointer">{q.q}</summary><b className="mt-1 block">{q.a}</b></details>)}</div>
          )}
          <div className="border-t border-black/10 pt-4 dark:border-white/10">
            <Label>Practice: write your own sentence in this tense</Label>
            <textarea className={Field} rows={2} value={practice} onChange={(e) => setPractice(e.target.value)} />
            <Improve text={practice} />
          </div>
        </Card>
      )}

      {out && mode === 'voice' && (
        <Card className="mt-5 space-y-4 text-sm">
          <div><Label>Original</Label><p className="text-neutral-500 line-through">{out.original}</p></div>
          <div><Label>Converted</Label><p className="text-xl font-semibold tracking-tight">{out.converted}</p><div className="mt-2"><Listen text={out.converted} /></div></div>
          {out.steps?.length > 0 && <div><Label>Steps</Label><ol className="list-decimal space-y-1 pl-5">{out.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol></div>}
          {out.examples?.length > 0 && <div><Label>More examples</Label>{out.examples.map((e: any, i: number) => <p key={i}>{e.active} <span className="text-neutral-500">⇄</span> {e.passive}</p>)}</div>}
        </Card>
      )}
    </div>
  )
}
