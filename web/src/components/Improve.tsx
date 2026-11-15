import { useState } from 'react'
import { improve, type Improvement } from '../lib/api'
import { useAppDispatch } from '../store'
import { saveItem } from '../store/historySlice'
import { useRun } from '../lib/useRun'
import Listen from './Listen'
import { Badge, Button, ErrorMsg, Label } from './ui'

const Points = ({ title, items }: { title: string; items: string[] }) =>
  items.length ? (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
      <Label>{title}</Label>
      <ul className="list-disc space-y-1 pl-4 text-neutral-700 dark:text-neutral-300">{items.map((w, i) => <li key={i}>{w}</li>)}</ul>
    </div>
  ) : null

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
        <div data-testid="improve-panel" className="mt-3 space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4 text-left text-sm dark:border-white/15 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-2"><span className="font-medium">✦ Coach insight</span><Badge>Grammar &amp; accent</Badge></div>
          <div><Label>Corrected</Label><p>{out.corrected}</p></div>
          <div>
            <Label>Polished native phrasing</Label>
            <p className="rounded-xl border border-black/10 bg-white p-3 font-medium dark:border-white/10 dark:bg-black">{out.improved}</p>
            <div className="mt-2 flex items-center gap-2"><Listen text={out.improved} /><span className="font-mono text-[11px] text-neutral-500">male coach voice</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Points title="Why it changed" items={out.why} />
            <Points title="Accent tips" items={out.accentTips} />
          </div>
        </div>
      )}
    </div>
  )
}
