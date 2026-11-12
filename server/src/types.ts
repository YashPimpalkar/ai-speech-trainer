export type Provider = 'groq' | 'gemini'
export interface ModelSelection { provider: Provider; model: string }
export interface ModelInfo { provider: Provider; id: string }
export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }
export interface Llm {
  invoke(messages: ChatMsg[]): Promise<string>
  /** which model answered the last call (set after fallback) */
  lastUsed?: ModelSelection
}
