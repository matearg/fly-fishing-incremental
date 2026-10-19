import { describe, it, expect } from 'vitest'
import { licensesForSeason, canStartSeason, startNewSeason, licenseUpgradeCost, buyLicenseUpgrade, buyLicenseSpecies } from './prestige'
import { newGame } from '../state'
import { LICENSE_UPGRADES, SEASON, SPECIES } from '../data'

describe('New Season', () => {
  it('a new season starts with plain gear only', () => {
    const s = newGame(); s.seasonEarnings = SEASON.minEarnings
    s.rods.push('carbonSpey'); s.rod = 'carbonSpey'; s.waders.push('guideProWaders'); s.wearing = 'guideProWaders'
    const t = startNewSeason(s)
    expect([t.rods, t.rod, t.waders, t.wearing]).toEqual([['plainRod'], 'plainRod', ['plainWaders'], 'plainWaders'])
  })
  it('licenses = floor(sqrt(earnings / divisor))', () => {
    const s = newGame()
    s.seasonEarnings = SEASON.licenseDivisor * 9
    expect(licensesForSeason(s)).toBe(3)
  })
  it('needs minEarnings', () => {
    const s = newGame()
    s.seasonEarnings = SEASON.minEarnings - 1
    expect(canStartSeason(s)).toBe(false)
    s.seasonEarnings = SEASON.minEarnings
    expect(canStartSeason(s)).toBe(true)
  })
  it('resets the run, keeps license progress, adds earned licenses', () => {
    const s = newGame()
    s.money = 1e9
    s.seasonEarnings = SEASON.licenseDivisor * 16
    s.basket = [{ id: 1, kind: 'fish', defId: 'dace', value: 1, size: 1 }]
    s.anglers.push({ auto: true, phase: 'idle', timerMs: 0, fly: null, pending: null })
    s.bench = 3; s.sorter = true; s.buyer = true
    s.unlockedLocations.push('river'); s.unlockedMaterials.push('copperWire')
    s.licenses = 2; s.licenseLevels.extraWear = 1; s.licenseSpecies = ['tigerTrout']
    const n = startNewSeason(s)
    expect(n.money).toBe(0)
    expect(n.seasonEarnings).toBe(0)
    expect(n.basket).toEqual([])
    expect(n.anglers).toHaveLength(1)
    expect([n.bench, n.sorter, n.buyer]).toEqual([0, false, false])
    expect(n.unlockedLocations).toEqual(['creek'])
    expect(n.unlockedMaterials).toEqual([])
    expect(n.licenses).toBe(6)
    expect(n.licenseLevels.extraWear).toBe(1)
    expect(n.licenseSpecies).toEqual(['tigerTrout'])
  })
})

describe('license shop', () => {
  it('too few licenses changes nothing', () => {
    const s = newGame()
    const before = structuredClone(s)
    expect(buyLicenseUpgrade(s, 'valueMult')).toBe(false)
    expect(s).toEqual(before)
  })
  it('max level: cost null and buy refused', () => {
    const s = newGame()
    const def = LICENSE_UPGRADES.find(u => u.id === 'startPattern')!
    s.licenses = 1e6
    for (let i = 0; i < def.costs.length; i++) expect(buyLicenseUpgrade(s, 'startPattern')).toBe(true)
    expect(s.licenses).toBe(1e6 - def.costs.reduce((a, b) => a + b, 0))
    expect(licenseUpgradeCost(s, 'startPattern')).toBeNull()
    expect(buyLicenseUpgrade(s, 'startPattern')).toBe(false)
  })
  it('license species: only legendaries with a licenseCost', () => {
    const s = newGame()
    s.licenses = 100
    expect(buyLicenseSpecies(s, 'dace')).toBe(false)
    const leg = SPECIES.find(x => x.licenseCost)!
    expect(buyLicenseSpecies(s, leg.id)).toBe(true)
    expect(s.licenses).toBe(100 - leg.licenseCost!)
    expect(s.licenseSpecies).toContain(leg.id)
    expect(buyLicenseSpecies(s, leg.id)).toBe(false)
  })
})

describe('New Season and catch & release', () => {
  it('a new season starts unpaused with no bonus', () => {
    const s = newGame()
    s.buyer = true; s.buyerPaused = true; s.releaseBonus = 0.4; s.release = true
    const n = startNewSeason(s)
    expect([n.buyerPaused, n.releaseBonus, n.release]).toEqual([false, 0, false])
  })
})
