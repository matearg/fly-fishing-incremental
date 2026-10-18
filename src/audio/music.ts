import type { LocationId } from '../game/data'
import type { Note } from './sounds'

export type TuneId = LocationId | 'title'

// One token per eighth note, spaces between, `|` bar lines ignored.
// Melody and bass: a pitch (`E5`, `C#4`), `-` holds the previous note one more step, `.` rests.
// Beat patterns: `k` a soft low thump, `h` a light hat, `.` rest; a pattern repeats across the phrase.
export interface Phrase { melody: string; bass: string }
export interface Tune { bpm: number; phrases: Phrase[]; beats: string[] }
// drop: index of a sounding melody note to leave out.
export interface Pick { phrase: number; melody: boolean; beat: number | null; drop: number | null }

// Quiet next to the effects, so a bite or a catch still stands out.
export const MELODY_GAIN = 0.05
export const BASS_GAIN = 0.12
const melodyNote = (at: number, dur: number, freq: number): Note => ({ wave: 'square', at, dur, freq, gain: MELODY_GAIN, attack: 15 })
const bassNote = (at: number, dur: number, freq: number): Note => ({ wave: 'triangle', at, dur, freq, gain: BASS_GAIN, attack: 10 })
const thump = (at: number): Note => ({ wave: 'triangle', at, dur: 120, freq: 110, to: 50, gain: 0.12 })
const hat = (at: number): Note => ({ wave: 'noise', at, dur: 40, freq: 7000, gain: 0.025, q: 1 })

// The music breathes: now and then the melody or the beat sits a phrase out, or a melody note drops.
const MELODY_REST = 0.15
const BEAT_REST = 0.2
const DROP = 0.25

export function tokens(src: string): string[] {
  return src.split(/\s+/).filter(t => t && t !== '|')
}

const SEMIS: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }

export function pitch(name: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(name)
  if (!m) throw new Error(`bad pitch: ${name}`)
  return 440 * 2 ** ((SEMIS[m[1]] + (m[2] ? 1 : 0) + 12 * (Number(m[3]) - 4)) / 12)
}

export function phraseSteps(p: Phrase): number {
  const n = tokens(p.melody).length
  if (tokens(p.bass).length !== n) throw new Error(`melody and bass differ in length: ${p.melody}`)
  return n
}

export function stepMs(t: Tune): number {
  return 30000 / t.bpm
}

function line(src: string, step: number, make: (at: number, dur: number, freq: number) => Note): Note[] {
  const out: Note[] = []
  let held: Note | null = null
  tokens(src).forEach((tok, i) => {
    if (tok === '-') { if (held) held.dur += step; return } // a hold after a rest is more rest
    held = tok === '.' ? null : make(i * step, step, pitch(tok))
    if (held) out.push(held)
  })
  return out
}

function beatLine(src: string, steps: number, step: number): Note[] {
  const pat = tokens(src), out: Note[] = []
  for (let i = 0; i < steps; i++) {
    const tok = pat[i % pat.length]
    if (tok === 'k') out.push(thump(i * step))
    else if (tok === 'h') out.push(hat(i * step))
    else if (tok !== '.') throw new Error(`bad beat token: ${tok}`)
  }
  return out
}

const melodyLine = (t: Tune, phrase: number) => line(t.phrases[phrase].melody, stepMs(t), melodyNote)

// Notes for one phrase, timed from its start.
export function pickNotes(t: Tune, pick: Pick): Note[] {
  const p = t.phrases[pick.phrase], step = stepMs(t), steps = phraseSteps(p)
  const melody = pick.melody ? melodyLine(t, pick.phrase).filter((_, i) => i !== pick.drop) : []
  const beat = pick.beat === null ? [] : beatLine(t.beats[pick.beat], steps, step)
  return [...melody, ...line(p.bass, step, bassNote), ...beat]
}

// Phrase 0 is the tune's opening; after that never the same phrase twice in a row.
export function nextPick(t: Tune, prev: Pick | null, rand: () => number): Pick {
  if (!prev) return { phrase: 0, melody: true, beat: 0, drop: null }
  const n = t.phrases.length
  const phrase = n < 2 ? 0 : (prev.phrase + 1 + Math.floor(rand() * (n - 1))) % n
  const melody = rand() >= MELODY_REST
  const beat = rand() < BEAT_REST ? null : Math.floor(rand() * t.beats.length)
  const sounding = melody ? melodyLine(t, phrase).length : 0
  const drop = sounding > 1 && rand() < DROP ? Math.floor(rand() * sounding) : null
  return { phrase, melody, beat, drop }
}

