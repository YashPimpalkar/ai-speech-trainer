---
name: write-tests-first
description: Use before any code change in this repo: write failing tests, then implement.
---

1. Read CLAUDE.md and the relevant part of docs/ARCHITECTURE.md.
2. Run `npm test` to confirm a green baseline.
3. Add a failing test (server: server/tests/*.test.ts with fake Llm / injected deps; web: web/src/lib/app.test.tsx).
4. Implement until green; run `npm test` and typechecks.
5. Run the update-changelog skill.
