import { useState } from 'react'
import ModelPicker from './components/ModelPicker'
import ThemeToggle from './components/ThemeToggle'
import Converse from './pages/Converse'
import Grammar from './pages/Grammar'
import Essay from './pages/Essay'
import Email from './pages/Email'
import History from './pages/History'

const TABS = [
  { id: 'converse', label: 'Converse', view: Converse },
  { id: 'grammar', label: 'Grammar', view: Grammar },
  { id: 'essay', label: 'Essay', view: Essay },
  { id: 'email', label: 'Email', view: Email },
  { id: 'history', label: 'History', view: History },
] as const

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('converse')
  return (
    <div className="mx-auto flex h-dvh max-w-4xl flex-col px-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-5">
        <h1 className="text-xl font-bold tracking-tight">Speak<span className="opacity-40">.</span>AI</h1>
        <div className="flex items-center gap-3"><ModelPicker /><ThemeToggle /></div>
      </header>
      <nav className="mb-2 flex shrink-0 gap-1 overflow-x-auto border-b border-black/15 dark:border-white/15">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${tab === t.id ? 'border-b-2 border-black font-semibold dark:border-white' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className={`min-h-0 flex-1 ${tab === 'converse' ? 'flex flex-col' : 'overflow-y-auto pb-10 pt-4'}`}>{tab === 'converse' ? <Converse /> : tab === 'grammar' ? <Grammar /> : tab === 'essay' ? <Essay /> : tab === 'email' ? <Email /> : <History onContinue={() => setTab('converse')} />}</main>
    </div>
  )
}
