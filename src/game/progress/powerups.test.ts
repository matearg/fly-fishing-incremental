import { describe, it, expect } from 'vitest'
import { chumPrice, chumReach, throwChum } from './powerups'
import { newGame } from '../state'
import { CHUM } from '../data'

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
