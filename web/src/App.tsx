import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Converse from './pages/Converse'
import Grammar from './pages/Grammar'
import Essay from './pages/Essay'
import Email from './pages/Email'
import SavedItem from './pages/SavedItem'
import { useAppDispatch, useAppSelector } from './store'
import { closeDrawer } from './store/uiSlice'

export default function App() {
  const dispatch = useAppDispatch()
  const { view, drawerOpen } = useAppSelector((s) => s.ui)
  const isChat = view === 'converse'

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <Sidebar />
      {drawerOpen && <div data-testid="drawer-backdrop" onClick={() => dispatch(closeDrawer())} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className={`min-h-0 flex-1 ${isChat ? 'flex flex-col' : 'overflow-y-auto'}`}>
          {isChat ? <Converse /> : (
            <div className="mx-auto w-full max-w-3xl px-3 pb-12 pt-6 sm:px-6">
              {view === 'grammar' && <Grammar />}
              {view === 'essay' && <Essay />}
              {view === 'email' && <Email />}
              {view === 'saved' && <SavedItem />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
