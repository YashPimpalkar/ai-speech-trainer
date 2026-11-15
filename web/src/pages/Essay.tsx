import { useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { saveItem } from '../store/historySlice'
import { setResult } from '../store/resultsSlice'
import { readTime } from '../lib/historyUtils'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Badge, Button, Card, ErrorMsg, Field, Label, PageHeader } from '../components/ui'

export default function Essay() {
  const [topic, setTopic] = useState('')
  const dispatch = useAppDispatch()
  const out = (useAppSelector((st) => st.results.essay) ?? null) as { title: string; essay: string; wordCount: number } | null
  const [retell, setRetell] = useState('')
  const { loading, error, run } = useRun()

  const go = async () => {
    const r = await run(() => post<NonNullable<typeof out>>('essay', { topic }))
    if (!r) return
    dispatch(setResult({ page: 'essay', value: r }))
    void dispatch(saveItem({ kind: 'essay', title: topic, payload: { input: { topic }, output: r } }))
  }

  return (
    <div>
      <PageHeader title="Essay Studio" subtitle="Name any object or topic. Get a clear 500-word essay, hear it read aloud, then retell it in your own words." />
      <Card className="space-y-3">
        <label><Label>Topic or prompt</Label>
          <input className={Field} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && topic.trim() && go()} placeholder="e.g. umbrella" /></label>
        <Button onClick={go} disabled={loading || !topic.trim()}>{loading ? 'Writing…' : 'Write 500-word essay'}</Button>
        <ErrorMsg text={error} />
      </Card>

      {out && (
        <Card className="mt-5 space-y-5">
          <div>
            <Badge>Model composition</Badge>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{out.title}</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">{out.wordCount} words · {readTime(out.wordCount)} min read</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 p-2 pl-3 dark:border-white/10 dark:bg-black"><span className="text-xs text-neutral-500">Listen to model delivery</span><span className="ml-auto"><Listen text={out.essay} /></span></div>
          <div className="space-y-4 text-[15px] leading-7">{out.essay.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="border-t border-black/10 pt-4 dark:border-white/10">
            <Label>Now retell it in your own words</Label>
            <textarea className={Field} rows={3} value={retell} onChange={(e) => setRetell(e.target.value)} />
            <Improve text={retell} />
          </div>
        </Card>
      )}
    </div>
  )
}
