import { describe, it, expect } from 'vitest'
import { isRarePlus, placeSpecies, rollCatch } from './catch'
import { newGame, type Fly } from '../state'
import { CHUM, GUIDE, LICENSE_UPGRADES, LOCATIONS, RODS, SPECIES, TIERS, type Tier } from '../data'
import { seqRand, lcg } from '../util/testutil'

const fly = (patternId: string, materialIds: string[] = []): Fly => ({ patternId, materialIds, wearLeft: 1 })
const depthOf = (id: string) => SPECIES.find(s => s.id === id)!.depth
const fishIds = (state: ReturnType<typeof newGame>, f: Fly, n: number, rand: () => number) => {
  const ids = new Set<string>()
  for (let i = 0; i < n; i++) {
    const c = rollCatch(state, f, rand)
    if (c.kind === 'fish') ids.add(c.defId)
  }
  return ids
}

describe('rollCatch', () => {
  it('chum multiplies rare and legendary odds', () => {
    const s = newGame(); s.location = 'bigRiver'
    const count = (chum: boolean) => {
      const rand = lcg(7), n = { rare: 0, common: 0, junk: 0 }
      for (let i = 0; i < 2000; i++) {
        const c = rollCatch(s, fly('woollyBugger'), rand, RODS[0], chum)
        const tier = c.kind === 'fish' ? TIERS.indexOf(SPECIES.find(d => d.id === c.defId)!.tier) : -1
        if (tier >= 2) n.rare++; else if (tier === 0) n.common++; else if (tier < 0) n.junk++
      }
      return n
    }
    const off = count(false), on = count(true)
    expect(on.rare).toBeGreaterThan(3 * off.rare)
    // junk weights don't change: junk keeps its ratio to common fish
    expect(Math.abs(on.junk / on.common - off.junk / off.common) / (off.junk / off.common)).toBeLessThan(0.2)
    expect(CHUM.mult).toBeGreaterThan(1)
  })
  it('the rod raises the value of its tiers only', () => {
    const s = newGame(), f = fly('basicDry'), bamboo = RODS.find(r => r.id === 'bambooCane')!
    const plain = rollCatch(s, f, seqRand(0, 0.5)) // first species: Puyen, common
    const boosted = rollCatch(s, f, seqRand(0, 0.5), bamboo)
    expect(boosted.value).toBeCloseTo(plain.value * 1.4); expect(boosted.size).toBe(plain.size)
    const fiber = RODS.find(r => r.id === 'fiberglassRod')!
    expect(rollCatch(s, f, seqRand(0, 0.5), fiber).value).toBeCloseTo(plain.value)
  })
  it('dry fly never reaches below the surface', () => {
    const s = newGame()
    for (let i = 0; i < 500; i++) {
      const c = rollCatch(s, fly('basicDry'), Math.random)
      if (c.kind === 'fish') expect(depthOf(c.defId)).toBe(0)
    }
  })
  it('streamer is capped by the location depth', () => {
    const s = newGame()
    const max = LOCATIONS[0].maxDepth
    for (const id of fishIds(s, fly('zonker', ['goldBead']), 500, Math.random)) expect(depthOf(id)).toBeLessThanOrEqual(max)
  })
  it('deeper fly reaches a superset of species (ladder)', () => {
    const s = newGame()
    s.location = 'river'
    const dry = fishIds(s, fly('basicDry'), 2000, lcg(1))
    const streamer = fishIds(s, fly('woollyBugger'), 2000, lcg(2))
    for (const id of dry) expect(streamer.has(id)).toBe(true)
    expect(streamer.size).toBeGreaterThan(dry.size)
  })
  it('odds bonus raises the share of rarer tiers', () => {
    const s = newGame()
    const share = (f: Fly) => {
      const rand = lcg(7)
      let rare = 0
      for (let i = 0; i < 2000; i++) {
        const c = rollCatch(s, f, rand)
        if (c.kind === 'fish' && TIERS.indexOf(SPECIES.find(x => x.id === c.defId)!.tier) > 0) rare++
      }
      return rare
    }
    expect(share(fly('elkHair', ['peacockHerl', 'flashabou']))).toBeGreaterThan(share(fly('basicDry')))
  })
  it('license species only after bought', () => {
    const s = newGame()
    s.location = 'mountainLake'
    const f = fly('zonker', ['goldBead'])
    expect(fishIds(s, f, 3000, lcg(3)).has('tigerTrout')).toBe(false)
    s.licenseSpecies.push('tigerTrout')
    expect(fishIds(s, f, 3000, lcg(3)).has('tigerTrout')).toBe(true)
  })
  it('junk has size 1 and value <= 0', () => {
    const c = rollCatch(newGame(), fly('basicDry'), seqRand(0.9999, 0.5))
    expect(c.kind).toBe('junk')
    expect(c.size).toBe(1)
    expect(c.value).toBeLessThanOrEqual(0)
  })
  it('license valueMult multiplies fish value', () => {
    const s = newGame()
    const base = rollCatch(s, fly('basicDry'), seqRand(0, 0.5))
    s.licenseLevels.valueMult = 2
    const boosted = rollCatch(s, fly('basicDry'), seqRand(0, 0.5))
    expect(base.kind).toBe('fish')
    expect(boosted.value).toBeCloseTo(base.value * (1 + 2 * LICENSE_UPGRADES.find(u => u.id === 'valueMult')!.perLevel))
  })

  it('placeSpecies hides licence species until bought', () => {
    expect(placeSpecies('mountainLake', []).map(s => s.id)).not.toContain('tigerTrout')
    expect(placeSpecies('mountainLake', ['tigerTrout']).map(s => s.id)).toContain('tigerTrout')
    expect(placeSpecies('mountainLake', ['tigerTrout']).every(s => s.location === 'mountainLake')).toBe(true)
  })
  it('extraOdds adds to the fly odds bonus, so legendaries come up more often', () => {
    const s = newGame(); s.location = 'bigRiver'
    const fly = { patternId: 'woollyBugger', materialIds: [], wearLeft: 5 }
    const count = (extra: number) => { const r = lcg(7); let n = 0; for (let i = 0; i < 4000; i++) if (rollCatch(s, fly, r, RODS[0], false, extra).defId === 'muskie') n++; return n }
    expect(count(GUIDE.oddsBonus)).toBeGreaterThan(count(0) * 1.3)
  })
})

describe('isRarePlus', () => {
  it('isRarePlus is rare and legendary only', () => {
    expect(['common', 'uncommon', 'rare', 'legendary'].map(t => isRarePlus(t as Tier))).toEqual([false, false, true, true])
  })
})
