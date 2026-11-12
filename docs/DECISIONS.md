# Decisions
- LangChain.js + LangGraph over MCP/custom adapter: one interface for all Groq/Gemini models, graphs for multi-step agents.
- Live model discovery, no hardcoded lists: new/expired models handled without code changes.
- Hybrid voice: Groq Whisper STT, Gemini TTS, browser speechSynthesis fallback (free, always works).
- Keys only in server/.env; the browser never sees them.
