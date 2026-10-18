import { describe, it, expect } from 'vitest'
import { TUNES, nextPick, phraseSteps, pickNotes, pitch, stepMs, tokens, type Pick, type Tune, type TuneId } from './music'
import { LOCATIONS } from '../game/data'
import { lcg, seqRand } from '../game/util/testutil'

// 60 bpm → 500 ms eighth notes.
const TUNE: Tune = {
  bpm: 60,
  phrases: [
    { melody: 'C4 - . E4', bass: '. . . .' },
    { melody: 'D4 . F4 .', bass: 'C3 - - -' },
    { melody: 'E4 - - -', bass: 'G2 . G2 .' },
  ],
  beats: ['k . h .'],
}
const full = (phrase: number, over: Partial<Pick> = {}): Pick => ({ phrase, melody: true, beat: 0, drop: null, ...over })
const wave = (p: Pick, w: string) => pickNotes(TUNE, p).filter(n => n.wave === w)

describe('music format', () => {
  it('parses pitches', () => {
    expect(pitch('A4')).toBe(440)
    expect(pitch('A5')).toBeCloseTo(880)
    expect(pitch('C#4')).toBeCloseTo(277.18, 1)
    for (const bad of ['H4', 'A', 'a4', '-', 'Ab4']) expect(() => pitch(bad)).toThrow()
  })

  it('ignores bar lines and spacing', () => {
    expect(tokens(' C4 - | . E4 ')).toEqual(['C4', '-', '.', 'E4'])
  })

  it('rejects a phrase whose parts differ in length', () => {
    expect(() => phraseSteps({ melody: 'C4 - . .', bass: 'C3 -' })).toThrow()
    expect(phraseSteps(TUNE.phrases[0])).toBe(4)
  })

  it('rejects unknown tokens', () => {
    expect(() => pickNotes({ ...TUNE, phrases: [{ melody: 'C4 x . .', bass: '. . . .' }] }, full(0))).toThrow()
    expect(() => pickNotes({ ...TUNE, beats: ['k . C4 .'] }, full(0))).toThrow()
  })

  it('turns holds into one longer note and rests into gaps', () => {
    expect(wave(full(0), 'square').map(n => [n.at, n.dur])).toEqual([[0, 1000], [1500, 500]])
    expect(wave(full(1), 'square').map(n => n.freq)).toEqual([pitch('D4'), pitch('F4')])
  })

  it('drops the chosen melody note and nothing else', () => {
    const all = pickNotes(TUNE, full(0)), dropped = pickNotes(TUNE, full(0, { drop: 1 }))
    expect(dropped.filter(n => n.wave === 'square').map(n => n.freq)).toEqual([pitch('C4')])
    expect(dropped.length).toBe(all.length - 1)
  })

  it('leaves the melody out on a resting pick but keeps bass and beat', () => {
    const p = full(1, { melody: false })
    expect(wave(p, 'square')).toEqual([])
    expect(wave(p, 'triangle').some(n => n.freq === pitch('C3'))).toBe(true)
    expect(wave(p, 'noise').length).toBe(1)
  })

  it('plays no beat on a beat rest', () => {
    expect(wave(full(1, { beat: null }), 'noise')).toEqual([])
    expect(wave(full(1, { beat: null }), 'triangle').length).toBe(1) // just the bass
  })
})

