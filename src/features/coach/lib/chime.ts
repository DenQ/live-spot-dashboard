const GAP_MS = 8_000
const PEAK_GAIN = 0.035

let audio: AudioContext | null = null
let lastPlayedAt = 0

function getAudio(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) {
    return null
  }

  if (!audio) {
    audio = new Ctor()
  }

  return audio
}

function ping(ctx: AudioContext, when: number, frequency: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, when + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.24)
}

export function unlockHintChime() {
  const ctx = getAudio()
  if (!ctx || ctx.state === 'closed') {
    return
  }

  void ctx.resume()
}

export function playHintChime() {
  const now = Date.now()
  if (now - lastPlayedAt < GAP_MS) {
    return
  }

  const ctx = getAudio()
  if (!ctx || ctx.state === 'closed') {
    return
  }

  lastPlayedAt = now
  void ctx.resume().then(() => {
    const t = ctx.currentTime
    ping(ctx, t, 659.25)
    ping(ctx, t + 0.14, 830.61)
  })
}
