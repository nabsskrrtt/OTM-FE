// Procedural Sound Effects Manager using Web Audio API
class SoundEffects {
  constructor() {
    this.audioContext = null
    this.masterVolume = 0.7
  }

  // Initialize and/or resume the browser's AudioContext
  async resumeContext() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.audioContext = new AudioContext()
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {})
    }
  }

  // Play a simple synthesized beep
  generateBeep(frequency = 800, duration = 100) {
    this.resumeContext()
    if (!this.audioContext) return

    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.setValueAtTime(frequency, now)
    osc.type = 'sine'

    gain.gain.setValueAtTime(this.masterVolume * 0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000)

    osc.start(now)
    osc.stop(now + duration / 1000)
  }

  // Play countdown beep
  generateCountdownBeep(count) {
    const freq = 400 + count * 100
    this.generateBeep(freq, 100)
  }

  // Play click
  click() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05)
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
    osc.start(now)
    osc.stop(now + 0.05)
  }

  // Play submit
  submit() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15)
    gain.gain.setValueAtTime(this.masterVolume * 0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // Play correct arpeggio
  correct() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(this.masterVolume * 0.25, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.3)
    })
  }

  // Play incorrect buzzer
  incorrect() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.linearRampToValueAtTime(80, now + 0.35)
    gain.gain.setValueAtTime(this.masterVolume * 0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.35)
  }

  // Play timer warning
  timerWarning() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15)
    gain.gain.setValueAtTime(this.masterVolume * 0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // Play timer tick
  timerTick() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, now)
    gain.gain.setValueAtTime(this.masterVolume * 0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03)
    osc.start(now)
    osc.stop(now + 0.03)
  }

  // Play join success
  joinSuccess() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const notes = [587.33, 698.46, 880.00, 1174.66] // D5, F5, A5, D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.06)
      gain.gain.setValueAtTime(this.masterVolume * 0.2, now + i * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25)
      osc.start(now + i * 0.06)
      osc.stop(now + i * 0.06 + 0.25)
    })
  }

  // Play session start sound
  sessionStart() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    // Detuned drone
    ;[130.81, 164.81, 196.00].forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 1.2)
      gain.gain.setValueAtTime(this.masterVolume * 0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
      osc.start(now)
      osc.stop(now + 1.2)
    })
    // High chimes sparkle
    const chimeNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51]
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + 0.2 + i * 0.08)
      gain.gain.setValueAtTime(this.masterVolume * 0.12, now + 0.2 + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2 + i * 0.08 + 0.4)
      osc.start(now + 0.2 + i * 0.08)
      osc.stop(now + 0.2 + i * 0.08 + 0.4)
    })
  }

  // Play question next swoop
  questionNext() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.45)
    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.35, now + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
    osc.start(now)
    osc.stop(now + 0.45)
  }

  // Play avatar selection click
  selectAvatar() {
    this.click()
  }

  // Play victory fanfare
  victory() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const chords = [
      [261.63, 329.63, 392.00], // C4, E4, G4
      [349.23, 440.00, 523.25], // F4, A4, C5
      [392.00, 493.88, 587.33], // G4, B4, D5
      [523.25, 659.25, 783.99, 1046.50] // Triumphant high C Maj
    ]
    chords.forEach((chord, step) => {
      const stepTime = now + step * 0.28
      const duration = step === 3 ? 1.8 : 0.25
      chord.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, stepTime)
        gain.gain.setValueAtTime(this.masterVolume * 0.12, stepTime)
        gain.gain.exponentialRampToValueAtTime(0.005, stepTime + duration)
        osc.start(stepTime)
        osc.stop(stepTime + duration)

        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.type = 'sawtooth'
        osc2.frequency.setValueAtTime(freq, stepTime)
        gain2.gain.setValueAtTime(this.masterVolume * 0.05, stepTime)
        gain2.gain.exponentialRampToValueAtTime(0.005, stepTime + duration)
        osc2.start(stepTime)
        osc2.stop(stepTime + duration)
      })
    })
  }

  // Play a pulsing arpeggio loop for leaderboards
  leaderboardAmbience() {
    this.resumeContext()
    if (!this.audioContext) return null

    const ctx = this.audioContext
    let active = true

    const playPulse = () => {
      if (!active) return
      const now = ctx.currentTime
      const notes = [130.81, 196.00, 261.63, 329.63] // C3, G3, C4, E4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.2)
        gain.gain.setValueAtTime(0.001, now + idx * 0.2)
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.06, now + idx * 0.2 + 0.4)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 1.8)
        osc.start(now + idx * 0.2)
        osc.stop(now + idx * 0.2 + 1.8)
      })
    }

    playPulse()
    const interval = setInterval(playPulse, 2500)

    return {
      pause: () => {
        active = false
        clearInterval(interval)
      }
    }
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }
}

export const soundEffects = new SoundEffects()
