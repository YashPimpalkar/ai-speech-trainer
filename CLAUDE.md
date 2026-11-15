# AI Speech Trainer — context for Claude

English speaking trainer. Vite + React 19 + Tailwind v4 (classes inline) in `web/`; Node + Express + TypeScript in `server/`; npm workspaces.
Models: any Groq or Gemini chat model via LangChain.js; agents are LangGraph graphs. Read `docs/ARCHITECTURE.md` first.

## Rules for every change
1. **Tests first.** Write/adjust a failing test (`server/tests`, `web/src/lib/app.test.tsx`), then implement. Run `npm test` before AND after.
2. **Log it.** Append a dated entry to `CHANGELOG.md` (what, why, files, tests) for every change.
3. **Never commit secrets.** Keys live only in `server/.env` (gitignored). `.env.example` has placeholders. Never echo keys in docs/chat/logs.
4. Don't hardcode model names; models are discovered live (`server/src/models/registry.ts`). TTS/STT defaults are env-overridable (`config.ts`).
5. UI is black/white only, with a dark/light toggle (`dark:` variants). Every user-text feature must offer the shared `<Improve />` button.

## Commands
- `npm install` · `npm run dev` (API :8787 + web :5173) · `npm test` · `npm run build`
- Server only: `npm run dev -w server`; typecheck `npx tsc --noEmit -p server`; web `npx tsc -b` in `web/`.

## Skills (`.claude/skills/`)
`write-tests-first`, `update-changelog`, `add-feature`, `add-model-provider`.
