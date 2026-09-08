import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples, numChannels = 2, sampleRate = SAMPLE_RATE) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = numSamples * numChannels * 2;
  const buffer = Buffer.alloc(44);

  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

// Convert midi note number to frequency in Hz
function m2f(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Low-pass filter helper (simple 1-pole RC filter)
class LowPass {
  constructor(cutoff, sampleRate = SAMPLE_RATE) {
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    this.alpha = dt / (rc + dt);
    this.prev = 0;
  }
  process(sample) {
    this.prev = this.prev + this.alpha * (sample - this.prev);
    return this.prev;
  }
}

// High-pass filter helper
class HighPass {
  constructor(cutoff, sampleRate = SAMPLE_RATE) {
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    this.alpha = rc / (rc + dt);
    this.prevIn = 0;
    this.prevOut = 0;
  }
  process(sample) {
    const out = this.alpha * (this.prevOut + sample - this.prevIn);
    this.prevIn = sample;
    this.prevOut = out;
    return out;
  }
}

// Generate Track 1: Upbeat Kahoot-style Funky Groove
function generateUpbeatGroove() {
  const bpm = 126;
  const beatSec = 60 / bpm;
  const bars = 8; // 8 bars = 32 beats
  const totalDuration = bars * 4 * beatSec; // ~15.238 seconds
  const totalSamples = Math.floor(totalDuration * SAMPLE_RATE);

  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  // Chord progression (2 bars each):
  // Bars 1-2: C major (C4, E4, G4, B4) / Bass C2
  // Bars 3-4: A minor (A3, C4, E4, G4) / Bass A1
  // Bars 5-6: F major (F3, A3, C4, E4) / Bass F1
  // Bars 7-8: G dominant (G3, B3, D4, F4) / Bass G1

  const chords = [
    { bass: 36, notes: [60, 64, 67, 71] }, // C
    { bass: 33, notes: [57, 60, 64, 67] }, // Am
    { bass: 29, notes: [53, 57, 60, 64] }, // F
    { bass: 31, notes: [55, 59, 62, 65] }  // G
  ];

  // 1. Synthesize Drums: Kick, Snare/Clap, Hi-Hats
  for (let b = 0; b < bars * 4; b++) {
    const beatStartTime = b * beatSec;
    const isSnare = (b % 4 === 1 || b % 4 === 3); // beats 2 & 4
    const isKick = (b % 4 === 0 || b % 4 === 2 || (b % 4 === 2.5)); // 1, 3, and offbeat

    // Kick drum
    if (isKick) {
      const startIdx = Math.floor(beatStartTime * SAMPLE_RATE);
      const kickLen = Math.floor(0.25 * SAMPLE_RATE);
      for (let i = 0; i < kickLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 140 * Math.exp(-t * 28) + 45; // pitch drop
        const env = Math.exp(-t * 14);
        const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.55;
        leftChannel[startIdx + i] += sample;
        rightChannel[startIdx + i] += sample;
      }
    }

    // Snare / Clap
    if (isSnare) {
      const startIdx = Math.floor(beatStartTime * SAMPLE_RATE);
      const snareLen = Math.floor(0.2 * SAMPLE_RATE);
      const lp = new LowPass(3500);
      const hp = new HighPass(400);
      for (let i = 0; i < snareLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const noise = (Math.random() * 2 - 1);
        const filteredNoise = hp.process(lp.process(noise));
        const bodyTone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.3;
        const env = Math.exp(-t * 18);
        const sample = (filteredNoise * 0.7 + bodyTone) * env * 0.45;
        leftChannel[startIdx + i] += sample * 0.9;
        rightChannel[startIdx + i] += sample * 1.0;
      }
    }

    // Hi-hats: 16th note pattern with swing
    for (let step = 0; step < 4; step++) {
      const hatTime = beatStartTime + (step * beatSec / 4);
      const startIdx = Math.floor(hatTime * SAMPLE_RATE);
      const isAccented = (step % 2 === 0);
      const hatLen = Math.floor((isAccented ? 0.05 : 0.03) * SAMPLE_RATE);
      const hp = new HighPass(6000);
      for (let i = 0; i < hatLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const noise = (Math.random() * 2 - 1);
        const filtered = hp.process(noise);
        const env = Math.exp(-t * 90);
        const amp = isAccented ? 0.18 : 0.1;
        const sample = filtered * env * amp;
        leftChannel[startIdx + i] += sample * 0.8;
        rightChannel[startIdx + i] += sample * 1.1;
      }
    }
  }

  // 2. Bouncy Slap Bass (Syncopated Funky Pattern)
  const bassRhythm = [
    { offset: 0.0, dur: 0.35, oct: 0 },
    { offset: 0.75, dur: 0.25, oct: 12 },
    { offset: 1.0, dur: 0.35, oct: 0 },
    { offset: 1.5, dur: 0.25, oct: 7 },
    { offset: 2.0, dur: 0.4, oct: 0 },
    { offset: 2.75, dur: 0.2, oct: 12 },
    { offset: 3.25, dur: 0.3, oct: 5 },
    { offset: 3.75, dur: 0.2, oct: 7 }
  ];

  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[Math.floor(bar / 2)];
    const barStartTime = bar * 4 * beatSec;

    bassRhythm.forEach(noteInfo => {
      const noteTime = barStartTime + noteInfo.offset * beatSec;
      if (noteTime >= totalDuration) return;
      const startIdx = Math.floor(noteTime * SAMPLE_RATE);
      const noteLen = Math.floor(noteInfo.dur * beatSec * SAMPLE_RATE);
      const freq = m2f(chord.bass + noteInfo.oct);

      for (let i = 0; i < noteLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const fundamental = Math.sin(2 * Math.PI * freq * t);
        const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.5;
        const second = Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
        const env = Math.exp(-t * 6);
        const sample = (fundamental + sub + second) * env * 0.32;
        leftChannel[startIdx + i] += sample;
        rightChannel[startIdx + i] += sample;
      }
    });
  }

  // 3. Rhodes / Synth Chord Stabs (Syncopated on off-beats for funky groove)
  const chordHits = [0.5, 1.25, 2.5, 3.25]; // upbeat reggae/funk syncopation
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[Math.floor(bar / 2)];
    const barStartTime = bar * 4 * beatSec;

    chordHits.forEach(hitBeat => {
      const hitTime = barStartTime + hitBeat * beatSec;
      const startIdx = Math.floor(hitTime * SAMPLE_RATE);
      const chordLen = Math.floor(0.45 * beatSec * SAMPLE_RATE);

      chord.notes.forEach((midi, chordIdx) => {
        const freq = m2f(midi);
        const pan = (chordIdx / (chord.notes.length - 1)) * 0.6 - 0.3; // stereo width
        for (let i = 0; i < chordLen && startIdx + i < totalSamples; i++) {
          const t = i / SAMPLE_RATE;
          // Electric piano bell chime + warm sine
          const osc1 = Math.sin(2 * Math.PI * freq * t);
          const osc2 = Math.sin(2 * Math.PI * (freq * 2.01) * t) * 0.2;
          const osc3 = Math.sin(2 * Math.PI * (freq * 3.0) * t) * 0.08;
          const env = Math.exp(-t * 8);
          const sample = (osc1 + osc2 + osc3) * env * 0.09;
          leftChannel[startIdx + i] += sample * (0.8 - pan);
          rightChannel[startIdx + i] += sample * (0.8 + pan);
        }
      });
    });
  }

  // 4. Playful Marimba / Bell Melody (Kahoot-inspired catchy hook!)
  // Bars 1-4 hook: C5, E5, G5, A5, G5, E5, D5, C5...
  const melodyNotes = [
    // Bar 0
    { beat: 0.0, note: 72, dur: 0.3 }, // C5
    { beat: 0.5, note: 76, dur: 0.3 }, // E5
    { beat: 1.0, note: 79, dur: 0.4 }, // G5
    { beat: 2.0, note: 81, dur: 0.5 }, // A5
    { beat: 3.0, note: 79, dur: 0.4 }, // G5
    // Bar 1
    { beat: 4.0, note: 76, dur: 0.3 }, // E5
    { beat: 4.5, note: 74, dur: 0.3 }, // D5
    { beat: 5.0, note: 72, dur: 0.6 }, // C5
    { beat: 6.5, note: 74, dur: 0.3 }, // D5
    { beat: 7.0, note: 76, dur: 0.5 }, // E5
    // Bar 2 (Am)
    { beat: 8.0, note: 76, dur: 0.3 },
    { beat: 8.5, note: 79, dur: 0.3 },
    { beat: 9.0, note: 81, dur: 0.5 },
    { beat: 10.0, note: 84, dur: 0.5 }, // C6
    { beat: 11.0, note: 81, dur: 0.4 },
    // Bar 3
    { beat: 12.0, note: 79, dur: 0.4 },
    { beat: 13.0, note: 76, dur: 0.4 },
    { beat: 14.0, note: 74, dur: 0.5 },
    { beat: 15.0, note: 72, dur: 0.6 },
    // Bar 4 (F)
    { beat: 16.0, note: 69, dur: 0.3 }, // A4
    { beat: 16.5, note: 72, dur: 0.3 }, // C5
    { beat: 17.0, note: 76, dur: 0.4 }, // E5
    { beat: 18.0, note: 77, dur: 0.5 }, // F5
    { beat: 19.0, note: 76, dur: 0.4 },
    // Bar 5
    { beat: 20.0, note: 72, dur: 0.4 },
    { beat: 21.0, note: 69, dur: 0.4 },
    { beat: 22.0, note: 72, dur: 0.6 },
    // Bar 6 (G)
    { beat: 24.0, note: 71, dur: 0.3 }, // B4
    { beat: 24.5, note: 74, dur: 0.3 }, // D5
    { beat: 25.0, note: 77, dur: 0.4 }, // F5
    { beat: 26.0, note: 79, dur: 0.5 }, // G5
    // Bar 7 turnaround
    { beat: 28.0, note: 81, dur: 0.3 }, // A5
    { beat: 28.5, note: 79, dur: 0.3 }, // G5
    { beat: 29.0, note: 76, dur: 0.3 }, // E5
    { beat: 29.5, note: 74, dur: 0.3 }, // D5
    { beat: 30.0, note: 72, dur: 0.6 }  // C5 (resolves back to loop point)
  ];

  melodyNotes.forEach(m => {
    const noteTime = m.beat * beatSec;
    const startIdx = Math.floor(noteTime * SAMPLE_RATE);
    const noteLen = Math.floor((m.dur * beatSec + 0.15) * SAMPLE_RATE);
    const freq = m2f(m.note);

    for (let i = 0; i < noteLen && startIdx + i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      // Marimba wood strike simulation
      const osc1 = Math.sin(2 * Math.PI * freq * t);
      const osc2 = Math.sin(2 * Math.PI * freq * 3.98 * t) * 0.3; // woody harmonic
      const osc3 = Math.sin(2 * Math.PI * freq * 9.2 * t) * 0.1;
      const env = Math.exp(-t * 9);
      const sample = (osc1 + osc2 + osc3) * env * 0.18;
      leftChannel[startIdx + i] += sample * 0.75;
      rightChannel[startIdx + i] += sample * 0.85;
    }
  });

  // Master limiting & soft clipping
  const outBuffer = Buffer.alloc(totalSamples * 4);
  for (let i = 0; i < totalSamples; i++) {
    let l = leftChannel[i];
    let r = rightChannel[i];

    // Smooth soft saturation limiter
    l = Math.tanh(l * 1.2);
    r = Math.tanh(r * 1.2);

    const intL = Math.max(-32768, Math.min(32767, Math.floor(l * 32000)));
    const intR = Math.max(-32768, Math.min(32767, Math.floor(r * 32000)));

    outBuffer.writeInt16LE(intL, i * 4);
    outBuffer.writeInt16LE(intR, i * 4 + 2);
  }

  return Buffer.concat([createWavHeader(totalSamples), outBuffer]);
}

