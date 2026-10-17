import { describe, it, expect } from 'vitest'
import { serialize, deserialize } from './save'
import { newGame } from './state'
import { buyHelper } from './helpers'
import { basicRecipe, flyStats, tieFly } from './flies'
import { rollCatch } from './catch'

describe('save', () => {
  it('round-trips a mid-game state', () => {
    const s = newGame()
    s.money = 1e6
    buyHelper(s, 'angler'); buyHelper(s, 'bench'); buyHelper(s, 'sorter')
    tieFly(s)
    s.basket = [{ id: 1, kind: 'junk', defId: 'boot', value: -2, size: 1 }]
    s.licenses = 4; s.licenseLevels.valueMult = 2; s.licenseSpecies = ['tigerTrout']
    expect(deserialize(serialize(s))).toEqual(s)
  })
  it.each([
    ['null', null],
    ['bad JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: 999 })],
    ['non-number money', JSON.stringify({ version: 1, money: 'lots' })],
    ['JSON null', 'null'],
  ])('corrupt save (%s) → fresh game', (_, raw) => {
    expect(deserialize(raw)).toEqual(newGame())
  })
})

describe('save with stale ids after a data.ts edit', () => {
  const saved = (edit: (s: any) => void) => {
    const s: any = newGame()
    s.money = 500
    edit(s)
    return deserialize(JSON.stringify(s))
  }
  it('missing licenseLevels: loads, keeps money, flyStats works', () => {
    const s = saved(s => { delete s.licenseLevels })
    expect(s.money).toBe(500)
    expect(() => flyStats(s, s.recipe)).not.toThrow()
  })
  it('license upgrade added later starts at level 0', () => {
    const s = saved(s => { delete s.licenseLevels.startLocation })
    expect(s.licenseLevels.startLocation).toBe(0)
  })
  it('unknown recipe pattern/material falls back to the basic fly', () => {
    const s = saved(s => { s.recipe = { patternId: 'gone', materialIds: ['alsoGone'] } })
    expect(s.money).toBe(500)
    expect(s.recipe).toEqual(basicRecipe())
  })
  it('flies with unknown ids are dropped', () => {
    const s = saved(s => {
      s.flyBox = [{ patternId: 'gone', materialIds: [], wearLeft: 2 }, { patternId: 'basicDry', materialIds: ['gone'], wearLeft: 2 }, { patternId: 'basicDry', materialIds: [], wearLeft: 2 }]
      s.anglers[0] = { auto: false, phase: 'waiting', timerMs: 10, fly: { patternId: 'gone', materialIds: [], wearLeft: 1 } }
    })
    expect(s.flyBox).toEqual([{ patternId: 'basicDry', materialIds: [], wearLeft: 2 }])
    expect(s.anglers[0]).toMatchObject({ phase: 'idle', fly: null })
  })
  it('unknown location and unlock ids are cleaned', () => {
    const s = saved(s => { s.location = 'ocean'; s.unlockedLocations = ['creek', 'ocean']; s.unlockedPatterns.push('gone'); s.unlockedMaterials = ['gone']; s.licenseSpecies = ['gone'] })
    expect(s.location).toBe('creek')
    expect(s.unlockedLocations).toEqual(['creek'])
    expect(s.unlockedPatterns).toEqual(['basicDry'])
    expect(s.unlockedMaterials).toEqual([])
    expect(s.licenseSpecies).toEqual([])
    expect(() => rollCatch(s, { patternId: 'basicDry', materialIds: [], wearLeft: 1 }, Math.random)).not.toThrow()
  })
})
