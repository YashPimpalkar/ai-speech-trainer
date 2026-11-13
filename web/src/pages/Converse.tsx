import { useEffect, useRef, useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { addMessage, resetConverse, setReport, type Report } from '../store/converseSlice'
import { saveConverse } from '../store/historySlice'
import { Recorder, speak, stopSpeaking, transcribe } from '../lib/speech'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Button, Card, ErrorMsg } from '../components/ui'

export default function Converse() {
  const dispatch = useAppDispatch()
  const msgs = useAppSelector((st) => st.converse.messages)
  const report = useAppSelector((st) => st.converse.report)
  const [draft, setDraft] = useState('')
  const [recording, setRecording] = useState(false)
  const rec = useRef(new Recorder())
  const bottom = useRef<HTMLDivElement>(null)
  const { loading, error, run } = useRun()

  // Follow the conversation: keep the newest message / review in view.
  useEffect(() => { bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [msgs, report, loading])

  const send = async (text: string) => {
    if (!text.trim()) return
    const next = [...msgs, { role: 'user' as const, content: text.trim() }]
    dispatch(addMessage(next[next.length - 1])); setDraft('')
    const r = await run(() => post<{ reply: string }>('chat', { messages: next }))
    if (!r) return
    dispatch(addMessage({ role: 'assistant', content: r.reply }))
    void dispatch(saveConverse())
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
    if (r) { dispatch(setReport(r)); void dispatch(saveConverse()); void speak(r.improvedVersion, 'male') }
  }

  const empty = msgs.length === 0
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Only this area scrolls; the input bar below stays pinned. */}
      <div data-testid="messages" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-1 py-4">
          {empty && (
            <div className="grid min-h-[40vh] place-items-center text-center text-zinc-500">
              <div><p className="text-2xl font-semibold text-black dark:text-white">Hi, I'm Aria.</p>
                <p className="mt-1 text-sm">Tap the mic or type — any topic you like.</p></div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${m.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border border-black/20 dark:border-white/20'}`}>
                <span className="mb-0.5 block text-[10px] uppercase tracking-widest opacity-60">{m.role === 'user' ? 'You' : 'Aria'}</span>
                {m.content}
              </div>
              {m.role === 'user' && <div className="text-right"><Improve text={m.content} label="Improve this" /></div>}
            </div>
          ))}
          {loading && <p className="text-xs text-zinc-500">Aria is typing…</p>}

          {report && (
            <Card className="space-y-4 text-left text-sm">
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
          <div ref={bottom} />
        </div>
      </div>

      {/* Pinned composer */}
      <div className="shrink-0 pb-4 pt-2">
        <div className="mx-auto max-w-2xl">
          <ErrorMsg text={error} />
          <div className="flex items-center gap-2 rounded-full border border-black/25 p-1.5 pl-2 dark:border-white/25">
            <button
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              onClick={toggleMic}
              className="relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-black text-white dark:bg-white dark:text-black"
            >
              {recording && <span className="pulse-ring absolute inset-0 rounded-full border-2 border-current" />}
              {recording ? '■' : '🎤'}
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Or type here and press Enter…" value={draft}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)}
            />
            <Button onClick={() => send(draft)} disabled={loading || !draft.trim()}>Send</Button>
          </div>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="ghost" className="!py-1 !text-xs" onClick={finish} disabled={loading || !msgs.some((m) => m.role === 'user')}>End &amp; Review</Button>
            <Button variant="ghost" className="!py-1 !text-xs" onClick={() => { stopSpeaking(); dispatch(resetConverse()) }}>New chat</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
