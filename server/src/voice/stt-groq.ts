import { config } from '../config.js'

/** Speech-to-text through Groq Whisper. */
export async function transcribe(audio: Buffer, filename: string, mime: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = config.keys().groq
  if (!key) throw Object.assign(new Error('No Groq key for speech recognition'), { status: 401 })
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), filename)
  form.append('model', config.sttModel)
  form.append('language', 'en')
  form.append('response_format', 'json')
  const res = await fetchImpl('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
  })
  const body: any = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? `STT failed (${res.status})`), { status: res.status })
  return String(body.text ?? '').trim()
}