describe('phrase picker', () => {
  it('starts at phrase 0 with the melody', () => {
    for (const r of [0, 0.999]) expect(nextPick(TUNE, null, seqRand(r))).toMatchObject({ phrase: 0, melody: true, drop: null })
  })

  it('never repeats a phrase back to back', () => {
    const rand = lcg(1)
    let p = nextPick(TUNE, null, rand)
    for (let i = 0; i < 500; i++) {
      const q = nextPick(TUNE, p, rand)
      expect(q.phrase).not.toBe(p.phrase)
      p = q
    }
  })

  it('stays in range at the edges of rand', () => {
    for (const r of [0, 0.9999999]) {
      const q = nextPick(TUNE, full(0), seqRand(r))
      expect(q.phrase).toBeGreaterThan(0)
      expect(q.phrase).toBeLessThan(TUNE.phrases.length)
      if (q.beat !== null) expect(q.beat).toBeLessThan(TUNE.beats.length)
      if (q.drop !== null) expect(() => pickNotes(TUNE, q)).not.toThrow()
    }
  })

  it('sometimes rests the melody or the beat, and sometimes drops a note', () => {
    const rand = lcg(7)
    let p = nextPick(TUNE, null, rand), rests = 0, beatRests = 0, drops = 0
    for (let i = 0; i < 500; i++) {
      p = nextPick(TUNE, p, rand)
      if (!p.melody) rests++
      if (p.beat === null) beatRests++
      if (p.drop !== null) drops++
    }
    for (const n of [rests, beatRests, drops]) {
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThan(250)
    }
  })

  it('drops only a note that sounds', () => {
    const rand = lcg(3)
    let p = nextPick(TUNE, null, rand)
    for (let i = 0; i < 300; i++) {
      p = nextPick(TUNE, p, rand)
      if (p.drop !== null) expect(wave(p, 'square').length).toBe(wave({ ...p, drop: null }, 'square').length - 1)
    }
  })

  it('repeats phrase 0 in a one-phrase tune', () => {
    const one: Tune = { ...TUNE, phrases: [TUNE.phrases[0]] }
    expect(nextPick(one, full(0), lcg(2)).phrase).toBe(0)
  })
})

const TUNE_IDS: TuneId[] = ['title', ...LOCATIONS.map(l => l.id)]

describe('tunes', () => {
  it('has a tune for the title and every place', () => {
    expect(Object.keys(TUNES).sort()).toEqual([...TUNE_IDS].sort())
  })

  it('every tune is slow, long enough, and parses', () => {
    for (const id of TUNE_IDS) {
      const t = TUNES[id]
      expect(t.bpm, id).toBeGreaterThanOrEqual(60)
      expect(t.bpm, id).toBeLessThanOrEqual(80)
      expect(t.phrases.length, id).toBeGreaterThanOrEqual(6)
      expect(t.beats.length, id).toBeGreaterThanOrEqual(2)
      for (const p of t.phrases) {
        const steps = phraseSteps(p)
        expect(steps, id).toBeGreaterThanOrEqual(24) // about 4 bars
        expect(steps, id).toBeLessThanOrEqual(40)
        for (const b of t.beats) expect(steps % tokens(b).length, id).toBe(0)
      }
      // Bar lines are only for reading, so check they fall where they claim: every bar of a tune is the same length.
      const bars = t.phrases.flatMap(p => [p.melody, p.bass]).flatMap(part => part.split('|').map(tokens).filter(b => b.length))
      for (const b of bars) expect(b.length, `${id}: ${b.join(' ')}`).toBe(bars[0].length)
    }
  })

  it('every pick of every tune makes valid, quiet notes within its phrase', () => {
    for (const id of TUNE_IDS) {
      const t = TUNES[id]
      t.phrases.forEach((p, phrase) => {
        const end = phraseSteps(p) * stepMs(t)
        for (let beat = 0; beat < t.beats.length; beat++) {
          const notes = pickNotes(t, { phrase, melody: true, beat, drop: null })
          expect(notes.some(n => n.wave === 'square'), `${id} ${phrase}`).toBe(true)
          for (const n of notes) {
            expect(n.at, id).toBeGreaterThanOrEqual(0)
            expect(n.dur, id).toBeGreaterThan(0)
            expect(n.freq, id).toBeGreaterThan(0)
            expect(n.gain, id).toBeLessThanOrEqual(0.15)
            if (n.attack !== undefined) expect(n.attack, id).toBeLessThan(n.dur)
            expect(n.at + n.dur, `${id} ${phrase}`).toBeLessThanOrEqual(end + 1)
          }
        }
      })
    }
  })
})
