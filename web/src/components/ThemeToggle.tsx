import { useState } from 'react'
import { applyTheme, getInitialTheme } from '../lib/theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      aria-label={`Switch to ${next === 'dark' ? 'black' : 'white'} mode`}
      onClick={() => { applyTheme(next); setTheme(next) }}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-black/30 hover:bg-black/5 dark:border-white/30 dark:hover:bg-white/10"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
