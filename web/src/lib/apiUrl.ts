/** Backend base URL. Empty in dev (Vite proxies /api) or when served from the same origin. */
export const apiUrl = (path: string) => `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}${path}`
