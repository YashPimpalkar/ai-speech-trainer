import { useState } from 'react'
import ModelPicker from './components/ModelPicker'
import ThemeToggle from './components/ThemeToggle'
import Converse from './pages/Converse'
import Grammar from './pages/Grammar'
import Essay from './pages/Essay'
import Email from './pages/Email'

const TABS = [
  { id: 'converse', label: 'Converse', view: Converse },
  { id: 'grammar', label: 'Grammar', view: Grammar },
  { id: 'essay', label: 'Essay', view: Essay },
  { id: 'email', label: 'Email', view: Email },
] as const

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('converse')
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <h1 className="text-xl font-bold tracking-tight">Speak<span className="opacity-40">.</span>AI</h1>
        <div className="flex items-center gap-3"><ModelPicker /><ThemeToggle /></div>
      </header>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-black/15 dark:border-white/15">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${tab === t.id ? 'border-b-2 border-black font-semibold dark:border-white' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>{TABS.map((t) => (t.id === tab ? <t.view key={t.id} /> : null))}</main>
    </div>
  )
}
