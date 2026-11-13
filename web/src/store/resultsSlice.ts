import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Latest result per feature, so switching tabs doesn't lose what you just generated. */
export type Page = 'grammar' | 'essay' | 'email'
const slice = createSlice({
  name: 'results',
  initialState: {} as Partial<Record<Page, any>>,
  reducers: {
    setResult(s, a: PayloadAction<{ page: Page; value: unknown }>) { s[a.payload.page] = a.payload.value },
  },
})
export const { setResult } = slice.actions
export default slice.reducer
