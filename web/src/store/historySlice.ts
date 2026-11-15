import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { createHistory, deleteHistory, listHistory, updateHistory, type HistoryItem, type Kind } from '../lib/api'
import { setHistoryId } from './converseSlice'
import type { RootState } from './index'

interface State { items: HistoryItem[]; status: 'idle' | 'loading' | 'error'; error: string }

export const fetchHistory = createAsyncThunk('history/fetch', () => listHistory())
export const removeHistory = createAsyncThunk('history/remove', async (id: string) => { await deleteHistory(id); return id })

/** Save a one-off result (grammar, essay, email, improve). Failures never bother the user. */
export const saveItem = createAsyncThunk('history/saveItem', async (a: { kind: Kind; title: string; payload: unknown }) => {
  try { return await createHistory(a.kind, a.title.trim().slice(0, 120) || a.kind, a.payload) } catch { return null }
})

// Saves are serialized so two quick calls can't both create a new row.
let chain: Promise<unknown> = Promise.resolve()

/** Create the conversation row on first save, then update the same row. */
export const saveConverse = createAsyncThunk('history/saveConverse', (_: void, { getState, dispatch }) => {
  const run = async () => {
    const { converse } = (getState() as RootState)
    if (!converse.messages.length) return null
    const payload = { messages: converse.messages, report: converse.report }
    try {
      if (converse.historyId) return await updateHistory(converse.historyId, { payload })
      const title = (converse.messages.find((m) => m.role === 'user')?.content ?? 'Conversation').slice(0, 60)
      const created = await createHistory('converse', title, payload)
      dispatch(setHistoryId(created.id))
      return created
    } catch { return null }
  }
  chain = chain.then(run, run)
  return chain as Promise<HistoryItem | null>
})

const slice = createSlice({
  name: 'history',
  initialState: { items: [], status: 'idle', error: '' } as State,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchHistory.pending, (s) => { s.status = 'loading'; s.error = '' })
     .addCase(fetchHistory.fulfilled, (s, a) => { s.status = 'idle'; s.items = a.payload })
     .addCase(fetchHistory.rejected, (s, a) => { s.status = 'error'; s.error = a.error.message ?? 'Failed to load history' })
     .addCase(removeHistory.fulfilled, (s, a) => { s.items = s.items.filter((i) => i.id !== a.payload) })
  },
})
export default slice.reducer