// Generate Track 2: Chill Morning Lofi
function generateChillLofi() {
  const bpm = 84;
  const beatSec = 60 / bpm;
  const bars = 4; // 16 beats = ~11.43s
  const totalDuration = bars * 4 * beatSec;
  const totalSamples = Math.floor(totalDuration * SAMPLE_RATE);

  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  // Soft jazz chords: Fmaj7 (53, 60, 64, 69) -> Em7 (52, 59, 62, 67) -> Dm7 (50, 57, 60, 65) -> Cmaj7 (48, 55, 59, 64)
  const lofiChords = [
    { bass: 29, notes: [53, 57, 60, 64, 69] },
    { bass: 28, notes: [52, 55, 59, 62, 67] },
    { bass: 26, notes: [50, 53, 57, 60, 65] },
    { bass: 24, notes: [48, 52, 55, 59, 64] }
  ];

  // Subtle vinyl crackle
  for (let i = 0; i < totalSamples; i++) {
    if (Math.random() < 0.003) {
      const crackle = (Math.random() * 2 - 1) * 0.04;
      leftChannel[i] += crackle;
      rightChannel[i] += crackle;
    }
  }

  // Smooth warm drums (soft thump kick & rimshot snare)
  for (let b = 0; b < bars * 4; b++) {
    const beatStartTime = b * beatSec;
    // Kick on 1 and (2.5 or 3)
    if (b % 4 === 0 || b % 4 === 2.5) {
      const startIdx = Math.floor(beatStartTime * SAMPLE_RATE);
      const kickLen = Math.floor(0.3 * SAMPLE_RATE);
      for (let i = 0; i < kickLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 90 * Math.exp(-t * 22) + 38;
        const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.4;
        leftChannel[startIdx + i] += sample;
        rightChannel[startIdx + i] += sample;
      }
    }
    // Rimshot on 2 and 4
    if (b % 4 === 1 || b % 4 === 3) {
      const startIdx = Math.floor(beatStartTime * SAMPLE_RATE);
      const rimLen = Math.floor(0.12 * SAMPLE_RATE);
      for (let i = 0; i < rimLen && startIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const tone = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 35) * 0.25;
        const snap = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.2;
        leftChannel[startIdx + i] += (tone + snap);
        rightChannel[startIdx + i] += (tone + snap);
      }
    }
  }

  // Warm Rhodes chords
  for (let bar = 0; bar < bars; bar++) {
    const chord = lofiChords[bar];
    const barStartTime = bar * 4 * beatSec;

    // Chords strum on beat 0 and beat 2.5
    [0.0, 2.5].forEach(beatOffset => {
      const hitTime = barStartTime + beatOffset * beatSec;
      const startIdx = Math.floor(hitTime * SAMPLE_RATE);
      const len = Math.floor(1.8 * beatSec * SAMPLE_RATE);

      chord.notes.forEach((midi, idx) => {
        const freq = m2f(midi);
        const strumOffset = idx * 0.02; // slight strum delay
        const sIdx = startIdx + Math.floor(strumOffset * SAMPLE_RATE);

        for (let i = 0; i < len && sIdx + i < totalSamples; i++) {
          const t = i / SAMPLE_RATE;
          // Warm EPiano FM
          const tremolo = 1 + 0.15 * Math.sin(2 * Math.PI * 4 * t);
          const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2.2) * 0.08 * tremolo;
          leftChannel[sIdx + i] += sample * 0.9;
          rightChannel[sIdx + i] += sample * 0.9;
        }
      });
    });

    // Deep mellow bass
    const bassFreq = m2f(chord.bass + 12);
    const bIdx = Math.floor(barStartTime * SAMPLE_RATE);
    const bLen = Math.floor(3.6 * beatSec * SAMPLE_RATE);
    for (let i = 0; i < bLen && bIdx + i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const sample = Math.sin(2 * Math.PI * bassFreq * t) * Math.exp(-t * 1.5) * 0.35;
      leftChannel[bIdx + i] += sample;
      rightChannel[bIdx + i] += sample;
    }
  }

  // Soft Music Box Melody
  const lofiMelody = [
    { beat: 0.5, note: 72 }, { beat: 1.5, note: 76 }, { beat: 2.0, note: 79 },
    { beat: 4.5, note: 71 }, { beat: 5.5, note: 74 }, { beat: 6.0, note: 76 },
    { beat: 8.5, note: 69 }, { beat: 9.5, note: 72 }, { beat: 10.0, note: 76 },
    { beat: 12.5, note: 67 }, { beat: 13.5, note: 71 }, { beat: 14.5, note: 72 }
  ];

  lofiMelody.forEach(m => {
    const sIdx = Math.floor(m.beat * beatSec * SAMPLE_RATE);
    const freq = m2f(m.note);
    const len = Math.floor(0.8 * SAMPLE_RATE);
    for (let i = 0; i < len && sIdx + i < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const bell = Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 2.0 * t) * 0.2;
      const sample = bell * Math.exp(-t * 4.5) * 0.12;
      leftChannel[sIdx + i] += sample * 0.8;
      rightChannel[sIdx + i] += sample * 1.1;
    }
  });

  const outBuffer = Buffer.alloc(totalSamples * 4);
  for (let i = 0; i < totalSamples; i++) {
    const l = Math.tanh(leftChannel[i] * 1.1);
    const r = Math.tanh(rightChannel[i] * 1.1);
    outBuffer.writeInt16LE(Math.floor(l * 32000), i * 4);
    outBuffer.writeInt16LE(Math.floor(r * 32000), i * 4 + 2);
  }

  return Buffer.concat([createWavHeader(totalSamples), outBuffer]);
}