// Each tune keeps to one key, so its phrases sound like one piece in any order.
export const TUNES: Record<TuneId, Tune> = {
  // Warm and welcoming: C major.
  title: {
    bpm: 72,
    phrases: [
      { melody: 'E5 - - - G5 - E5 - | C5 - - - - - . . | A4 - C5 - F5 - E5 - | D5 - - - - - . .',
        bass: '  C3 - - - G2 - - - | A2 - - - E3 - - - | F2 - - - C3 - - - | G2 - - - D3 - - -' },
      { melody: 'G5 - A5 - G5 - E5 - | E5 - D5 - C5 - - - | C5 - D5 - F5 - A5 - | G5 - - - - - - .',
        bass: '  C3 - - - E3 - G2 - | A2 - - - C3 - E3 - | F2 - - - A2 - C3 - | G2 - - - B2 - D3 -' },
      { melody: 'A5 - - - G5 - F5 - | D5 - - - B4 - - - | G5 - - - E5 - D5 - | C5 - - - - - . .',
        bass: '  F2 - - - C3 - - - | G2 - - - D3 - - - | E2 - - - B2 - - - | A2 - - - E3 - - -' },
      { melody: 'C5 - D5 - F5 - - - | D5 - E5 - G5 - - - | E5 - - - D5 - C5 - | C5 - - - - - . .',
        bass: '  F2 - - - A2 - - - | G2 - - - B2 - - - | C3 - - - G2 - - - | C3 - - - - - . .' },
      { melody: '. . E5 - - - C5 - | . . F5 - A5 - - - | G5 - - - E5 - C5 - | D5 - - - . . . .',
        bass: '  A2 - - - E3 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - -' },
      { melody: 'C6 - - - G5 - - - | B5 - - - G5 - E5 - | A5 - - - F5 - C5 - | D5 - E5 - D5 - . .',
        bass: '  C3 - - - G2 - - - | E2 - - - B2 - - - | F2 - - - C3 - - - | G2 - - - D3 - - -' },
      { melody: 'E5 - - - A5 - - - | G5 - - - B4 - - - | A4 - C5 - F5 - - - | E5 - - - - - . .',
        bass: '  A2 - - - E3 - - - | E2 - - - B2 - - - | F2 - - - C3 - - - | C3 - - - G2 - - -' },
    ],
    beats: ['k . . . h . . .', 'k . h . . . h .', '. . h . . . h .'],
  },
  // Light and playful but unhurried: G major, bouncing bass.
  creek: {
    bpm: 76,
    phrases: [
      { melody: 'D5 - B4 - D5 - G5 - | E5 - - - D5 - - - | A4 - B4 - D5 - A4 - | G4 - - - - - . .',
        bass: '  G2 - D3 - G2 - D3 - | C3 - G2 - C3 - G2 - | D3 - A2 - D3 - A2 - | G2 - D3 - G2 - - -' },
      { melody: 'B4 - D5 - E5 - D5 - | B4 - - - G4 - - - | E5 - G5 - E5 - D5 - | A4 - - - - - . .',
        bass: '  G2 - D3 - G2 - D3 - | E2 - B2 - E2 - B2 - | C3 - G2 - C3 - G2 - | D3 - A2 - D3 - A2 -' },
      { melody: 'G5 - - - E5 - G5 - | D5 - - - B4 - - - | A4 - - - D5 - E5 - | D5 - B4 - G4 - . .',
        bass: '  C3 - G2 - C3 - G2 - | G2 - D3 - G2 - D3 - | D3 - A2 - D3 - A2 - | G2 - D3 - G2 - - -' },
      { melody: '. . B4 - E5 - G5 - | E5 - D5 - . . . . | . . D5 - B4 - D5 - | A4 - - - . . . .',
        bass: '  E2 - B2 - E2 - B2 - | C3 - G2 - C3 - G2 - | G2 - D3 - G2 - D3 - | D3 - A2 - D3 - A2 -' },
      { melody: 'G5 - A5 - G5 - E5 - | G5 - - - . . . . | D5 - E5 - D5 - B4 - | A4 - - - . . . .',
        bass: '  G2 - D3 - G2 - D3 - | C3 - G2 - C3 - G2 - | G2 - D3 - G2 - D3 - | D3 - A2 - D3 - A2 -' },
      { melody: 'E5 - - - G5 - - - | F#5 - - - A5 - - - | G5 - - - E5 - B4 - | D5 - - - - - . .',
        bass: '  C3 - G2 - C3 - G2 - | D3 - A2 - D3 - A2 - | E2 - B2 - E2 - B2 - | G2 - D3 - G2 - - -' },
    ],
    beats: ['k . h . . . h .', 'k . . . h . . .', '. . h . . . h .'],
  },
  // Flowing, with a running bass: D major.
  river: {
    bpm: 72,
    phrases: [
      { melody: 'F#5 - - - - - E5 - | D5 - - - B4 - - - | D5 - - - G5 - F#5 - | E5 - - - - - . .',
        bass: '  D2 A2 D3 A2 D2 A2 D3 A2 | B1 F#2 B2 F#2 B1 F#2 B2 F#2 | G1 D2 G2 D2 G1 D2 G2 D2 | A1 E2 A2 E2 A1 E2 A2 E2' },
      { melody: 'A5 - F#5 - E5 - D5 - | F#5 - - - - - . . | G5 - F#5 - E5 - D5 - | C#5 - - - E5 - - -',
        bass: '  D2 A2 D3 A2 D2 A2 D3 A2 | B1 F#2 B2 F#2 B1 F#2 B2 F#2 | G1 D2 G2 D2 G1 D2 G2 D2 | A1 E2 A2 E2 A1 E2 A2 E2' },
      { melody: 'B4 - D5 - G5 - - - | A5 - - - E5 - - - | F#5 - - - C#5 - - - | D5 - - - B4 - - -',
        bass: '  G1 D2 G2 D2 G1 D2 G2 D2 | A1 E2 A2 E2 A1 E2 A2 E2 | F#2 C#3 F#3 C#3 F#2 C#3 F#3 C#3 | B1 F#2 B2 F#2 B1 F#2 B2 F#2' },
      { melody: 'G5 - - - E5 - B4 - | C#5 - - - E5 - A4 - | D5 - - - - - - - | . . . . . . . .',
        bass: '  E2 B2 E3 B2 E2 B2 E3 B2 | A1 E2 A2 E2 A1 E2 A2 E2 | D2 A2 D3 A2 D2 A2 D3 A2 | D2 A2 D3 A2 D2 A2 D3 A2' },
      { melody: '. . D5 - F#5 - B5 - | A5 - - - G5 - D5 - | . . F#5 - A5 - D6 - | C#6 - - - A5 - - -',
        bass: '  B1 F#2 B2 F#2 B1 F#2 B2 F#2 | G1 D2 G2 D2 G1 D2 G2 D2 | D2 A2 D3 A2 D2 A2 D3 A2 | A1 E2 A2 E2 A1 E2 A2 E2' },
      { melody: 'D5 - - - A4 - - - | B4 - - - D5 - - - | F#4 - A4 - D5 - - - | E5 - - - C#5 - - -',
        bass: '  D2 A2 D3 A2 D2 A2 D3 A2 | G1 D2 G2 D2 G1 D2 G2 D2 | D2 A2 D3 A2 D2 A2 D3 A2 | A1 E2 A2 E2 A1 E2 A2 E2' },
      { melody: 'D5 - B4 - G4 - - - | F#5 - D5 - B4 - - - | E5 - G5 - B5 - - - | A5 - - - - - . .',
        bass: '  G1 D2 G2 D2 G1 D2 G2 D2 | B1 F#2 B2 F#2 B1 F#2 B2 F#2 | E2 B2 E3 B2 E2 B2 E3 B2 | A1 E2 A2 E2 A1 E2 A2 E2' },
    ],
    beats: ['. . h . . . h .', 'k . . . . . h .', 'k . h . . . h .'],
  },
  // Warmer and lower: F major, melody down an octave.
  bigRiver: {
    bpm: 66,
    phrases: [
      { melody: 'A4 - - - C5 - - - | D5 - - - A4 - - - | A#4 - - - D5 - C5 - | G4 - - - - - . .',
        bass: '  F2 - - - C3 - - - | D2 - - - A2 - - - | A#1 - - - F2 - - - | C2 - - - G2 - - -' },
      { melody: 'C5 - A4 - F4 - A4 - | D5 - - - F5 - - - | D5 - C5 - A#4 - D5 - | C5 - - - - - . .',
        bass: '  F2 - - - C3 - - - | D2 - - - A2 - - - | A#1 - - - F2 - - - | C2 - - - G2 - - -' },
      { melody: 'F5 - - - E5 - D5 - | D5 - - - - - . . | C5 - - - A4 - F4 - | G4 - A4 - G4 - . .',
        bass: '  D2 - - - A2 - - - | A#1 - - - F2 - - - | F2 - - - C3 - - - | C2 - - - G2 - - -' },
      { melody: 'D5 - - - F5 - D5 - | E5 - - - G5 - E5 - | F5 - - - C5 - - - | A4 - - - - - . .',
        bass: '  A#1 - - - F2 - - - | C2 - - - G2 - - - | F2 - - - C3 - - - | F2 - - - - - . .' },
      { melody: '. . F4 - A4 - C5 - | E5 - - - C5 - - - | . . D5 - F5 - D5 - | C5 - - - . . . .',
        bass: '  F2 - - - C3 - - - | A1 - - - E2 - - - | A#1 - - - F2 - - - | C2 - - - G2 - - -' },
      { melody: 'A#4 - - - D5 - G5 - | E5 - - - C5 - - - | F5 - - - A4 - C5 - | D5 - - - - - . .',
        bass: '  G1 - - - D2 - - - | C2 - - - G2 - - - | F2 - - - C3 - - - | D2 - - - A2 - - -' },
    ],
    beats: ['k . . . h . . .', 'k . . . . . h .', '. . . . h . . .'],
  },
  // Sparse and spacious, lots of rests: A minor, long notes.
  mountainLake: {
    bpm: 64,
    phrases: [
      { melody: 'E5 - - - - - - - | C5 - - - . . . . | G5 - - - - - E5 - | D5 - - - . . . .',
        bass: '  A2 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - -' },
      { melody: '. . A5 - - - G5 - | E5 - - - - - . . | . . C6 - - - A5 - | G5 - - - - - . .',
        bass: '  A2 - - - E3 - - - | E2 - - - B2 - - - | F2 - - - C3 - - - | G2 - - - D3 - - -' },
      { melody: 'A5 - - - - - - - | B5 - - - D5 - - - | C5 - - - E5 - - - | A4 - - - - - - -',
        bass: '  F2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | A2 - - - - - . .' },
      { melody: '. . . . E5 - D5 - | C5 - - - - - . . | . . . . D5 - B4 - | A4 - - - - - . .',
        bass: '  A2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - -' },
      { melody: 'C6 - - - - - A5 - | G5 - - - - - . . | F5 - - - - - D5 - | E5 - - - - - . .',
        bass: '  F2 - - - - - - - | C3 - - - - - - - | D2 - - - - - - - | E2 - - - - - - -' },
      { melody: 'A4 - C5 - E5 - - - | D5 - - - . . . . | C5 - A4 - C5 - - - | B4 - - - . . . .',
        bass: '  A2 - - - - - - - | G2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - -' },
    ],
    beats: ['. . . . h . . .', 'k . . . . . . .', 'k . . . h . . . | . . . . h . . .'],
  },
  // The slowest and widest, almost a lullaby: G major in 3/4.
  greatLake: {
    bpm: 60,
    phrases: [
      { melody: 'B4 - - - - D5 | E5 - - - B4 - | C5 - - E5 - - | D5 - - - - -',
        bass: '  G2 - - D3 - - | E2 - - B2 - - | C3 - - G2 - - | D3 - - A2 - -' },
      { melody: 'D5 - - B4 - G4 | B4 - - - - - | A4 - - C5 - E5 | D5 - - - - -',
        bass: '  G2 - - D3 - - | E2 - - B2 - - | C3 - - G2 - - | D3 - - A2 - -' },
      { melody: 'E5 - - G5 - - | F#5 - - A5 - - | G5 - - D5 - - | E5 - - - - -',
        bass: '  C3 - - G2 - - | D3 - - A2 - - | G2 - - D3 - - | E2 - - B2 - -' },
      { melody: 'G4 - - C5 - E5 | D5 - - - B4 - | A4 - - - F#4 - | G4 - - - - -',
        bass: '  C3 - - G2 - - | G2 - - D3 - - | D3 - - A2 - - | G2 - - - - -' },
      { melody: '. . . B4 - - | . . . C5 - E5 | D5 - - - - - | . . . A4 - -',
        bass: '  E2 - - B2 - - | C3 - - G2 - - | G2 - - D3 - - | D3 - - A2 - -' },
      { melody: 'C5 - - E5 - A5 | F#5 - - - D5 - | G5 - - - - - | D5 - - - - -',
        bass: '  A2 - - E3 - - | D3 - - A2 - - | G2 - - D3 - - | G2 - - - - -' },
    ],
    beats: ['k . . h . .', '. . . h . .', 'k . . . . .'],
  },
}
