import { useRef, useState } from 'react'
import { post } from '../lib/api'
import { Recorder, speak, stopSpeaking, transcribe } from '../lib/speech'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg, Field } from '../components/ui'

interface Msg { role: 'user' | 'assistant'; content: string }
interface Report {
  errors: { original: string; corrected: string; rule: string }[]
  score: number; improvedVersion: string; tips: string[]; accentTips: string[]
}

export default function Converse() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const rec = useRef(new Recorder())
  const { loading, error, run } = useRun()

  const send = async (text: string) => {
    if (!text.trim()) return
    const next: Msg[] = [...msgs, { role: 'user', content: text.trim() }]
    setMsgs(next); setDraft(''); setReport(null)
    const r = await run(() => post<{ reply: string }>('chat', { messages: next }))
    if (!r) return
    setMsgs([...next, { role: 'assistant', content: r.reply }])
    void speak(r.reply, 'female')
  }

  const toggleMic = async () => {
    if (!recording) {
      stopSpeaking()
      await run(async () => { await rec.current.start(); setRecording(true) })
      return
    }
    setRecording(false)
    const text = await run(async () => transcribe(await rec.current.stop()))
    if (text) await send(text)
  }

  const finish = async () => {
    stopSpeaking()
    const r = await run(() => post<Report>('coach', { messages: msgs }))
    if (r) { setReport(r); void speak(`${r.improvedVersion}`, 'male') }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="min-h-64 space-y-3">
        {msgs.length === 0 && <p className="text-zinc-500">Say hi to Aria. Tap the mic or type — any topic you like.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${m.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-black/20 dark:border-white/20'}`}>
              <span className="mb-0.5 block text-[10px] uppercase tracking-widest opacity-60">{m.role === 'user' ? 'You' : 'Aria'}</span>
              {m.content}
            </div>
            {m.role === 'user' && <div className="text-right"><Improve text={m.content} label="Improve this" /></div>}
          </div>
        ))}
        {loading && <p className="text-xs text-zinc-500">…</p>}
      </Card>

      <div className="flex items-center gap-3">
        <button
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          onClick={toggleMic}
          className="relative grid h-14 w-14 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-xl text-white dark:bg-white dark:text-black"
        >
          {recording && <span className="pulse-ring absolute inset-0 rounded-full border-2 border-current" />}
          {recording ? '■' : '🎤'}
        </button>
        <input
          className={Field} placeholder="Or type here and press Enter…" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)}
        />
        <Button onClick={() => send(draft)} disabled={loading || !draft.trim()}>Send</Button>
      </div>
      <ErrorMsg text={error} />

      <div className="flex gap-2">
        <Button variant="ghost" onClick={finish} disabled={loading || !msgs.some((m) => m.role === 'user')}>End &amp; Review</Button>
        <Button variant="ghost" onClick={() => { stopSpeaking(); setMsgs([]); setReport(null) }}>New chat</Button>
      </div>

      {report && (
        <Card className="space-y-4 text-sm">
          <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold">Coach review</h3><span className="text-2xl font-bold">{report.score}/100</span></div>
          {report.errors.length > 0 && (
            <ul className="space-y-2">
              {report.errors.map((e, i) => (
                <li key={i} className="rounded-lg border border-black/15 p-3 dark:border-white/15">
                  <s className="opacity-60">{e.original}</s> → <b>{e.corrected}</b>
                  <div className="text-xs text-zinc-500">{e.rule}</div>
                </li>
              ))}
            </ul>
          )}
          <div>
            <span className="text-xs uppercase tracking-widest text-zinc-500">Improved version (male voice)</span>
            <p className="mt-1 font-medium">{report.improvedVersion}</p>
            <div className="mt-2"><Listen text={report.improvedVersion} /></div>
          </div>
          {report.tips.length > 0 && <ul className="list-disc pl-5">{report.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
          {report.accentTips.length > 0 && <div><span className="text-xs uppercase tracking-widest text-zinc-500">Accent tips</span><ul className="list-disc pl-5">{report.accentTips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
        </Card>
      )}
    </div>
  )
}
