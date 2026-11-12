---
name: add-feature
description: Use to add a new learning feature (page + agent + route).
---

1. write-tests-first: agent test with fake Llm, route test with supertest, UI render test.
2. Server: server/src/agents/<name>.ts (LangGraph; node names must not equal state keys; use askJson for JSON), route in server/src/app.ts using `route(schema, handler)`.
3. Web: web/src/pages/<Name>.tsx, add to TABS in App.tsx. Include <Improve text=... /> wherever the user writes text; use <Listen /> for voice.
4. Black/white classes only with dark: variants. 5. update-changelog.
