import { useEffect, useRef, useState } from 'react'
import { post } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store'
import { addMessage, resetConverse, setReport, type Report } from '../store/converseSlice'
import { saveConverse } from '../store/historySlice'
import { Recorder, speak, stopSpeaking, transcribe } from '../lib/speech'
import { useRun } from '../lib/useRun'
import Improve from '../components/Improve'
import Listen from '../components/Listen'
import { Badge, Button, Card, ErrorMsg, Label } from '../components/ui'

const STARTERS = ['Talk about my weekend', 'Practise a job interview', 'Describe my city']

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Only this area scrolls; the composer below stays pinned. */}
      <div data-testid="messages" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-3 py-6 sm:px-6">
          {msgs.length === 0 && (
            <div className="grid min-h-[40vh] place-items-center text-center">
              <div>
                <p className="text-4xl font-semibold tracking-tight">Hi, I'm Aria.</p>
                <p className="mt-2 text-sm text-neutral-500">Tap the mic or type — any topic you like.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => setDraft(s)} className="cursor-pointer rounded-full border border-black/15 px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-black/5 dark:border-white/20 dark:text-neutral-300 dark:hover:bg-white/10">✦ {s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === 'assistant' ? (
              <div key={i} className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/15 font-mono text-[11px] dark:border-white/20">AR</span>
                <div className="min-w-0 max-w-[85%] rounded-2xl border border-black/10 bg-neutral-50 px-4 py-2.5 text-left text-sm leading-relaxed dark:border-white/10 dark:bg-neutral-900">
                  <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">Aria</span>
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="text-right">
                <div className="inline-block max-w-[85%] rounded-2xl bg-black px-4 py-2.5 text-left text-sm leading-relaxed text-white dark:bg-neutral-800">
                  <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-widest opacity-60">You</span>
                  {m.content}
                </div>
                <div className="text-right"><Improve text={m.content} label="Improve this" /></div>
              </div>
            ),
          )}
          {loading && <p className="pl-11 font-mono text-xs text-neutral-500">Aria is typing…</p>}

          {report && (
            <Card className="space-y-4 text-left text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><h3 className="text-lg font-semibold">Coach review</h3><Badge>Session</Badge></div>
                <span className="text-3xl font-semibold tracking-tight">{report.score}<span className="text-base text-neutral-500">/100</span></span>
              </div>
              {report.errors.length > 0 && (
                <div>
                  <Label>Mistakes</Label>
                  <ul className="space-y-2">
                    {report.errors.map((e, i) => (
                      <li key={i} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                        <s className="opacity-60">{e.original}</s> → <b>{e.corrected}</b>
                        <div className="font-mono text-[11px] text-neutral-500">{e.rule}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <Label>Polished native phrasing</Label>
                <p className="rounded-xl border border-black/10 p-3 font-medium dark:border-white/10">{report.improvedVersion}</p>
                <div className="mt-2 flex items-center gap-2"><Listen text={report.improvedVersion} /><span className="font-mono text-[11px] text-neutral-500">male coach voice</span></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {report.tips.length > 0 && <div className="rounded-xl border border-black/10 p-3 dark:border-white/10"><Label>Tips</Label><ul className="list-disc pl-4">{report.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
                {report.accentTips.length > 0 && <div className="rounded-xl border border-black/10 p-3 dark:border-white/10"><Label>Accent tips</Label><ul className="list-disc pl-4">{report.accentTips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
              </div>
            </Card>
          )}
          <div ref={bottom} />
        </div>
      </div>

      {/* Pinned composer */}
      <div className="shrink-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ErrorMsg text={error} />
          <div className="flex items-center gap-2 rounded-full border border-black/15 bg-white p-1.5 pl-2 shadow-sm focus-within:border-blue-500 dark:border-white/20 dark:bg-neutral-900 dark:focus-within:border-blue-400">
            <button
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              onClick={toggleMic}
              className={`relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-white ${recording ? 'bg-blue-500' : 'bg-black dark:bg-white dark:text-black'}`}
            >
              {recording && <span className="pulse-ring absolute inset-0 rounded-full border-2 border-blue-400" />}
              {recording ? '■' : '🎤'}
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent px-2 text-base outline-none sm:text-sm" placeholder="Or type here and press Enter…" value={draft}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)}
            />
            <Button onClick={() => send(draft)} disabled={loading || !draft.trim()}>Send</Button>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button variant="ghost" className="!py-1 !text-xs" onClick={finish} disabled={loading || !msgs.some((m) => m.role === 'user')}>End &amp; Review</Button>
            <Button variant="ghost" className="!py-1 !text-xs" onClick={() => { stopSpeaking(); dispatch(resetConverse()) }}>New chat</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
