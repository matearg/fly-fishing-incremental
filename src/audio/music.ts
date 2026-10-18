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
