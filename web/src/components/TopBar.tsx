import { useAppDispatch, useAppSelector } from '../store'
import { openDrawer } from '../store/uiSlice'
import ThemeToggle from './ThemeToggle'

const TITLES = { grammar: 'Grammar Coach', essay: 'Essay Studio', email: 'Email Assistant', saved: 'History & Archives' } as const

export default function TopBar() {
  const dispatch = useAppDispatch()
  const { view, collapsed } = useAppSelector((s) => s.ui)
  const firstUserMessage = useAppSelector((s) => s.converse.messages.find((m) => m.role === 'user')?.content)
  const title = view === 'converse' ? (firstUserMessage ? firstUserMessage.slice(0, 60) : 'New conversation') : TITLES[view]

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-black/10 px-3 py-2 dark:border-white/10 sm:px-6">
      {/* Visible below lg (opens the drawer) and on desktop when the sidebar is collapsed. */}
      <button aria-label="Open menu" onClick={() => dispatch(openDrawer())} className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${collapsed ? '' : 'lg:hidden'}`}>☰</button>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
      <ThemeToggle />
    </header>
  )
}
