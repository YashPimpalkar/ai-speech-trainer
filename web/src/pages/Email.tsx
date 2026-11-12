import { useState } from 'react'
import { post } from '../lib/api'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg, Field, Label } from '../components/ui'

const RECIPIENTS = ['boss', 'client', 'HR', 'vendor', 'colleague', 'team']
const TONES = ['formal', 'friendly', 'firm', 'apologetic', 'persuasive']
interface Result { subject: string; body: string; alternatives: { tone: string; body: string }[]; notes: string[] }

export default function Email() {
  const [notes, setNotes] = useState('')
  const [ownDraft, setOwnDraft] = useState('')
  const [recipient, setRecipient] = useState(RECIPIENTS[0])
  const [tone, setTone] = useState(TONES[0])
  const [length, setLength] = useState('medium')
  const [out, setOut] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)
  const { loading, error, run } = useRun()

  const go = async () => {
    const r = await run(() => post<Result>('email', { notes, ownDraft: ownDraft || undefined, recipient, tone, length }))
    if (r) setOut(r)
  }
  const full = out ? `Subject: ${out.subject}\n\n${out.body}` : ''
  const sel = (v: string, set: (s: string) => void, opts: string[]) => (
    <select className={Field} value={v} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o} className="text-black">{o}</option>)}</select>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="space-y-3">
        <label><Label>What do you want to say? (rough notes)</Label>
          <textarea className={Field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="need leave on Friday for family function, work handed over to Ravi" /></label>
        <div className="grid grid-cols-3 gap-2">
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
        <Card className="space-y-3 text-sm">
          <p><Label>Subject</Label><b>{out.subject}</b></p>
          <p className="whitespace-pre-wrap">{out.body}</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="!py-1 !text-xs" onClick={() => { navigator.clipboard?.writeText(full); setCopied(true) }}>{copied ? '✓ Copied' : 'Copy'}</Button>
            <Listen text={out.body} />
          </div>
          {out.notes.length > 0 && <ul className="list-disc pl-5 text-zinc-500">{out.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          {out.alternatives.map((a, i) => <details key={i}><summary className="cursor-pointer capitalize">{a.tone} version</summary><p className="mt-1 whitespace-pre-wrap">{a.body}</p></details>)}
          <Improve text={out.body} label="Improve this email's English" />
        </Card>
      )}
    </div>
  )
}
