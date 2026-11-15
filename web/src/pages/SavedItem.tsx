import { useAppDispatch, useAppSelector } from '../store'
import { removeHistory } from '../store/historySlice'
import { setResult, type Page } from '../store/resultsSlice'
import { loadConversation } from '../store/converseSlice'
import { setView } from '../store/uiSlice'
import { readTime } from '../lib/historyUtils'
import type { HistoryItem, Kind } from '../lib/api'
import Listen from '../components/Listen'
import { Button, Card, Label } from '../components/ui'

const NAMES: Record<Kind, string> = { converse: 'Conversation', improve: 'Improvement', grammar: 'Grammar Lesson', essay: 'Essay', email: 'Email' }
const STUDIO: Partial<Record<Kind, { page: Page; label: string }>> = {
  grammar: { page: 'grammar', label: 'Grammar Coach' },
  essay: { page: 'essay', label: 'Essay Studio' },
  email: { page: 'email', label: 'Email Assistant' },
}

function Detail({ item }: { item: HistoryItem }) {
  const p = item.payload ?? {}
  const o = p.output
  switch (item.kind) {
    case 'converse':
      return (
        <div className="space-y-2">
          {(p.messages ?? []).map((m: any, i: number) => <p key={i}><b>{m.role === 'user' ? 'You' : 'Aria'}:</b> {m.content}</p>)}
          {p.report && <div><Label>{`Coach review · ${p.report.score}/100`}</Label><p className="font-medium">{p.report.improvedVersion}</p></div>}
        </div>
      )
    case 'improve':
      return o ? (
        <div className="space-y-3">
          <div><Label>You wrote</Label><p>{p.input}</p></div>
          <div><Label>Corrected</Label><p>{o.corrected}</p></div>
          <div><Label>Polished native phrasing</Label><p className="font-medium">{o.improved}</p><div className="mt-2"><Listen text={o.improved} /></div></div>
        </div>
      ) : null
    case 'essay':
      return o ? (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{o.title}</h2>
          {o.wordCount && <p className="font-mono text-xs text-neutral-500">{o.wordCount} words · {readTime(o.wordCount)} min read</p>}
          <Listen text={o.essay} />
          <div className="space-y-3 leading-relaxed">{String(o.essay).split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}</div>
        </div>
      ) : null
    case 'email':
      return o ? <div className="space-y-3"><p><Label>Subject</Label><b>{o.subject}</b></p><p className="whitespace-pre-wrap">{o.body}</p></div> : null
    case 'grammar':
      return o ? (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{o.title ?? o.converted}</h2>
          <p className="whitespace-pre-wrap">{o.rule ?? o.original}</p>
          {o.structure && <p className="whitespace-pre-wrap rounded-xl bg-black/5 p-3 font-mono text-xs dark:bg-white/10">{o.structure}</p>}
        </div>
      ) : null
  }
}

/** A saved essay / email / lesson / improvement, opened from the history panel. */
export default function SavedItem() {
  const dispatch = useAppDispatch()
  const savedId = useAppSelector((s) => s.ui.savedId)
  const item = useAppSelector((s) => s.history.items.find((i) => i.id === savedId))

  if (!item) return <p className="py-10 text-center text-sm text-neutral-500">This item is no longer available.</p>

  const studio = STUDIO[item.kind]
  const remove = async () => {
    try { await dispatch(removeHistory(item.id)).unwrap(); dispatch(setView('converse')) } catch { /* stays open; the list shows the error */ }
  }
  const resume = () => {
    if (item.kind === 'converse') {
      dispatch(loadConversation({ id: item.id, messages: item.payload?.messages ?? [], report: item.payload?.report ?? null }))
      dispatch(setView('converse'))
    } else if (studio) {
      dispatch(setResult({ page: studio.page, value: item.payload?.output }))
      dispatch(setView(studio.page))
    }
  }

  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
        <span>History &amp; Archives</span> / <span className="text-black dark:text-white">{`Saved ${NAMES[item.kind]}`}</span>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</p>
      <div className="my-4 flex flex-wrap gap-2">
        {(studio || item.kind === 'converse') && <Button onClick={resume}>{studio ? `Continue in ${studio.label}` : 'Continue chat'}</Button>}
        <Button variant="ghost" onClick={remove}>Delete</Button>
      </div>
      <Card className="text-sm"><Detail item={item} /></Card>
    </div>
  )
}
