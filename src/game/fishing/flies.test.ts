import { describe, it, expect } from 'vitest'
import { flyStats, tieFly, basicRecipe, isDry, reachDepth, tieAny } from './flies'
import { newGame } from '../state'
import { PATTERNS, MATERIALS, LICENSE_UPGRADES } from '../data'

const nymph = PATTERNS.find(p => p.cls === 'nymph')!
const bead = MATERIALS.find(m => m.depthBonus > 0)!

describe('flyStats', () => {
  it('sums pattern and materials', () => {
    const st = flyStats(newGame(), { patternId: nymph.id, materialIds: [bead.id] })
    expect(st.maxDepth).toBe(nymph.maxDepth + bead.depthBonus)
    expect(st.tieCost).toBe(nymph.tieCost + bead.tieCost)
  })
  it('license extraWear adds wear', () => {
    const s = newGame()
    s.licenseLevels.extraWear = 2
    const perLevel = LICENSE_UPGRADES.find(u => u.id === 'extraWear')!.perLevel
    expect(flyStats(s, basicRecipe()).wear).toBe(PATTERNS[0].wear + 2 * perLevel)
  })
})

describe('tieFly', () => {
  const recipe = { patternId: nymph.id, materialIds: [bead.id] }
  it('pays and boxes a fly', () => {
    const s = newGame()
    s.money = 1000
    const st = flyStats(s, recipe)
    expect(tieFly(s, recipe)).toBe(true)
    expect(s.money).toBe(1000 - st.tieCost)
    expect(s.flyBox).toHaveLength(1)
    expect(s.flyBox[0].wearLeft).toBe(st.wear)
  })
  it('refuses when broke', () => {
    const s = newGame()
    s.money = 1
    expect(tieFly(s, recipe)).toBe(false)
    expect(s.money).toBe(1)
    expect(s.flyBox).toHaveLength(0)
  })
  it('basic fly is free', () => {
    const s = newGame()
    expect(tieFly(s, basicRecipe())).toBe(true)
    expect(s.flyBox).toHaveLength(1)
  })
})

describe('isDry', () => {
  it('isDry follows the pattern class', () => {
    for (const p of PATTERNS) expect(isDry({ patternId: p.id })).toBe(p.cls === 'dry')
  })
})

describe('fly helpers', () => {
  it('reachDepth stops at the place floor', () => {
    const s = newGame() // creek, maxDepth 1
    expect(reachDepth(s, { patternId: 'woollyBugger', materialIds: [] })).toBe(1)
    expect(reachDepth(s, { patternId: 'basicDry', materialIds: [] })).toBe(0)
    s.location = 'river'
    expect(reachDepth(s, { patternId: 'woollyBugger', materialIds: ['goldBead'] })).toBe(2)
  })
  it('tieAny falls back to the free Basic Dry', () => {
    const s = newGame(); s.recipe = { patternId: 'zonker', materialIds: [] }
    expect(tieAny(s)).toBe(true)
    expect(s.flyBox[0].patternId).toBe('basicDry')
    s.money = 1000
    expect(tieAny(s)).toBe(true)
    expect(s.flyBox[1].patternId).toBe('zonker')
    expect(s.money).toBe(600)
  })
})
