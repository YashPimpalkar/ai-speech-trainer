# Changelog
Append newest first. Format: date — what/why — files — tests.

## 2026-11-13 — Fix: Vercel backend build failed ("No entrypoint found in output directory: public")
- Why: Vercel auto-detected `express` and applied its Express preset, which expects an entry file in the output directory instead of our static `public/` + `api/` function setup.
- Fix: `"framework": null` in `server/vercel.json` to opt out of detection. If it ever recurs, set Framework Preset to "Other" in the project's Build & Output settings.
- Tests: new assertion in `server/tests/vercel-config.test.ts` (failed first). Server 42, web 21.

## 2026-11-13 — Two Vercel projects (backend `server/`, frontend `web/`)
- Why: user wants backend and frontend deployed separately, both on Vercel.
- Added `server/vercel.json`, `server/api/index.mjs`, `server/public/.gitkeep` (backend project, Root Directory = `server`). Frontend project uses Root Directory = `web` with `VITE_API_URL`. Root `vercel.json` + `api/` remain for the single-project option.
- Verified locally: server build, then `server/api/index.mjs` via plain http server: health OK, CORS allowed for the frontend origin, preflight 204, blocked for other origins; `VITE_API_URL` is baked into the web bundle.
- Not tested on Vercel itself (needs account login).
- Tests: server 41 (new: vercel-config), web 21.

## 2026-11-13 — Single Vercel project (static web + serverless API)
- Why: user wants backend and frontend both on Vercel.
- Server: `lazyStore` (connect to Postgres on first request, retry after failure), `bootstrap.ts` (shared wiring), `handler.ts` (Vercel entry); `index.ts` now just calls `buildApp().listen`.
- Root: `api/index.mjs` re-exports `server/dist/handler.js`; `vercel.json` (build `npm run build`, output `web/dist`, `/api/*` rewrite, maxDuration 60).
- Verified locally: full `npm run build`, then loaded `api/index.mjs` in a plain http server: health, models, history (Neon), chat (Groq), multipart STT reach the app.
- Tests: server 38 (new: lazy store, handler), web 21.

## 2026-11-13 — Separate deployment support (Vercel frontend + Render API)
- Why: user wants frontend and backend deployed separately.
- Web: `VITE_API_URL` base URL (`web/src/lib/apiUrl.ts`), used by every API/TTS/STT call; empty keeps dev proxy behaviour.
- Server: `CORS_ORIGINS` env restricts allowed origins (`parseOrigins`, `createApp(deps, {corsOrigins})`); open when unset.
- Added `render.yaml`, `web/.env.example`, `docs/DEPLOY.md`. Verified `npm run build -w server` + `node dist/index.js` (health OK, Postgres connected, CORS allow/deny).
- Tests: server 35, web 21 (new: cors, apiUrl).

## 2026-11-12 — Postgres (Neon) history + Redux
- Why: user wanted all activity stored in the database and app state managed with Redux.
- Server: `pg` store (`server/src/history.ts`, table `history_items`, auto-created) + REST `/api/history` (list/get/create/update/delete); in-memory fallback when `DATABASE_URL` is unset. `DATABASE_URL` lives only in `server/.env`.
- Web: Redux Toolkit store (`web/src/store`: converse, history, results slices). Converse chat is saved/updated in one row per conversation; Grammar, Essay, Email and Improve results are saved on generation. New History tab: filter, view, continue a chat, delete. Latest results survive tab switches.
- Note: no user accounts yet, so history is shared by everyone using this server.
- Tests: server 32 (history CRUD/filter/validation), web 19 (store slices, serialized saves, History tab).

## 2026-11-12 — Fix: Grammar "all tenses overview" failed validation
- Why: the model returned `structure` as an object; the strict string schema rejected it ("expected string, received object").
- Files: server/src/json.ts (`toText`, `looseText`), server/src/agents/grammar.ts (all fields lenient), web/src/pages/Grammar.tsx (keep line breaks), server/tests/agents.test.ts.
- Tests: new "grammar tolerates structured values" test (failed first, now passes). Server 28, web 10.

## 2026-11-12 — Converse: Claude-style chat layout
- Why: whole page scrolled and the input bar moved away; user wanted a chat where only messages scroll, newest at the bottom, composer pinned.
- Files: web/src/pages/Converse.tsx (scroll area + pinned pill composer, auto-scroll to latest, review shown inside the chat), web/src/App.tsx (full-height layout; other tabs scroll in their own area), web/src/lib/app.test.tsx.
- Tests: new "Converse chat layout" test (failed first, now passes). Web 10, server 27.

## 2026-11-12 — Fix: Improve panel text was right-aligned in Converse
- Why: the panel sat inside the right-aligned user-message wrapper and inherited `text-right`, making corrections hard to read.
- Files: web/src/components/Improve.tsx (`text-left` on panel), web/src/lib/app.test.tsx.
- Tests: new "Improve panel layout" test (failed first, now passes).

## 2026-11-12 — Initial build
- Monorepo (web + server). Model registry with live discovery and automatic failover; LangGraph agents (partner, coach, improve, grammar, essay, email); Groq STT, Gemini TTS with browser fallback.
- UI: black/white with theme toggle; Converse, Grammar, Essay, Email; Improve button in every feature.
- Tests: server 27 (registry, fallback, agents, routes, wav), web 8 (theme, models, speech, Improve presence).
