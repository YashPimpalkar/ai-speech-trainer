import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type View = 'converse' | 'grammar' | 'essay' | 'email' | 'saved'
interface State { view: View; savedId: string | null; drawerOpen: boolean; collapsed: boolean }
const initial: State = { view: 'converse', savedId: null, drawerOpen: false, collapsed: false }

const slice = createSlice({
  name: 'ui',
  initialState: initial,
  reducers: {
    setView(s, a: PayloadAction<Exclude<View, 'saved'>>) { s.view = a.payload; s.savedId = null; s.drawerOpen = false },
    openSaved(s, a: PayloadAction<string>) { s.view = 'saved'; s.savedId = a.payload; s.drawerOpen = false },
    // The menu button doubles as "show the sidebar again" when it was collapsed on desktop.
    openDrawer(s) { s.drawerOpen = true; s.collapsed = false },
    closeDrawer(s) { s.drawerOpen = false },
    toggleCollapsed(s) { s.collapsed = !s.collapsed },
  },
})
export const { setView, openSaved, openDrawer, closeDrawer, toggleCollapsed } = slice.actions
export default slice.reducer
