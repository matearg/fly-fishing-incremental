import { describe, it, expect } from 'vitest'
import { newGame } from './state'
import { PATTERNS, LICENSE_UPGRADES } from './data'
import { licenseEffects } from './progress/license'

const zero = Object.fromEntries(LICENSE_UPGRADES.map(u => [u.id, 0])) as Record<(typeof LICENSE_UPGRADES)[number]['id'], number>

describe('newGame', () => {
  it('a new game owns and uses only the plain gear', () => {
    const s = newGame()
    expect(s.rods).toEqual(['plainRod']); expect(s.rod).toBe('plainRod')
    expect(s.waders).toEqual(['plainWaders']); expect(s.wearing).toBe('plainWaders')
  })
  it('fresh season', () => {
    const s = newGame()
    expect(s.money).toBe(0)
    expect(s.location).toBe('creek')
    expect(s.unlockedLocations).toEqual(['creek'])
    expect(s.unlockedPatterns).toEqual([PATTERNS[0].id])
    expect(s.recipe).toEqual({ patternId: PATTERNS[0].id, materialIds: [] })
    expect(s.anglers).toHaveLength(1)
    expect(s.anglers[0]).toMatchObject({ auto: false, phase: 'idle', fly: null })
    expect(s.basket).toEqual([])
    expect(s.licenses).toBe(0)
    expect(Object.values(s.licenseLevels).every(v => v === 0)).toBe(true)
  })
  it('license carry applies minute-0 upgrades', () => {
    const levels = { ...zero, startLocation: 2, startPattern: 1 }
    const s = newGame({ licenses: 5, licenseLevels: levels, licenseSpecies: ['x'] })
    expect(s.unlockedLocations).toEqual(['creek', 'river', 'bigRiver'])
    expect(s.location).toBe('bigRiver')
    expect(s.unlockedPatterns).toEqual(PATTERNS.slice(0, 1 + licenseEffects(levels).startPatterns).map(p => p.id))
    expect(s.unlockedPatterns).toHaveLength(2)
    expect(s.licenses).toBe(5)
    expect(s.licenseLevels).toEqual(levels)
    expect(s.licenseSpecies).toEqual(['x'])
  })
})
