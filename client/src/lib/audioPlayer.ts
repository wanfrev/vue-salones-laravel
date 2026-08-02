let audioEl: HTMLAudioElement | null = null
let unlocked = false

const UNLOCK_EVENTS = ['click', 'touchstart', 'keydown'] as const

function initAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = document.createElement('audio')
    audioEl.preload = 'auto'
    audioEl.style.display = 'none'
    document.body.appendChild(audioEl)
  }
  return audioEl
}

function unlock(): void {
  if (unlocked) return
  unlocked = true
  try {
    const el = initAudioEl()
    el.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    const p = el.play()
    if (p) {
      p.then(() => {
        el.pause()
        el.currentTime = 0
      }).catch(() => {})
    }
  } catch { /* Web Audio not available */ }
}

export function playSound(soundPath: string): void {
  try {
    const el = initAudioEl()
    el.src = soundPath
    el.load()
    el.play().catch(() => {})
  } catch { /* blocked */ }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  function handleUnlock(): void {
    unlock()
    for (const ev of UNLOCK_EVENTS) {
      document.removeEventListener(ev, handleUnlock)
    }
  }
  for (const ev of UNLOCK_EVENTS) {
    document.addEventListener(ev, handleUnlock, { once: true })
  }
}
