// Sound Effects Manager
class SoundEffects {
  constructor() {
    this.sounds = new Map()
    this.audioContext = null
    this.masterVolume = 0.7
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return
    
    try {
      // Try to initialize Web Audio API
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.audioContext = new AudioContext()
        this.initialized = true
      }
    } catch (e) {
      console.log('[v0] Web Audio API not available')
    }
  }

  // Play a sound effect
  play(soundName, volume = 1) {
    try {
      const audio = new Audio(`/assets/sounds/${soundName}.mp3`)
      audio.volume = Math.min(this.masterVolume * volume, 1)
      audio.play().catch(err => {
        console.log('[v0] Could not play sound:', soundName, err)
      })
    } catch (e) {
      console.log('[v0] Sound play error:', e)
    }
  }

  // Play avatar selection sound
  selectAvatar() {
    this.play('select', 0.6)
  }

  // Play question answered correctly
  correct() {
    this.play('correct', 0.8)
  }

  // Play question answered incorrectly
  incorrect() {
    this.play('incorrect', 0.8)
  }

  // Play timer warning (5 seconds remaining)
  timerWarning() {
    this.play('timer-warning', 0.9)
  }

  // Play timer tick
  timerTick() {
    this.play('timer-tick', 0.5)
  }

  // Play join quiz success
  joinSuccess() {
    this.play('join-success', 0.7)
  }

  // Play leaderboard background ambience
  leaderboardAmbience() {
    try {
      const audio = new Audio('/assets/sounds/leaderboard-ambience.mp3')
      audio.volume = this.masterVolume * 0.4
      audio.loop = true
      audio.play().catch(() => {})
      return audio
    } catch (e) {
      return null
    }
  }

  // Generate beep using Web Audio API
  generateBeep(frequency = 800, duration = 100) {
    if (!this.audioContext) {
      this.initialize()
      if (!this.audioContext) return
    }

    const ctx = this.audioContext
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = frequency
    osc.type = 'sine'

    gain.gain.setValueAtTime(this.masterVolume * 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  }

  // Generate countdown beeps
  generateCountdownBeep(count) {
    const freq = 400 + count * 100
    this.generateBeep(freq, 100)
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }
}

export const soundEffects = new SoundEffects()
