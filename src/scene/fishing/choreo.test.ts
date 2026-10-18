import { describe, it, expect } from 'vitest'
import { approach, approachTarget, BACK_LEN, BACK_MS, CAST_MS, castLine, castPose, releaseOffscreen, schoolKey, SINK_MS, STRAIGHT_MS, trackCatch, type Pt, type Track } from './choreo'
import { TIMING } from '../../game/data'
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

describe('cast', () => {
  const tip: Pt = [100, 80], land: Pt = [240, 110]
  const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
  // Distance from p to the segment a–b.
  const toSegment = (p: Pt, a: Pt, b: Pt) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
    const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return dist(p, [a[0] + k * dx, a[1] + k * dy])
  }

  it('the fly settles before the earliest bite', () => {
    expect(CAST_MS + SINK_MS).toBeLessThan(TIMING.biteMinMs)
  })
  it('poses back, then forward, then nothing', () => {
    expect(castPose(0)).toBe('back')
    expect(castPose(BACK_MS + STRAIGHT_MS - 1)).toBe('back')
    expect(castPose(BACK_MS + STRAIGHT_MS)).toBe('cast')
    expect(castPose(CAST_MS)).toBeNull()
  })
  it('starts with the fly at the rod tip', () => {
    expect(castLine(0, tip, land)!.at(-1)).toEqual(tip)
  })
  it('trails a U loop behind on the back cast', () => {
    const pts = castLine(BACK_MS / 2, tip, land)!
    expect(Math.min(...pts.map(p => p[0]))).toBeLessThan(tip[0])
    expect(new Set(pts.filter(p => p[0] < tip[0]).map(p => p[1])).size).toBeGreaterThan(1)
  })
  it('is straight out behind once the loop unrolls', () => {
    const pts = castLine(BACK_MS + STRAIGHT_MS - 1, tip, land)!, back: Pt = [tip[0] - BACK_LEN, tip[1] + 2]
    expect(dist(pts.at(-1)!, back)).toBeLessThanOrEqual(1)
    for (const p of pts) expect(toSegment(p, tip, back)).toBeLessThanOrEqual(1)
  })
  it('lands the fly on the water, then ends', () => {
    expect(dist(castLine(CAST_MS - 1, tip, land)!.at(-1)!, land)).toBeLessThanOrEqual(2)
    expect(castLine(CAST_MS, tip, land)).toBeNull()
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
