import { describe, it, expect } from 'vitest'
import { flyStats, tieFly, basicRecipe } from './flies'
import { newGame } from './state'
import { PATTERNS, MATERIALS, LICENSE_UPGRADES } from './data'

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
