// Vercel serverless function for every /api/* route (see vercel.json rewrites).
// Imports the compiled server (built by the Vercel build command: npm run build).
export { default } from '../server/dist/handler.js'
