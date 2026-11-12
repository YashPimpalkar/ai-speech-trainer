import { config } from '../config.js'

export type VoiceKind = 'female' | 'male'
const VOICES: Record<VoiceKind, string> = { female: 'Aoede', male: 'Orus' }

/** Gemini returns raw 16-bit mono PCM at 24 kHz; wrap it so browsers can play it. */
export function pcmToWav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

/** Returns WAV audio, or null when Gemini isn't configured/available (client then uses browser voices). */
export async function synthesize(text: string, voice: VoiceKind, fetchImpl: typeof fetch = fetch): Promise<Buffer | null> {
  const key = config.keys().gemini
  if (!key) return null
  const style = voice === 'female' ? 'Say in a sweet, warm, natural young woman voice: ' : 'Say in a clear, confident, natural adult male voice: '
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${config.ttsModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: style + text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } },
        },
      }),
    })
    if (!res.ok) return null
    const data: any = await res.json()
    const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    return b64 ? pcmToWav(Buffer.from(b64, 'base64')) : null
  } catch {
    return null
  }
}
