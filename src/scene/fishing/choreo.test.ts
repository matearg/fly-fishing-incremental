import { describe, it, expect } from 'vitest'
import { approach, approachTarget, castPose, releaseOffscreen, schoolKey, trackCatch, type Track } from './choreo'
import { newGame } from '../../game/state'

describe('approach', () => {
  it('cruises until the approach window starts', () => {
    expect(approach(5000, 6000).stage).toBe('cruise')
  })
  it('ends exactly at the bite', () => {
    expect(approach(0, 6000)).toEqual({ stage: 'swim', k: 1 })
  })
  it('a short wait compresses the approach and still ends at the bite', () => {
    expect(approach(1500, 1500)).toEqual({ stage: 'notice', k: 0 })
    expect(approach(0, 1500).k).toBe(1)
  })
  it('k never goes backwards within a stage', () => {
    for (const wait of [1500, 2500, 6000]) {
      let prev = { stage: '', k: -1 }
      for (let rem = wait; rem >= 0; rem -= 50) {
        const a = approach(rem, wait)
        if (a.stage === prev.stage) expect(a.k, `${wait}/${rem}`).toBeGreaterThanOrEqual(prev.k)
        prev = a
      }
    }
  })
})

describe('castPose', () => {
  it('is on only at the start of a wait', () => {
    expect(castPose(3000, 2900)).toBe(true)
    expect(castPose(3000, 1000)).toBe(false)
  })
})

describe('schoolKey', () => {
  it('changes with travel and with a licence species bought here', () => {
    const s = newGame()
    const k0 = schoolKey(s)
    s.location = 'river'
    expect(schoolKey(s)).not.toBe(k0)
    s.location = 'mountainLake'
    const k1 = schoolKey(s)
    s.licenseSpecies.push('tigerTrout')
    expect(schoolKey(s)).not.toBe(k1)
  })
})

describe('trackCatch', () => {
  const angler = (pending: object | null, timerMs: number) => ({ auto: false, phase: 'waiting' as const, timerMs, fly: null, pending: pending as any })
  it('restarts the approach when the catch changes identity (cast, or re-pick after travel)', () => {
    const tr: Track = { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }
    const first = { kind: 'fish', defId: 'dace', value: 1, size: 1, location: 'creek' }
    trackCatch(tr, angler(first, 3000))
    expect(tr.waitMs).toBe(3000)
    trackCatch(tr, angler(first, 2000))
    expect(tr.waitMs).toBe(3000) // same catch: the wait it started with stays
    trackCatch(tr, angler({ ...first, location: 'river' }, 1200))
    expect(tr.waitMs).toBe(1200)
  })
})

describe('trackCatch after a reload', () => {
  const angler = (pending: object | null, timerMs: number) => ({ auto: false, phase: 'waiting' as const, timerMs, fly: null, pending: pending as any })
  const c = { kind: 'junk', defId: 'can', value: 0, size: 1, location: 'creek' }
  it('a reloaded save (same catch, new object) keeps the wait it started with', () => {
    const tr: Track = { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }
    trackCatch(tr, angler(c, 3000))
    trackCatch(tr, angler({ ...c }, 2500))
    expect(tr.waitMs).toBe(3000)
  })
  it('an identical catch on a new cast (the timer jumps back up) restarts', () => {
    const tr: Track = { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }
    trackCatch(tr, angler(c, 3000))
    trackCatch(tr, angler(c, 100))
    trackCatch(tr, angler({ ...c }, 2800))
    expect(tr.waitMs).toBe(2800)
  })
  it('a travel re-pick restarts the approach but not the cast', () => {
    const tr: Track = { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }
    trackCatch(tr, angler(c, 3000))
    trackCatch(tr, angler(c, 2000))
    trackCatch(tr, angler({ ...c, location: 'river' }, 1900))
    expect([tr.waitMs, tr.castMs]).toEqual([1900, 3000])
  })
  it('a new cast restarts both', () => {
    const tr: Track = { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }
    trackCatch(tr, angler(c, 3000))
    trackCatch(tr, angler(c, 100))
    trackCatch(tr, angler(c, 2800))
    expect([tr.waitMs, tr.castMs]).toEqual([2800, 2800])
  })
})

describe('releaseOffscreen', () => {
  it('is true only for a fish that was on the line', () => {
    expect(releaseOffscreen('bite')).toBe(true)
    expect(releaseOffscreen('reeling')).toBe(true)
    expect(releaseOffscreen('waiting')).toBe(false)
    expect(releaseOffscreen('idle')).toBe(false)
  })
})

describe('approachTarget', () => {
  it('aims at where the fly will rest while waiting, at the live fly once hooked', () => {
    expect(approachTarget('waiting', [10, 20], [200, 150])).toEqual([200, 150])
    expect(approachTarget('bite', [201, 152], [200, 150])).toEqual([201, 152])
    expect(approachTarget('reeling', [120, 115], [200, 150])).toEqual([120, 115])
  })
})
