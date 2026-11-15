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
