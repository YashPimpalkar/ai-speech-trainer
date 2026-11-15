// Vercel serverless function for the backend project (Root Directory = server).
// Re-exports the compiled handler built by `npm run build` (tsc -> dist/).
export { default } from '../dist/handler.js'
