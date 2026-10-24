import { describe, it, expect } from 'vitest'
import { LOCATIONS, SPECIES, TIERS } from '../../game/data'
import { FINE } from '../pixels'
import { FISH_COLORS, FISH_SIDE, FISH_TOP, fishBitmaps, fishColors, fishMouth, fishSideBitmaps, fishSideGrids, fishTopGrids } from './fish'

describe('fish art', () => {
  it('colours exist for exactly the current species', () => {
    expect(Object.keys(FISH_COLORS).sort()).toEqual(SPECIES.map(s => s.id).sort())
  })
  it('fish sprites grow with tier, both frames the same size', () => {
    const widths = TIERS.map(t => FISH_TOP[t][0][0].length)
    widths.slice(1).forEach((w, i) => expect(w).toBeGreaterThan(widths[i]))
    for (const t of TIERS) {
      const [a, b] = FISH_TOP[t]
      expect([b.length, b[0].length]).toEqual([a.length, a[0].length])
      for (const row of [...a, ...b]) expect(row.length, t).toBe(a[0].length)
    }
  })
  it('within a place, pricier fish are never drawn smaller', () => {
    for (const loc of LOCATIONS) {
      const tiers = SPECIES.filter(s => s.location === loc.id).sort((a, b) => a.baseValue - b.baseValue).map(s => TIERS.indexOf(s.tier))
      tiers.slice(1).forEach((t, i) => expect(t, loc.id).toBeGreaterThanOrEqual(tiers[i]))
    }
  })
  it('fishBitmaps paints both frames for every species', () => {
    for (const sp of SPECIES) expect(fishBitmaps(sp.id)).toHaveLength(2)
  })
  it('side sprites grow with tier, both frames the same size', () => {
    const widths = TIERS.map(t => FISH_SIDE[t][0][0].length)
    widths.slice(1).forEach((w, i) => expect(w).toBeGreaterThan(widths[i]))
    for (const t of TIERS) {
      const [a, b] = FISH_SIDE[t]
      expect([b.length, b[0].length]).toEqual([a.length, a[0].length])
      for (const row of [...a, ...b]) expect(row.length, t).toBe(a[0].length)
    }
  })
  it('fishMouth returns the same point on repeat calls', () => {
    expect(fishMouth('dace')).toBe(fishMouth('dace'))
  })
  it('fishSideBitmaps paints both frames for every species', () => {
    for (const sp of SPECIES) expect(fishSideBitmaps(sp.id)).toHaveLength(2)
  })
  it('an unknown style falls back to default colours', () => {
    expect(fishColors('dace', 'nope')).toBe(fishColors('dace'))
  })
  it('El Cuero and Nahuelito have their own shapes in both views', () => {
    for (const id of ['lakeSturgeon', 'ghostSturgeon']) {
      expect(fishSideGrids(id), id).not.toEqual(FISH_SIDE.legendary)
      expect(fishTopGrids(id), id).not.toEqual(FISH_TOP.legendary)
      for (const [a, b] of [fishSideGrids(id), fishTopGrids(id)]) {
        expect([b.length, b[0].length], id).toEqual([a.length, a[0].length])
        for (const row of [...a, ...b]) expect(row.length, id).toBe(a[0].length)
        expect(a, id).not.toEqual(b) // the two frames animate
      }
    }
    expect(fishSideGrids('lakeSturgeon')).not.toEqual(fishSideGrids('ghostSturgeon'))
  })
  it('every species has a mouth on an opaque pixel of its side frame 0', () => {
    for (const sp of SPECIES) {
      const [x, y] = fishMouth(sp.id), g = fishSideGrids(sp.id)[0]
      expect(g[y]?.[x], sp.id).toBeDefined()
      expect(g[y][x], sp.id).not.toBe('.')
      const b = fishSideBitmaps(sp.id)[0]
      expect(b.data[(y * FINE * b.w + x * FINE) * 4 + 3], sp.id).toBe(255)
    }
  })
})
