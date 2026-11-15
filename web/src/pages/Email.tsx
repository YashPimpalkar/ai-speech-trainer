import { useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { saveItem } from '../store/historySlice'
import { setResult } from '../store/resultsSlice'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg, Field, Label, PageHeader, optionCls } from '../components/ui'

const RECIPIENTS = ['boss', 'client', 'HR', 'vendor', 'colleague', 'team']
const TONES = ['formal', 'friendly', 'firm', 'apologetic', 'persuasive']
interface Result { subject: string; body: string; alternatives: { tone: string; body: string }[]; notes: string[] }

export default function Email() {
  const [notes, setNotes] = useState('')
  const [ownDraft, setOwnDraft] = useState('')
  const [recipient, setRecipient] = useState(RECIPIENTS[0])
  const [tone, setTone] = useState(TONES[0])
  const [length, setLength] = useState('medium')
  const dispatch = useAppDispatch()
  const out = (useAppSelector((st) => st.results.email) ?? null) as Result | null
  const [shown, setShown] = useState<number | null>(null) // null = the main version, otherwise an alternative tone
  const [copied, setCopied] = useState(false)
  const { loading, error, run } = useRun()

  const go = async () => {
    const r = await run(() => post<Result>('email', { notes, ownDraft: ownDraft || undefined, recipient, tone, length }))
    if (!r) return
    setShown(null); setCopied(false)
    dispatch(setResult({ page: 'email', value: r }))
    void dispatch(saveItem({ kind: 'email', title: r.subject, payload: { input: { notes, ownDraft, recipient, tone, length }, output: r } }))
  }
  const body = out ? (shown === null ? out.body : out.alternatives[shown]?.body ?? out.body) : ''
  const sel = (v: string, set: (s: string) => void, opts: string[]) => (
    <select className={Field} value={v} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o} className={optionCls}>{o}</option>)}</select>
  )
  const chip = (active: boolean) => `cursor-pointer rounded-full border px-3 py-1 text-xs capitalize ${active ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/15 text-neutral-600 hover:bg-black/5 dark:border-white/20 dark:text-neutral-300 dark:hover:bg-white/10'}`

  return (
    <div>
      <PageHeader title="Email Assistant" subtitle="Turn rough notes into a clear, professional email, or polish your own draft." />
      <Card className="space-y-3">
        <label><Label>Notes</Label>
          <textarea className={Field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="need leave on Friday for family function, work handed over to Ravi" /></label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label><Label>To</Label>{sel(recipient, setRecipient, RECIPIENTS)}</label>
          <label><Label>Tone</Label>{sel(tone, setTone, TONES)}</label>
          <label><Label>Length</Label>{sel(length, setLength, ['short', 'medium', 'long'])}</label>
        </div>
        <label><Label>Or paste your own draft to rewrite (optional)</Label>
          <textarea className={Field} rows={3} value={ownDraft} onChange={(e) => setOwnDraft(e.target.value)} /></label>
        <Improve text={ownDraft || notes} label="Improve my English" />
        <Button onClick={go} disabled={loading || !(notes.trim() || ownDraft.trim())}>{loading ? 'Writing…' : 'Write email'}</Button>
        <ErrorMsg text={error} />
      </Card>

      {out && (
        <Card className="mt-5 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="!py-1 !text-xs" onClick={() => { navigator.clipboard?.writeText(`Subject: ${out.subject}\n\n${body}`); setCopied(true) }}>{copied ? '✓ Copied' : 'Copy'}</Button>
            <Listen text={body} />
          </div>
          <div><Label>Subject</Label><p className="font-medium">{out.subject}</p></div>
          <p className="whitespace-pre-wrap border-l-2 border-blue-500/50 pl-4 leading-relaxed">{body}</p>
          {out.notes.length > 0 && <div><Label>What I improved</Label><ul className="list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-300">{out.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
          {out.alternatives.length > 0 && (
            <div>
              <Label>Alternative tones</Label>
              <div className="flex flex-wrap gap-2">
                <button className={chip(shown === null)} onClick={() => setShown(null)}>Primary</button>
                {out.alternatives.map((a, i) => <button key={i} className={chip(shown === i)} onClick={() => setShown(i)}>{a.tone}</button>)}
              </div>
            </div>
          )}
          <Improve text={body} label="Improve this email's English" />
        </Card>
      )}
    </div>
  )
}
