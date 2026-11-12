# Changelog
Append newest first. Format: date — what/why — files — tests.

## 2026-11-12 — Fix: Improve panel text was right-aligned in Converse
- Why: the panel sat inside the right-aligned user-message wrapper and inherited `text-right`, making corrections hard to read.
- Files: web/src/components/Improve.tsx (`text-left` on panel), web/src/lib/app.test.tsx.
- Tests: new "Improve panel layout" test (failed first, now passes).

## 2026-11-12 — Initial build
- Monorepo (web + server). Model registry with live discovery and automatic failover; LangGraph agents (partner, coach, improve, grammar, essay, email); Groq STT, Gemini TTS with browser fallback.
- UI: black/white with theme toggle; Converse, Grammar, Essay, Email; Improve button in every feature.
- Tests: server 27 (registry, fallback, agents, routes, wav), web 8 (theme, models, speech, Improve presence).
