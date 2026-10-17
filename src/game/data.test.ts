import { describe, it, expect } from 'vitest'
import { LOCATIONS, PATTERNS, MATERIALS, SPECIES, JUNK, LICENSE_UPGRADES } from './data'

const unique = (ids: string[]) => new Set(ids).size === ids.length

describe('content tables', () => {
  it('five places in order, unlock cost strictly increasing from a free creek', () => {
    expect(LOCATIONS.map(l => l.id)).toEqual(['creek', 'river', 'bigRiver', 'mountainLake', 'greatLake'])
    expect(LOCATIONS[0].unlockCost).toBe(0)
    for (let i = 1; i < LOCATIONS.length; i++) expect(LOCATIONS[i].unlockCost).toBeGreaterThan(LOCATIONS[i - 1].unlockCost)
  })
  it('first pattern is the free basic dry fly', () => {
    expect(PATTERNS[0]).toMatchObject({ cls: 'dry', tieCost: 0, unlockCost: 0 })
  })
  it('ids are unique per table', () => {
    for (const t of [LOCATIONS, PATTERNS, MATERIALS, SPECIES, JUNK, LICENSE_UPGRADES]) expect(unique(t.map(x => x.id))).toBe(true)
  })
  it('species sit in an existing location within its depth', () => {
    for (const s of SPECIES) {
      const loc = LOCATIONS.find(l => l.id === s.location)
      expect(loc, s.id).toBeDefined()
      expect(s.depth).toBeLessThanOrEqual(loc!.maxDepth)
    }
  })
  it('junk is worth 0 or less', () => {
    for (const j of JUNK) expect(j.value).toBeLessThanOrEqual(0)
  })
  it('every location has a free surface species', () => {
    for (const l of LOCATIONS) expect(SPECIES.some(s => s.location === l.id && s.depth === 0 && !s.licenseCost), l.id).toBe(true)
  })
  it('every class exists and depth goes dry 0 < nymph < streamer', () => {
    const depths = (c: string) => PATTERNS.filter(p => p.cls === c).map(p => p.maxDepth)
    const dry = depths('dry'), nymph = depths('nymph'), streamer = depths('streamer')
    expect(dry.length && nymph.length && streamer.length).toBeTruthy()
    expect(Math.max(...dry)).toBe(0)
    expect(Math.min(...nymph)).toBeGreaterThan(0)
    expect(Math.min(...streamer)).toBeGreaterThan(Math.max(...nymph))
  })
})
