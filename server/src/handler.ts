import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from './bootstrap.js'

let app: ReturnType<typeof buildApp> | undefined

/** Vercel serverless entry: the Express app is a plain (req, res) function. Built once per warm instance. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  app ??= buildApp()
  return app(req, res)
}
