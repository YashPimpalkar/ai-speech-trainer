# Deploy

## Option 1 (chosen): two Vercel projects from this one repo
Deploy the **backend first**, then the frontend (it needs the backend's URL).

### A. Backend project
1. Vercel → **Add New Project** → import the repo → **Root Directory: `server`**. (`server/vercel.json` sets build `npm run build`, routes all requests to `server/api/index.mjs`, 60 s max duration.)
2. Environment variables:
   - `GROQ_API_KEY`, `DATABASE_URL`, `GEMINI_API_KEY` (optional)
   - `CORS_ORIGINS` = the frontend URL (you can add it after step B, then redeploy the backend). Comma-separate several (e.g. a custom domain + the `.vercel.app` URL).
3. Deploy, then open `https://<backend>.vercel.app/api/health` → `{"ok":true}`.

### B. Frontend project
1. Vercel → **Add New Project** → same repo → **Root Directory: `web`** (Framework: Vite, build `npm run build`, output `dist`).
2. Environment variable: `VITE_API_URL` = `https://<backend>.vercel.app` (**no trailing slash**).
3. Deploy. Copy this URL into the backend's `CORS_ORIGINS` and redeploy the backend.

### Checks
- Browser console has no CORS errors; model dropdown fills; chat replies; History tab works.
- `VITE_API_URL` is baked in at build time: changing it means redeploying the frontend. `CORS_ORIGINS` changes need a backend redeploy.
- Limits: 60 s function time (Hobby may cut long essays/reviews; upgrade or use Option 3), ~4.5 MB response cap (long Gemini voice falls back to the browser voice), cold starts after idle.
- If the backend build can't find packages, enable "Include source files outside of the Root Directory" in the project's General settings (the repo is an npm workspace with its lockfile at the repo root).

## Option 2: everything in one Vercel project

The web app is served as static files and the API runs as a Vercel serverless function on the **same domain**, so there is no CORS and no `VITE_API_URL`.

1. Vercel → **Add New Project** → import the GitHub repo. **Root Directory: leave as the repo root** (not `web`). `vercel.json` sets the build (`npm run build`), output (`web/dist`) and routes `/api/*` to `api/index.mjs`.
2. Environment variables (Project → Settings → Environment Variables):
   - `GROQ_API_KEY`, `DATABASE_URL`, `GEMINI_API_KEY` (optional)
   - Leave `VITE_API_URL` and `CORS_ORIGINS` **unset**.
3. Deploy, then open `https://<project>.vercel.app/api/health` → `{"ok":true}`.

How it fits together: `api/index.mjs` re-exports the compiled `server/dist/handler.js` (built during the Vercel build), which lazily builds the Express app and connects to Neon on first request.

Limits to know:
- Function time limit is set to 60 s in `vercel.json`. The Hobby plan may cut long calls (500-word essay with retries, coach review); if you see timeouts, upgrade the plan or use Option B.
- Responses over ~4.5 MB fail; a very long Gemini voice clip falls back to the browser voice automatically.
- Cold starts add a second or two after idle.

## Option 3: API on Render + frontend on Vercel

Backend (Express API) → **Render** (always-on, no serverless time limits). Frontend (Vite) → **Vercel**. Database is already Neon.

## 1. Backend on Render
1. Push the repo to GitHub, then Render → **New → Blueprint** → pick the repo (uses `render.yaml`). Or **New → Web Service** with:
   - Build command: `npm ci && npm run build -w server`
   - Start command: `npm start -w server`
   - Health check path: `/api/health`
2. Environment variables (Render dashboard, never in the repo):
   - `GROQ_API_KEY`, `DATABASE_URL`, `GEMINI_API_KEY` (optional)
   - `CORS_ORIGINS` = your Vercel URL, e.g. `https://ai-speech-trainer.vercel.app` (comma-separate multiple; no trailing path)
3. Deploy, then open `https://<service>.onrender.com/api/health` → `{"ok":true}`.
   Free Render services sleep when idle, so the first request after a pause takes ~30–60 s.

## 2. Frontend on Vercel
1. Vercel → **Add New Project** → import the repo.
2. **Root Directory:** `web`. Framework preset: Vite (build `npm run build`, output `dist`).
3. Environment variable: `VITE_API_URL` = `https://<service>.onrender.com` (no trailing slash).
4. Deploy. Then copy the final Vercel URL into Render's `CORS_ORIGINS` and redeploy the API if it changed.

## Checks
- Browser console shows no CORS errors; the model dropdown fills; chat replies.
- Microphone works (needs HTTPS, which both hosts provide).
- History tab shows saved items (stored in Neon).

## Local dev is unchanged
`npm run dev` — Vite proxies `/api` to :8787; `VITE_API_URL` and `CORS_ORIGINS` stay empty/open.

## Notes
- Vite bakes `VITE_API_URL` in at build time: change it → redeploy the frontend.
- No user accounts yet: history is shared by everyone using the deployment.
