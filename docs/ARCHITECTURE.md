# Architecture

```
web (React)  --/api proxy-->  server (Express)
                                 ├─ models/registry.ts   live model discovery (Groq /models, Gemini models.list), 10-min cache
                                 ├─ models/providers.ts  LangChain chat model factories (ChatGroq, ChatGoogleGenerativeAI)
                                 ├─ models/fallback.ts   retry next model on 404/429/5xx/decommissioned (not on 401)
                                 ├─ llm.ts               makeLlm(candidates) -> Llm { invoke, lastUsed }
                                 ├─ agents/*.ts          LangGraph graphs; take an Llm so tests inject fakes
                                 │    partner (Aria), coach (analyze→rewriteStep), improve, grammar, essay (word-count retry loop), email (draftStep→polishStep)
                                 ├─ voice/stt-groq.ts    Groq Whisper; voice/tts-gemini.ts Gemini TTS -> WAV (null => 501 => browser voice)
                                 └─ app.ts               routes + zod validation; createApp(deps) is fully injectable for tests
```
Routes: `GET /api/models`, `POST /api/{chat,coach,improve,grammar,essay,email,stt,tts}`. Model-backed bodies carry `{model, fallbacks}`; responses include `modelUsed`.

Web: `lib/api.ts` holds the current model + failover chain; `lib/speech.ts` (Recorder, speak with Gemini→browser fallback); pages in `pages/`; shared `components/Improve.tsx`.
Gotcha: LangGraph node names must differ from state keys (hence `rewriteStep`, `draftStep`).

## History + state
- Server: `history.ts` (`HistoryStore`: `pgStore` for Neon via `DATABASE_URL`, `memoryStore` fallback/tests); routes `GET/POST /api/history`, `GET/PUT/DELETE /api/history/:id`. Kinds: converse, improve, grammar, essay, email. Table `history_items(id uuid, kind, title, payload jsonb, created_at, updated_at)` is created at startup. `channel_binding` is stripped from the URL (unsupported by `pg`).
- Web: Redux Toolkit in `web/src/store` (`converseSlice`, `historySlice`, `resultsSlice`). `saveConverse` serializes saves (create once, then PUT). Saving failures are swallowed so they never block the UI. No auth yet: history is global.
