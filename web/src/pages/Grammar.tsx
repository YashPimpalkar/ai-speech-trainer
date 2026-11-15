import { useState } from 'react'
import { post } from '../lib/api'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg, Field, Label } from '../components/ui'

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
  const [out, setOut] = useState<any>(null)
  const { loading, error, run } = useRun()

  const go = async () => {
    const body = mode === 'tense' ? { mode, tense: tense.startsWith('all') ? 'all' : tense } : { mode, direction, sentence }
    const r = await run(() => post<any>('grammar', body))
    if (r) setOut(r)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex gap-2">
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
              {TENSES.map((t) => <option key={t} className="text-black">{t}</option>)}
            </select></label>
        ) : (
          <>
            <label><Label>Direction</Label>
              <select className={Field} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                <option value="active-to-passive" className="text-black">Active → Passive</option>
                <option value="passive-to-active" className="text-black">Passive → Active</option>
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
        <Card className="space-y-4 text-sm">
          <h3 className="text-lg font-semibold">{out.title}</h3>
          <p>{out.rule}</p>
          <p className="rounded-lg bg-black/5 p-3 font-mono dark:bg-white/10">{out.structure}</p>
          <ul className="space-y-1">{out.examples?.map((e: any, i: number) => <li key={i}>• <b>{e.sentence}</b> <span className="text-zinc-500">{e.note}</span></li>)}</ul>
          <Listen text={(out.examples ?? []).map((e: any) => e.sentence).join(' ')} />
          {out.quiz?.length > 0 && (
            <div><Label>Quiz</Label>
              {out.quiz.map((q: any, i: number) => <details key={i} className="py-1"><summary className="cursor-pointer">{q.q}</summary><b>{q.a}</b></details>)}</div>
          )}
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <Label>Practice: write your own sentence in this tense</Label>
            <textarea className={Field} rows={2} value={practice} onChange={(e) => setPractice(e.target.value)} />
            <Improve text={practice} />
          </div>
        </Card>
      )}

      {out && mode === 'voice' && (
        <Card className="space-y-3 text-sm">
          <p className="text-zinc-500 line-through">{out.original}</p>
          <p className="text-lg font-semibold">{out.converted}</p>
          <Listen text={out.converted} />
          <ol className="list-decimal pl-5">{out.steps?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
          {out.examples?.map((e: any, i: number) => <p key={i}>{e.active} <span className="text-zinc-500">⇄</span> {e.passive}</p>)}
        </Card>
      )}
    </div>
  )
}
