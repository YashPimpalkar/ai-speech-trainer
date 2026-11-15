import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Msg { role: 'user' | 'assistant'; content: string }
export interface Report {
  errors: { original: string; corrected: string; rule: string }[]
  score: number; improvedVersion: string; tips: string[]; accentTips: string[]
}
interface State { messages: Msg[]; report: Report | null; historyId: string | null }
const initial: State = { messages: [], report: null, historyId: null }

const slice = createSlice({
  name: 'converse',
  initialState: initial,
  reducers: {
    addMessage(s, a: PayloadAction<Msg>) { s.messages.push(a.payload); s.report = null },
    setReport(s, a: PayloadAction<Report | null>) { s.report = a.payload },
    setHistoryId(s, a: PayloadAction<string | null>) { s.historyId = a.payload },
    resetConverse: () => initial,
    loadConversation(_s, a: PayloadAction<{ id: string; messages: Msg[]; report: Report | null }>) {
      return { messages: a.payload.messages, report: a.payload.report, historyId: a.payload.id }
    },
  },
})
export const { addMessage, setReport, setHistoryId, resetConverse, loadConversation } = slice.actions
export default slice.reducer
