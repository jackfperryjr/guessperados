/**
 * Procedural audio via Web Audio API — no external asset files required.
 * All sounds are synthesised at runtime from oscillators and noise buffers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAudioContext = AudioContext & { state: AudioContextState }

let _ctx: AnyAudioContext | null = null
let _unlocked = false
const _unlockQueue: Array<() => void> = []

function ac(): AnyAudioContext {
  if (!_ctx) {
    const Ctor = window.AudioContext ??
      (window as unknown as Record<string, unknown>)['webkitAudioContext'] as typeof AudioContext
    _ctx = new Ctor() as AnyAudioContext
  }
  return _ctx
}

// ── waveform helpers ──────────────────────────────────────────────────────────

function tone(
  freq: number, t: number, dur: number, vol: number,
  type: OscillatorType = 'triangle',
  dest?: AudioNode,
): void {
  const c = ac()
  const osc  = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(dest ?? c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.03)
}

function noiseBlip(t: number, dur: number, vol: number, freq: number, q = 3): void {
  const c    = ac()
  const size = Math.ceil(dur * c.sampleRate)
  const buf  = c.createBuffer(1, size, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
  const src    = c.createBufferSource()
  src.buffer   = buf
  const filter = c.createBiquadFilter()
  filter.type  = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const gain = c.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  src.start(t)
  src.stop(t + dur + 0.03)
}

// ── gameplay background music ──��──────────────────────────────────────────────

let _bgPlaying = false
let _bgTimer: ReturnType<typeof setTimeout> | null = null

const BG_BPM  = 95
const BG_BEAT = 60 / BG_BPM
const BG_LOOP = 8 * BG_BEAT

const BASS_FREQS = [65.41, 77.78, 98.00, 87.31]
const MEL_FREQS  = [261.63, 311.13, 392.00, 233.08, 261.63, 349.23, 392.00, 261.63]

function scheduleBgLoop(start: number): void {
  const c = ac()
  BASS_FREQS.forEach((f, i) => {
    const t = start + i * 2 * BG_BEAT
    tone(f,     t, BG_BEAT * 1.75, 0.15, 'sine')
    tone(f / 2, t, BG_BEAT * 1.50, 0.07, 'sine')
  })
  MEL_FREQS.forEach((f, i) => {
    tone(f, start + i * BG_BEAT, BG_BEAT * 0.60, 0.050, 'triangle')
  })
  tone(784.00, start + 0 * BG_BEAT, BG_BEAT * 0.25, 0.022, 'sine')
  tone(523.25, start + 4 * BG_BEAT, BG_BEAT * 0.25, 0.022, 'sine')
  const wait = (start + BG_LOOP - c.currentTime) * 1000 - 100
  _bgTimer = setTimeout(() => {
    if (_bgPlaying) scheduleBgLoop(start + BG_LOOP)
  }, Math.max(0, wait))
}

// ── victory music ─────────────────────────────────────────────────────────────

let _winPlaying = false
let _winTimer: ReturnType<typeof setTimeout> | null = null

// Bright C-major, 120 BPM
const WIN_BPM  = 120
const WIN_BEAT = 60 / WIN_BPM   // 0.5 s
const WIN_LOOP = 8 * WIN_BEAT   // 4.0 s

// Melody: triumphant ascending/descending
const WIN_MEL  = [329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 329.63, 261.63]
// Bass: root-fifth pattern
const WIN_BASS = [65.41, 98.00, 87.31, 98.00]

function scheduleWinLoop(start: number): void {
  const c = ac()
  // Driving bass, every 2 beats
  WIN_BASS.forEach((f, i) => {
    const t = start + i * 2 * WIN_BEAT
    tone(f,     t, WIN_BEAT * 1.6, 0.18, 'triangle')
    tone(f / 2, t, WIN_BEAT * 1.3, 0.09, 'sine')
  })
  // Bright melody
  WIN_MEL.forEach((f, i) => {
    tone(f, start + i * WIN_BEAT, WIN_BEAT * 0.75, 0.11, 'square')
  })
  // High sparkle accent on beat 1 and 5
  tone(1046.50, start + 0 * WIN_BEAT, WIN_BEAT * 0.20, 0.04, 'sine')
  tone(1046.50, start + 4 * WIN_BEAT, WIN_BEAT * 0.20, 0.04, 'sine')
  // Percussive noise on beat 1 and 3
  noiseBlip(start + 0 * WIN_BEAT, 0.06, 0.10, 800)
  noiseBlip(start + 2 * WIN_BEAT, 0.06, 0.07, 600)

  const wait = (start + WIN_LOOP - c.currentTime) * 1000 - 100
  _winTimer = setTimeout(() => {
    if (_winPlaying) scheduleWinLoop(start + WIN_LOOP)
  }, Math.max(0, wait))
}

// ── public API ────────────────────────────────────────────────────────────────

export const SoundManager = {

  /**
   * Call from every user-gesture handler.
   * Resumes the AudioContext and drains any callbacks that were waiting for it.
   */
  unlock() {
    if (_unlocked) return
    ac().resume().then(() => {
      _unlocked = true
      const q = _unlockQueue.splice(0)
      q.forEach(fn => fn())
    }).catch(() => {})
  },

  /**
   * Run `fn` immediately if audio is already unlocked, otherwise queue it
   * to run the moment the user's first gesture unlocks the AudioContext.
   */
  whenUnlocked(fn: () => void) {
    if (_unlocked) { fn(); return }
    _unlockQueue.push(fn)
  },

  // ── SFX ───��──────────────────────────────────────────────────────────────

  meleeSwing() {
    const c = ac(); const t = c.currentTime
    noiseBlip(t,        0.05, 0.22, 650, 8)
    tone(240, t,        0.05, 0.16, 'sawtooth')
    tone(120, t + 0.03, 0.07, 0.09, 'sine')
  },

  playerHit() {
    const c = ac(); const t = c.currentTime
    noiseBlip(t,        0.10, 0.28, 320)
    tone(220, t,        0.08, 0.26, 'square')
    tone(110, t + 0.07, 0.14, 0.16, 'sine')
  },

  enemyHit() {
    const c = ac(); const t = c.currentTime
    tone(600, t,       0.06, 0.20, 'square')
    noiseBlip(t, 0.05, 0.16, 900)
  },

  bossHit() {
    const c = ac(); const t = c.currentTime
    tone(160, t,        0.18, 0.36, 'sawtooth')
    noiseBlip(t, 0.14,  0.28, 200)
    tone(80,  t + 0.05, 0.22, 0.18, 'sine')
  },

  playerDeath() {
    const c = ac(); const t = c.currentTime
    ;[523, 494, 440, 392, 349, 294, 261].forEach((f, i) => {
      tone(f, t + i * 0.09, 0.15, 0.24, 'square')
    })
  },

  enemyDeath() {
    const c = ac(); const t = c.currentTime
    tone(440,  t,        0.04, 0.26, 'square')
    tone(880,  t + 0.04, 0.05, 0.20, 'square')
    tone(1760, t + 0.09, 0.07, 0.14, 'triangle')
    noiseBlip(t, 0.09, 0.20, 1400)
  },

  bossDeath() {
    const c = ac(); const t = c.currentTime
    noiseBlip(t,        0.55, 0.50, 150, 1)
    noiseBlip(t + 0.10, 0.40, 0.38, 300, 2)
    tone(100, t,        0.65, 0.32, 'sine')
    tone(80,  t + 0.18, 0.85, 0.26, 'sine')
    tone(60,  t + 0.45, 1.05, 0.18, 'sine')
    ;[261, 329, 392, 523].forEach((f, i) => {
      tone(f, t + 0.75 + i * 0.11, 0.22, 0.18, 'triangle')
    })
  },

  // ── collectible sounds ────────────────────────────────────────────────────

  collectHeart() {
    const c = ac(); const t = c.currentTime
    // Warm ascending chime: C E G C
    ;[261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
      tone(f, t + i * 0.07, 0.18, 0.18, 'triangle')
    })
  },

  collectAbility() {
    const c = ac(); const t = c.currentTime
    // Sparkling ascending arpeggio
    ;[523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      tone(f, t + i * 0.06, 0.14, 0.14, 'triangle')
      tone(f, t + i * 0.06, 0.08, 0.05, 'sine')
    })
    noiseBlip(t, 0.10, 0.12, 2000, 5)
  },

  collectLife() {
    const c = ac(); const t = c.currentTime
    // Classic 1-up: C E G C E
    ;[261.63, 329.63, 392.00, 523.25, 659.25].forEach((f, i) => {
      tone(f, t + i * 0.09, 0.15, 0.22, 'square')
    })
  },

  collectMystery() {
    const c = ac(); const t = c.currentTime
    // Wacky chromatic wobble
    ;[440, 494, 523, 587, 523, 466, 440].forEach((f, i) => {
      tone(f, t + i * 0.055, 0.10, 0.16, 'sawtooth')
    })
    noiseBlip(t + 0.15, 0.12, 0.15, 600, 4)
  },

  // ── intro theme (one-shot fanfare) ────────────────────────────────────────

  playIntroTheme() {
    const c = ac(); const t = c.currentTime
    const notes = [261.63, 329.63, 392.00, 493.88, 523.25]
    const step  = 0.20
    notes.forEach((f, i) => {
      const isLast = i === notes.length - 1
      const dur    = isLast ? 1.0 : step + 0.12
      tone(f,     t + i * step * 0.82, dur,        0.26, 'triangle')
      tone(f * 2, t + i * step * 0.82, dur * 0.45, 0.06, 'sine')
    })
    const ch = t + (notes.length - 1) * step * 0.82 + 0.05
    tone(261.63, ch, 1.1, 0.10, 'triangle')
    tone(329.63, ch, 1.1, 0.10, 'triangle')
    tone(392.00, ch, 1.1, 0.10, 'triangle')
  },

  // ── background music ──────────────────────────────────────────────────────

  startBgMusic() {
    if (_bgPlaying) return
    _bgPlaying = true
    scheduleBgLoop(ac().currentTime + 0.15)
  },

  stopBgMusic() {
    _bgPlaying = false
    if (_bgTimer !== null) { clearTimeout(_bgTimer); _bgTimer = null }
  },

  // ── victory music ─────────────────────────────────────────────────────────

  startVictoryMusic() {
    if (_winPlaying) return
    _winPlaying = true
    scheduleWinLoop(ac().currentTime + 0.15)
  },

  stopVictoryMusic() {
    _winPlaying = false
    if (_winTimer !== null) { clearTimeout(_winTimer); _winTimer = null }
  },
}
