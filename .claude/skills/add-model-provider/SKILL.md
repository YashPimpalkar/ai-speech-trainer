---
name: add-model-provider
description: Use to add another LLM provider besides Groq and Gemini.
---

1. Test in server/tests/registry.test.ts for discovery.
2. Add key to server/src/config.ts and .env.example; extend Provider in server/src/types.ts and the zod enums in app.ts and web/src/lib/models.ts.
3. Add a factory in server/src/models/providers.ts and a discovery function in server/src/models/registry.ts (filter out non-chat models).
4. update-changelog.
