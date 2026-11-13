import { useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { saveItem } from '../store/historySlice'
import { setResult } from '../store/resultsSlice'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg, Field, Label } from '../components/ui'

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
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="space-y-3">
        <label><Label>Name any object or topic</Label>
          <input className={Field} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && topic.trim() && go()} placeholder="e.g. umbrella" /></label>
        <Button onClick={go} disabled={loading || !topic.trim()}>{loading ? 'Writing…' : 'Write 500-word essay'}</Button>
        <ErrorMsg text={error} />
      </Card>
      {out && (
        <Card className="space-y-4">
          <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold">{out.title}</h3><span className="text-xs text-zinc-500">{out.wordCount} words</span></div>
          <Listen text={out.essay} />
          <div className="space-y-3 text-sm leading-relaxed">{out.essay.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <Label>Now retell it in your own words</Label>
            <textarea className={Field} rows={3} value={retell} onChange={(e) => setRetell(e.target.value)} />
            <Improve text={retell} />
          </div>
        </Card>
      )}
    </div>
  )
}
