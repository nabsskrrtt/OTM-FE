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

  async initialize() {
    await this.resumeContext()
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

  // Procedural background synthesizer (Fallback & Classic option)
  lobbySynth(options = {}) {
    this.resumeContext()
    if (!this.audioContext) return null

    const ctx = this.audioContext
    let active = true
    const volMultiplier = options.volume !== undefined ? options.volume : 0.65

    // Catchy game-lobby chord progression: C major -> Am -> F -> G
    const progression = [
      { bass: 130.81, chord: [261.63, 329.63, 392.00], melody: [523.25, 659.25, 523.25, 783.99] }, // C
      { bass: 110.00, chord: [220.00, 261.63, 329.63], melody: [440.00, 523.25, 659.25, 523.25] }, // Am
      { bass: 87.31,  chord: [174.61, 220.00, 261.63], melody: [349.23, 440.00, 523.25, 440.00] }, // F
      { bass: 98.00,  chord: [196.00, 246.94, 293.66], melody: [392.00, 493.88, 587.33, 493.88] }  // G
    ]

    let step = 0

    const playBar = () => {
      if (!active) return
      const now = ctx.currentTime
      const current = progression[step % progression.length]
      step++

      // 1. Warm bouncy bass note (0.0s and 0.8s)
      [0.0, 0.8].forEach((timeOffset, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        const freq = idx === 1 ? current.bass * 1.5 : current.bass
        osc.frequency.setValueAtTime(freq, now + timeOffset)
        gain.gain.setValueAtTime(this.masterVolume * volMultiplier * 0.14, now + timeOffset)
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.6)
        osc.start(now + timeOffset)
        osc.stop(now + timeOffset + 0.6)
      })

      // 2. Soft synth chord pad
      current.chord.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(this.masterVolume * volMultiplier * 0.05, now + 0.15)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)
        osc.start(now)
        osc.stop(now + 1.4)
      })

      // 3. Playful bouncy melody plucks (4 notes per bar)
      current.melody.forEach((freq, i) => {
        const noteTime = now + 0.15 + i * 0.35
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, noteTime)
        gain.gain.setValueAtTime(0.001, noteTime)
        gain.gain.linearRampToValueAtTime(this.masterVolume * volMultiplier * 0.06, noteTime + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28)
        osc.start(noteTime)
        osc.stop(noteTime + 0.28)
      })
    }

    playBar()
    const interval = setInterval(playBar, 1600)
    if (options.onPlay) options.onPlay()

    return {
      pause: () => {
        active = false
        clearInterval(interval)
      },
      resume: () => {
        active = true
      },
      setVolume: () => {},
      setTrack: () => {}
    }
  }

  // Upbeat, rich background music for the waiting room/lobby
  // Supports audio tracks: 'upbeat' | 'chill' | 'arcade' | 'synth'
  lobbyMusic(trackId = 'upbeat', options = {}) {
    this.resumeContext()

    if (trackId === 'synth') {
      return this.lobbySynth(options)
    }

    const trackMap = {
      upbeat: '/assets/audio/lobby-upbeat.wav',
      chill: '/assets/audio/lobby-chill.wav',
      arcade: '/assets/audio/lobby-arcade.wav'
    }

    const audioSrc = trackMap[trackId] || trackMap.upbeat
    let audio = null

    try {
      audio = new Audio(audioSrc)
      audio.loop = true
      const vol = options.volume !== undefined ? options.volume : 0.65
      audio.volume = Math.max(0, Math.min(1, this.masterVolume * vol))

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (options.onPlay) options.onPlay()
        }).catch(err => {
          console.warn("Lobby audio autoplay restricted by browser:", err?.message || err)
          if (options.onAutoplayBlocked) options.onAutoplayBlocked(err)
        })
      }

      return {
        audio,
        setVolume: (newVol) => {
          if (audio) {
            audio.volume = Math.max(0, Math.min(1, this.masterVolume * newVol))
          }
        },
        setTrack: (newTrackId) => {
          if (newTrackId === 'synth') {
            if (audio) {
              audio.pause()
              audio = null
            }
            return
          }
          const nextSrc = trackMap[newTrackId] || trackMap.upbeat
          if (audio) {
            audio.pause()
            audio.src = nextSrc
            audio.currentTime = 0
            audio.play().then(() => {
              if (options.onPlay) options.onPlay()
            }).catch((err) => {
              if (options.onAutoplayBlocked) options.onAutoplayBlocked(err)
            })
          }
        },
        pause: () => {
          if (audio) {
            audio.pause()
            audio.currentTime = 0
            audio = null
          }
        },
        resume: () => {
          if (audio) {
            audio.play().then(() => {
              if (options.onPlay) options.onPlay()
            }).catch((err) => {
              if (options.onAutoplayBlocked) options.onAutoplayBlocked(err)
            })
          }
        }
      }
    } catch (e) {
      console.warn("HTML5 audio unavailable, falling back to procedural synth:", e)
      return this.lobbySynth(options)
    }
  }

  // Play cheerful participant join sound effect (bubble pop + rising chime)
  participantJoin() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime

    // Two rising bright harmonic bells
    const notes = [659.25, 987.77] // E5, B5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(this.masterVolume * 0.22, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.25)
    })

    // Soft bubble pop effect
    const pop = ctx.createOscillator()
    const popGain = ctx.createGain()
    pop.connect(popGain)
    popGain.connect(ctx.destination)
    pop.type = 'triangle'
    pop.frequency.setValueAtTime(280, now)
    pop.frequency.exponentialRampToValueAtTime(880, now + 0.07)
    popGain.gain.setValueAtTime(this.masterVolume * 0.16, now)
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
    pop.start(now)
    pop.stop(now + 0.07)
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

  // Play chimes/fanfare for individual podium spot reveals (3rd & 2nd)
  podiumReveal(rank) {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'

    // 3rd place gets slightly lower pitch than 2nd place
    const baseFreq = rank === 3 ? 349.23 : 440.00 // F4 or A4
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.4)

    gain.gain.setValueAtTime(this.masterVolume * 0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4)

    osc.start(now)
    osc.stop(now + 0.4)
  }

  // Play epic grand victory arpeggio and detuned brass chorus chord
  epicVictory() {
    this.resumeContext()
    if (!this.audioContext) return
    const ctx = this.audioContext
    const now = ctx.currentTime

    // 1. Rapid rising synthesized arpeggio chimes (C major scale)
    const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51]
    arpeggio.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)
      gain.gain.setValueAtTime(this.masterVolume * 0.16, now + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3)
      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.3)
    })

    // 2. Grand Sustained Triumphant Fanfare (brassy detuned sawtooth chord chorus)
    const chordTime = now + arpeggio.length * 0.08
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50] // C4, E4, G4, C5, E5, G5, C6
    notes.forEach((freq) => {
      const duration = 4.0 // long sustain

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.type = 'sawtooth'
      osc2.type = 'triangle'

      // Detune slightly to produce chorus effect
      osc1.frequency.setValueAtTime(freq - 1.5, chordTime)
      osc2.frequency.setValueAtTime(freq + 1.5, chordTime)

      // Add a nice low-frequency vibrato for extra epic punch
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 6.5 // 6.5 Hz modulation
      lfoGain.gain.value = 4.0   // 4Hz vibrato range
      lfo.connect(lfoGain)
      lfoGain.connect(osc1.frequency)
      lfoGain.connect(osc2.frequency)
      lfo.start(chordTime)
      lfo.stop(chordTime + duration)

      // Fade-in quick, sustain, then decay
      gain.gain.setValueAtTime(0.001, chordTime)
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.1, chordTime + 0.15)
      gain.gain.setValueAtTime(this.masterVolume * 0.1, chordTime + duration - 1.2)
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + duration)

      osc1.start(chordTime)
      osc2.start(chordTime)
      osc1.stop(chordTime + duration)
      osc2.stop(chordTime + duration)
    })
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }
}

export const soundEffects = new SoundEffects()
