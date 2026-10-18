import { describe, it, expect } from 'vitest'
import { AMBIENCE, SFX, catchSound, soundLength, type SoundId } from './sounds'
import { LOCATIONS, SPECIES, TIMING } from '../game/data'

const ids = Object.keys(SFX) as SoundId[]

describe('sound data', () => {
  it('has valid notes for every sound', () => {
    for (const id of ids) {
      expect(SFX[id].length, id).toBeGreaterThan(0)
      for (const n of SFX[id]) {
        expect(n.at, id).toBeGreaterThanOrEqual(0)
        expect(n.dur, id).toBeGreaterThan(0)
        expect(n.freq, id).toBeGreaterThan(0)
        if (n.to !== undefined) expect(n.to, id).toBeGreaterThan(0)
        expect(n.gain, id).toBeGreaterThan(0)
        expect(n.gain, id).toBeLessThanOrEqual(0.5)
      }
    }
  })

  it('ticks the reel within the reeling time', () => {
    expect(soundLength('reel')).toBeLessThanOrEqual(TIMING.reelMs)
    expect(SFX.reel.length).toBeGreaterThanOrEqual(6)
  })

  it('keeps repeated sounds short', () => {
    for (const id of ['move', 'select', 'back', 'nope', 'plip', 'bite'] as SoundId[]) expect(soundLength(id), id).toBeLessThanOrEqual(150)
    for (const id of ids.filter(i => i !== 'season')) expect(soundLength(id), id).toBeLessThanOrEqual(1200)
    expect(soundLength('season')).toBeLessThanOrEqual(2500)
  })

  it('makes the big catch jingle longer', () => {
    expect(soundLength('catchBig')).toBeGreaterThan(soundLength('catch'))
  })

  it('keeps the water soft, and babbles more on the creek', () => {
    for (const l of LOCATIONS) expect(AMBIENCE[l.id].gain, l.id).toBeLessThanOrEqual(0.2)
    expect(AMBIENCE.creek.babblePerSec).toBeGreaterThan(AMBIENCE.greatLake.babblePerSec)
  })

  it('picks the catch sound by tier', () => {
    const legendary = SPECIES.find(s => s.tier === 'legendary')!.id
    expect(catchSound({ kind: 'junk', defId: 'boot' })).toBe('junk')
    expect(catchSound({ kind: 'fish', defId: 'dace' })).toBe('catch')
    expect(catchSound({ kind: 'fish', defId: 'brownTrout' })).toBe('catchBig')
    expect(catchSound({ kind: 'fish', defId: legendary })).toBe('catchBig')
    expect(catchSound({ kind: 'fish', defId: 'gone' })).toBe('catch')
  })
})
