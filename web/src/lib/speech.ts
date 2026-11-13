import { apiUrl } from './apiUrl'

export type Voice = 'female' | 'male'

let audioEl: HTMLAudioElement | null = null

export function stopSpeaking() {
  audioEl?.pause()
  audioEl = null
  window.speechSynthesis?.cancel()
}

const FEMALE = /female|zira|samantha|aria|jenny|karen|victoria|susan|hazel|moira|tessa|fiona/i
const MALE = /\bmale\b|david|daniel|alex|mark|fred|george|james|guy|ryan|oliver/i

export function pickBrowserVoice(voices: SpeechSynthesisVoice[], kind: Voice) {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const want = kind === 'female' ? FEMALE : MALE
  const avoid = kind === 'female' ? MALE : FEMALE
  return en.find((v) => want.test(v.name) && !(kind === 'male' && /female/i.test(v.name))) ?? en.find((v) => !avoid.test(v.name)) ?? en[0]
}

function browserSpeak(text: string, kind: Voice): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickBrowserVoice(synth.getVoices(), kind)
    if (v) u.voice = v
    u.lang = 'en-US'
    u.pitch = kind === 'female' ? 1.2 : 0.8
    u.rate = kind === 'female' ? 1 : 0.92
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.cancel()
    synth.speak(u)
  })
}

/** Speaks with the server (Gemini) voice; falls back to the browser voice automatically. */
export async function speak(text: string, kind: Voice, fetchImpl: typeof fetch = fetch): Promise<void> {
  stopSpeaking()
  try {
    const res = await fetchImpl(apiUrl('/api/tts'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: kind }),
    })
    if (res.ok) {
      const url = URL.createObjectURL(await res.blob())
      const el = new Audio(url)
      audioEl = el
      await new Promise<void>((resolve, reject) => {
        el.onended = () => resolve()
        el.onerror = () => reject(new Error('playback failed'))
        el.play().catch(reject)
      })
      return
    }
  } catch { /* fall through to browser voice */ }
  await browserSpeak(text, kind)
}

export class Recorder {
  private rec?: MediaRecorder
  private chunks: Blob[] = []
  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.chunks = []
    this.rec = new MediaRecorder(stream)
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
    this.rec.start()
  }
  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const rec = this.rec!
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop())
        resolve(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }))
      }
      rec.stop()
    })
  }
}

export async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('audio', blob, 'speech.webm')
  const res = await fetch(apiUrl('/api/stt'), { method: 'POST', body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Could not transcribe audio')
  return body.text as string
}
