import { speak, stopSpeaking, type Voice } from '../lib/speech'
import { Button } from './ui'

export default function Listen({ text, voice = 'male' }: { text: string; voice?: Voice }) {
  return (
    <span className="inline-flex gap-2">
      <Button variant="ghost" className="!py-1 !text-xs" onClick={() => speak(text, voice)}>▶ Listen</Button>
      <Button variant="ghost" className="!py-1 !text-xs" onClick={stopSpeaking}>■ Stop</Button>
    </span>
  )
}
