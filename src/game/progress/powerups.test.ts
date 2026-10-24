import { describe, it, expect } from 'vitest'
import { chumPrice, chumReach, throwChum } from './powerups'
import { newGame, type GameState, type Recipe } from '../state'
import { CHUM, LOCATIONS, MATERIALS, PATTERNS, SPECIES, type LocationId } from '../data'
import { flyStats } from '../fishing/flies'
import { castPlayer, reelPlayer, tick } from '../fishing/sim'
import { travel } from './economy'
import { lcg } from '../util/testutil'

declare const process: { env: Record<string, string | undefined> }

const creekWithNymph = () => {
  const s = newGame(); s.money = 1000
  s.unlockedPatterns.push('pheasantTail'); s.recipe = { patternId: 'pheasantTail', materialIds: [] }
  return s
}

describe('chum bucket', () => {
  it('throwChum: charges the place price once and starts the bucket', () => {
    const s = creekWithNymph()
    expect(throwChum(s)).toBe(true)
    expect(s.money).toBe(1000 - chumPrice(s)); expect(s.chumMs).toBe(CHUM.ms)
    expect(throwChum(s)).toBe(false)
    expect(s.money).toBe(1000 - chumPrice(s))
  })
  it('throwChum refuses when broke or when no rare fish is in reach', () => {
    const s = creekWithNymph(); s.money = chumPrice(s) - 1
    expect(throwChum(s)).toBe(false); expect(s.chumMs).toBe(0)
    const t = newGame(); t.money = 1e9; t.unlockedLocations.push('mountainLake'); t.location = 'mountainLake'
    t.unlockedPatterns.push('woollyBugger'); t.recipe = { patternId: 'woollyBugger', materialIds: [] }
    expect(chumReach(t)).toBe(false)
    expect(throwChum(t)).toBe(false); expect(t.money).toBe(1e9)
    t.recipe.materialIds = ['goldBead']
    expect(chumReach(t)).toBe(true)
  })
  it('chumReach reads the fly on the line before the recipe', () => {
    const s = creekWithNymph()
    expect(chumReach(s)).toBe(true)
    s.anglers[0].fly = { patternId: 'basicDry', materialIds: [], wearLeft: 3 }
    expect(chumReach(s)).toBe(false)
    s.recipe = { patternId: 'basicDry', materialIds: [] }
    s.anglers[0].fly = { patternId: 'pheasantTail', materialIds: [], wearLeft: 3 }
    expect(chumReach(s)).toBe(true)
  })
  it('chumPrice includes the waders discount', () => {
    const s = newGame()
    expect(chumPrice(s)).toBe(CHUM.cost.creek)
    s.waders.push('guideProWaders')
    expect(chumPrice(s)).toBe(Math.round(CHUM.cost.creek * 0.9))
  })
})

// The first pattern, plus at most one material, that reaches the place's deepest non-licensed fish.
function paybackFly(s: GameState, loc: LocationId): Recipe {
  const need = Math.max(...SPECIES.filter(d => d.location === loc && !d.licenseCost).map(d => d.depth))
  for (const p of PATTERNS) for (const m of [[], ...MATERIALS.map(x => [x.id])]) {
    const r = { patternId: p.id, materialIds: m }
    if (flyStats(s, r).maxDepth >= need) return r
  }
  throw new Error('no fly reaches ' + loc)
}

// One minute of the player alone at loc, plain rod, no hatch; what the basket is worth.
function runMinute(loc: LocationId, seed: number, chum: boolean): number {
  const s = newGame(), rand = lcg(seed), DT = 100
  s.unlockedLocations = LOCATIONS.map(l => l.id); s.unlockedPatterns = PATTERNS.map(p => p.id); s.unlockedMaterials = MATERIALS.map(m => m.id)
  travel(s, loc)
  s.recipe = paybackFly(s, loc); s.money = 1e12; s.nextHatchMs = Infinity
  if (chum) s.chumMs = CHUM.ms
  for (let t = 0; t < 60_000; t += DT) { castPlayer(s, rand) || reelPlayer(s); tick(s, DT, rand) }
  return s.basket.reduce((a, c) => a + c.value, 0)
}

describe('chum payback', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8]
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length
  it.each(LOCATIONS.map(l => l.id))('a bucket at %s pays back 1.5–4× its price', loc => {
    const extra = mean(seeds.map(seed => runMinute(loc, seed, true) - runMinute(loc, seed, false)))
    if (process.env.PACING_LOG) console.log(`chum ${loc}: extra ${Math.round(extra)}, cost ${CHUM.cost[loc]}, payback ${(extra / CHUM.cost[loc]).toFixed(2)}x`)
    expect(extra / CHUM.cost[loc]).toBeGreaterThanOrEqual(1.5)
    expect(extra / CHUM.cost[loc]).toBeLessThanOrEqual(4)
  })
})
