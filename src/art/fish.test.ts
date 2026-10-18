import { describe, it, expect } from 'vitest'
import { LOCATIONS, SPECIES, TIERS } from '../game/data'
import { FISH_COLORS, FISH_MOUTH, FISH_SIDE, FISH_TOP, fishBitmaps, fishColors, fishSideBitmaps } from './fish'

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
  it('the mouth sits on an opaque pixel of frame 0', () => {
    for (const t of TIERS) {
      const [x, y] = FISH_MOUTH[t]
      expect(FISH_SIDE[t][0][y]?.[x], t).toBeDefined()
      expect(FISH_SIDE[t][0][y][x], t).not.toBe('.')
    }
  })
  it('fishSideBitmaps paints both frames for every species', () => {
    for (const sp of SPECIES) expect(fishSideBitmaps(sp.id)).toHaveLength(2)
  })
  it('an unknown style falls back to default colours', () => {
    expect(fishColors('dace', 'nope')).toBe(fishColors('dace'))
  })
})
