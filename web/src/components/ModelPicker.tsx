import { useEffect, useState } from 'react'
import { fetchModels, setCurrentModel } from '../lib/api'
import { resolveSelection, setSelection, type ModelsResponse, type Sel } from '../lib/models'

export default function ModelPicker() {
  const [list, setList] = useState<ModelsResponse | null>(null)
  const [sel, setSel] = useState<Sel | null>(null)
  const [err, setErr] = useState('')

  const load = () => {
    setErr('')
    fetchModels()
      .then((l) => { setList(l); setSel(resolveSelection(l)) })
      .catch((e) => setErr(e.message))
  }
  useEffect(load, [])

  const change = (value: string) => {
    if (!list) return
    const [provider, ...rest] = value.split('::')
    const s = { provider, model: rest.join('::') } as Sel
    setSelection(s); setSel(s); setCurrentModel(list, s)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Model"
        value={sel ? `${sel.provider}::${sel.model}` : ''}
        onChange={(e) => change(e.target.value)}
        className="max-w-[11rem] rounded-full border border-black/30 bg-transparent px-3 py-1.5 text-xs dark:border-white/30 sm:max-w-xs"
      >
        {!list?.models.length && <option value="">{err || 'No models'}</option>}
        {(['groq', 'gemini'] as const).map((p) => {
          const items = list?.models.filter((m) => m.provider === p) ?? []
          return items.length ? (
            <optgroup key={p} label={p.toUpperCase()}>
              {items.map((m) => <option key={m.id} value={`${p}::${m.id}`} className="text-black">{m.id}</option>)}
            </optgroup>
          ) : null
        })}
      </select>
      <button aria-label="Refresh models" onClick={load} className="cursor-pointer text-sm opacity-70 hover:opacity-100">↻</button>
    </div>
  )
}
