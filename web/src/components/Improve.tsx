import { useState } from 'react'
import { improve, type Improvement } from '../lib/api'
import { useAppDispatch } from '../store'
import { saveItem } from '../store/historySlice'
import { speak, stopSpeaking } from '../lib/speech'
import { useRun } from '../lib/useRun'
import { Button, ErrorMsg } from './ui'

/** "Improve my English" — drop it next to any user text, in any feature, at any point. */
export default function Improve({ text, label = 'Improve my English' }: { text: string; label?: string }) {
  const [out, setOut] = useState<Improvement | null>(null)
  const dispatch = useAppDispatch()
  const { loading, error, run } = useRun()
  const go = async () => {
    const r = await run(() => improve(text))
    if (!r) return
    setOut(r)
    void dispatch(saveItem({ kind: 'improve', title: text.slice(0, 80), payload: { input: text, output: r } }))
  }

  return (
    <div className="mt-2">
      <Button variant="ghost" onClick={go} disabled={!text.trim() || loading} className="!py-1 !text-xs">
        {loading ? 'Improving…' : `✦ ${label}`}
      </Button>
      <ErrorMsg text={error} />
      {out && (
        <div data-testid="improve-panel" className="mt-3 space-y-3 rounded-xl text-left border border-black/20 p-4 text-sm dark:border-white/20">
          <div><span className="text-xs uppercase tracking-widest text-zinc-500">Corrected</span><p>{out.corrected}</p></div>
          <div>
            <span className="text-xs uppercase tracking-widest text-zinc-500">Improved (male coach)</span>
            <p className="font-medium">{out.improved}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" className="!py-1 !text-xs" onClick={() => speak(out.improved, 'male')}>▶ Listen</Button>
              <Button variant="ghost" className="!py-1 !text-xs" onClick={stopSpeaking}>■ Stop</Button>
            </div>
          </div>
          {out.why.length > 0 && <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400">{out.why.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          {out.accentTips.length > 0 && (
            <div><span className="text-xs uppercase tracking-widest text-zinc-500">Accent tips</span>
              <ul className="list-disc pl-5">{out.accentTips.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
          )}
        </div>
      )}
    </div>
  )
}
