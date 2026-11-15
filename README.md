# AI Speech Trainer

Practise English by talking. Features: **Converse** (Aria, a friendly female partner; then a male coach reviews and improves your English), **Grammar** (all tenses, active⇄passive), **Essay** (any object → 500 words read aloud), **Email** (professional email writer), plus an **Improve my English** button everywhere. Black/white modes with a toggle.

## Setup
```bash
npm install
cp server/.env.example server/.env   # add GROQ_API_KEY (and GEMINI_API_KEY later)
npm run dev                          # http://localhost:5173
```
- Groq powers chat and speech-to-text (Whisper). Gemini key is optional: it enables natural Gemini voices; without it the browser's voices are used.
- Pick any model in the header dropdown (live list from each provider). If a model expires or is rate-limited, the app automatically fails over to the next available one.
- Microphone needs a browser with MediaRecorder (Chrome/Edge/Firefox) on localhost or HTTPS.

## Tests
`npm test` (server: vitest + supertest; web: vitest + Testing Library).

See `CLAUDE.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`.
