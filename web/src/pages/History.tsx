import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchHistory, removeHistory } from '../store/historySlice'
import { loadConversation } from '../store/converseSlice'
import type { HistoryItem, Kind } from '../lib/api'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg } from '../components/ui'

const KINDS: { id: Kind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'converse', label: 'Conversations' }, { id: 'improve', label: 'Improve' },
  { id: 'grammar', label: 'Grammar' }, { id: 'essay', label: 'Essays' }, { id: 'email', label: 'Emails' },
]

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div><span className="text-xs uppercase tracking-widest text-zinc-500">{title}</span><div className="mt-1">{children}</div></div>
)

function Detail({ item }: { item: HistoryItem }) {
  const p = item.payload ?? {}
  const o = p.output
  switch (item.kind) {
    case 'converse':
      return (
        <div className="space-y-2">
          {(p.messages ?? []).map((m: any, i: number) => (
            <p key={i}><b>{m.role === 'user' ? 'You' : 'Aria'}:</b> {m.content}</p>
          ))}
          {p.report && <Section title={`Coach review · ${p.report.score}/100`}><p className="font-medium">{p.report.improvedVersion}</p></Section>}
        </div>
      )
    case 'improve':
      return o ? (
        <div className="space-y-2">
          <Section title="You wrote"><p>{p.input}</p></Section>
          <Section title="Corrected"><p>{o.corrected}</p></Section>
          <Section title="Improved"><p className="font-medium">{o.improved}</p><div className="mt-1"><Listen text={o.improved} /></div></Section>
        </div>
      ) : null
    case 'essay':
      return o ? <div className="space-y-2"><h4 className="font-semibold">{o.title}</h4><Listen text={o.essay} /><p className="whitespace-pre-wrap">{o.essay}</p></div> : null
    case 'email':
      return o ? <div className="space-y-2"><p><b>Subject:</b> {o.subject}</p><p className="whitespace-pre-wrap">{o.body}</p></div> : null
    case 'grammar':
      return o ? (
        <div className="space-y-2">
          <h4 className="font-semibold">{o.title ?? o.converted}</h4>
          <p className="whitespace-pre-wrap">{o.rule ?? o.original}</p>
          {o.structure && <p className="whitespace-pre-wrap font-mono text-xs">{o.structure}</p>}
        </div>
      ) : null
  }
}

export default function History({ onContinue }: { onContinue: () => void }) {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector((s) => s.history)
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  useEffect(() => { dispatch(fetchHistory()) }, [dispatch])

  const shown = items.filter((i) => filter === 'all' || i.kind === filter)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => <Button key={k.id} variant={filter === k.id ? 'solid' : 'ghost'} className="!py-1 !text-xs" onClick={() => setFilter(k.id)}>{k.label}</Button>)}
        <Button variant="ghost" className="!py-1 !text-xs" onClick={() => dispatch(fetchHistory())}>↻ Refresh</Button>
      </div>
      <ErrorMsg text={status === 'error' ? error : ''} />
      {status === 'loading' && !items.length && <p className="text-sm text-zinc-500">Loading…</p>}
      {status === 'idle' && !shown.length && <p className="py-10 text-center text-sm text-zinc-500">Nothing here yet. Your chats, essays, emails and improvements are saved automatically.</p>}
      {shown.map((item) => (
        <Card key={item.id} className="text-sm">
          <details>
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{item.title}</span>
              <span className="shrink-0 text-xs text-zinc-500">{item.kind} · {new Date(item.createdAt).toLocaleString()}</span>
            </summary>
            <div className="mt-3 space-y-3 text-left"><Detail item={item} /></div>
          </details>
          <div className="mt-3 flex gap-2">
            {item.kind === 'converse' && (
              <Button variant="ghost" className="!py-1 !text-xs" onClick={() => {
                dispatch(loadConversation({ id: item.id, messages: item.payload?.messages ?? [], report: item.payload?.report ?? null }))
                onContinue()
              }}>Continue chat</Button>
            )}
            <Button variant="ghost" className="!py-1 !text-xs" onClick={() => dispatch(removeHistory(item.id))}>Delete</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
