import { useEffect, useState } from 'react'
import { fetchModels, setCurrentModel } from '../lib/api'
import { resolveSelection, setSelection, sortModels, type ModelsResponse, type Sel } from '../lib/models'
import { optionCls } from './ui'

export default function ModelPicker() {
  const [list, setList] = useState<ModelsResponse | null>(null)
  const [sel, setSel] = useState<Sel | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [err, setErr] = useState('')

  const load = () => {
    setStatus('loading'); setErr('')
    fetchModels()
      .then((l) => { setList(l); setSel(resolveSelection(l)); setStatus(l.models.length ? 'ok' : 'error'); if (!l.models.length) setErr('No models available. Check the API keys on the backend.') })
      .catch((e) => { setErr(e.message); setStatus('error') })
  }
  useEffect(load, [])

  const change = (value: string) => {
    if (!list) return
    const [provider, ...rest] = value.split('::')
    const s = { provider, model: rest.join('::') } as Sel
    setSelection(s); setSel(s); setCurrentModel(list, s)
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <select
        aria-label="Model"
        title={err || undefined}
        disabled={status !== 'ok'}
        value={status === 'ok' && sel ? `${sel.provider}::${sel.model}` : ''}
        onChange={(e) => change(e.target.value)}
        // Opaque background: the native dropdown popup takes it, so options stay readable in both modes.
        className="min-w-0 flex-1 rounded-full border border-black/30 bg-white px-3 py-1.5 text-base text-black disabled:opacity-60 dark:border-white/30 dark:bg-black dark:text-white sm:max-w-xs sm:flex-none sm:text-xs"
      >
        {status === 'loading' && <option value="" className={optionCls}>Loading models…</option>}
        {status === 'error' && <option value="" className={optionCls}>Models unavailable</option>}
        {status === 'ok' && (['groq', 'gemini'] as const).map((p) => {
          const items = sortModels(list?.models.filter((m) => m.provider === p) ?? [])
          return items.length ? (
            <optgroup key={p} label={p.toUpperCase()} className={optionCls}>
              {items.map((m) => <option key={m.id} value={`${p}::${m.id}`} className={optionCls}>{m.id}</option>)}
            </optgroup>
          ) : null
        })}
      </select>
      <button aria-label="Refresh models" title={err || 'Refresh models'} onClick={load} className="shrink-0 cursor-pointer px-1 text-base opacity-70 hover:opacity-100 sm:text-sm">↻</button>
    </div>
  )
}