// Generate Track 3: Arcade Retro 8-Bit Party
function generateArcadeRetro() {
  const bpm = 132;
  const beatSec = 60 / bpm;
  const bars = 8;
  const totalDuration = bars * 4 * beatSec;
  const totalSamples = Math.floor(totalDuration * SAMPLE_RATE);

  const leftChannel = new Float32Array(totalSamples);
  const rightChannel = new Float32Array(totalSamples);

  // 8-bit pulse square wave helper
  function square(freq, t, duty = 0.5) {
    const phase = (freq * t) % 1.0;
    return phase < duty ? 1.0 : -1.0;
  }

  // 8-bit noise drum helper
  for (let b = 0; b < bars * 4; b++) {
    const bTime = b * beatSec;
    // 8-bit kick
    if (b % 2 === 0) {
      const sIdx = Math.floor(bTime * SAMPLE_RATE);
      const len = Math.floor(0.12 * SAMPLE_RATE);
      for (let i = 0; i < len && sIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 120 * (1 - t * 7);
        if (freq <= 0) break;
        const s = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3) * (1 - t * 8);
        leftChannel[sIdx + i] += s;
        rightChannel[sIdx + i] += s;
      }
    }
    // 8-bit snare
    if (b % 4 === 1 || b % 4 === 3) {
      const sIdx = Math.floor(bTime * SAMPLE_RATE);
      const len = Math.floor(0.15 * SAMPLE_RATE);
      for (let i = 0; i < len && sIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const n = (Math.random() > 0.5 ? 0.25 : -0.25) * Math.exp(-t * 20);
        leftChannel[sIdx + i] += n;
        rightChannel[sIdx + i] += n;
      }
    }
  }

  // Fast Bouncy Arpeggio (16th notes throughout)
  const arpRoots = [60, 60, 57, 57, 53, 53, 55, 55]; // C, C, Am, Am, F, F, G, G
  const intervals = [0, 4, 7, 12, 16, 12, 7, 4]; // major arpeggio
  for (let bar = 0; bar < bars; bar++) {
    const root = arpRoots[bar];
    const barStart = bar * 4 * beatSec;
    for (let step = 0; step < 16; step++) {
      const stepTime = barStart + step * (beatSec / 4);
      const sIdx = Math.floor(stepTime * SAMPLE_RATE);
      const freq = m2f(root + intervals[step % intervals.length]);
      const len = Math.floor(0.08 * SAMPLE_RATE);
      for (let i = 0; i < len && sIdx + i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const s = square(freq, t, 0.25) * Math.exp(-t * 25) * 0.12;
        leftChannel[sIdx + i] += s;
        rightChannel[sIdx + i] += s;
      }
    }
  }

  const outBuffer = Buffer.alloc(totalSamples * 4);
  for (let i = 0; i < totalSamples; i++) {
    const l = Math.tanh(leftChannel[i]);
    const r = Math.tanh(rightChannel[i]);
    outBuffer.writeInt16LE(Math.floor(l * 28000), i * 4);
    outBuffer.writeInt16LE(Math.floor(r * 28000), i * 4 + 2);
  }

  return Buffer.concat([createWavHeader(totalSamples), outBuffer]);
}

// Write the files
const outDir = path.resolve('public/assets/audio');
console.log('Generating audio files into:', outDir);

const upbeatWav = generateUpbeatGroove();
fs.writeFileSync(path.join(outDir, 'lobby-upbeat.wav'), upbeatWav);
console.log('Created lobby-upbeat.wav size:', upbeatWav.length);

const chillWav = generateChillLofi();
fs.writeFileSync(path.join(outDir, 'lobby-chill.wav'), chillWav);
console.log('Created lobby-chill.wav size:', chillWav.length);

const arcadeWav = generateArcadeRetro();
fs.writeFileSync(path.join(outDir, 'lobby-arcade.wav'), arcadeWav);
console.log('Created lobby-arcade.wav size:', arcadeWav.length);

console.log('All 3 background music tracks generated successfully!');
