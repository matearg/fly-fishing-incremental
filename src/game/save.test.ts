import { describe, it, expect } from 'vitest'
import { serialize, deserialize, parseSave } from './save'
import { newGame, type GameState } from './state'
import { buyHelper } from './progress/helpers'
import { basicRecipe, flyStats, tieFly } from './fishing/flies'
import { rollCatch } from './fishing/catch'
import { castPlayer, reelPlayer, tick } from './fishing/sim'
import { sellAll } from './progress/economy'
import { RELEASE, TIMING } from './data'

describe('save', () => {
  it('drops unknown gear and falls back to plain', () => {
    const s = newGame()
    Object.assign(s, { rods: ['plainRod', 'willowRod', 'goneRod'], rod: 'goneRod', waders: ['canvasWaders'], wearing: 'neopreneWaders' })
    const t = parseSave(serialize(s))!
    expect(t.rods).toEqual(['plainRod', 'willowRod']); expect(t.rod).toBe('plainRod')
    expect(t.waders).toEqual(['plainWaders', 'canvasWaders']); expect(t.wearing).toBe('plainWaders')
  })
  it('an old save without gear fields gets plain gear', () => {
    const raw = JSON.parse(serialize(newGame())); delete raw.rods; delete raw.rod; delete raw.waders; delete raw.wearing
    const t = parseSave(JSON.stringify(raw))!
    expect(t.rod).toBe('plainRod'); expect(t.wearing).toBe('plainWaders')
  })
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
  it.each([
    ['null', null],
    ['bad JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: 999 })],
    ['non-number money', JSON.stringify({ version: 1, money: 'lots' })],
    ['JSON null', 'null'],
  ])('parseSave returns null for corrupt save (%s)', (_, raw) => {
    expect(parseSave(raw)).toBeNull()
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

describe('save with a pending catch', () => {
  const run = (s: GameState, ms: number) => { for (let t = 0; t < ms; t += 100) tick(s, 100, Math.random) }
  it('an old save mid-bite without pending loads and lands', () => {
    const s = newGame()
    castPlayer(s, Math.random)
    run(s, TIMING.biteMaxMs + 100)
    expect(s.anglers[0].phase).toBe('bite')
    const raw: any = JSON.parse(serialize(s))
    delete raw.anglers[0].pending
    const l = parseSave(JSON.stringify(raw))!
    expect(l.anglers[0].pending).toBeNull()
    reelPlayer(l)
    run(l, TIMING.reelMs + 100)
    expect(l.basket).toHaveLength(1)
  })
  it('drops a pending catch of an unknown species', () => {
    const s: any = newGame()
    s.anglers[0].pending = { kind: 'fish', defId: 'noSuchFish', value: 1, size: 1, location: 'creek' }
    expect(parseSave(JSON.stringify(s))!.anglers[0].pending).toBeNull()
  })
  it('a basket fish of a removed species survives load and sells', () => {
    const s: any = newGame()
    s.basket = [{ id: 1, kind: 'fish', defId: 'lakeTrout', value: 50, size: 1 }]
    const l = parseSave(JSON.stringify(s))!
    expect(l.basket).toEqual(s.basket)
    sellAll(l)
    expect(l.money).toBe(50)
  })

  it.each(['waiting', 'bite', 'reeling'] as const)('a %s angler with no fly loads idle and ticks safely', phase => {
    const s = newGame()
    s.anglers[0] = { auto: false, phase, timerMs: 10, fly: null, pending: { kind: 'junk', defId: 'can', value: 0, size: 1, location: 'creek' } }
    const l = parseSave(serialize(s))!
    expect(l.anglers[0]).toMatchObject({ phase: 'idle', pending: null })
    expect(() => tick(l, 100, Math.random)).not.toThrow()
    expect(l.basket).toHaveLength(0)
  })
})

describe('catch & release fields', () => {
  it('old saves get the new fields; the bonus is clamped', () => {
    const old = JSON.parse(serialize(newGame()))
    delete old.release; delete old.releaseBonus; delete old.buyerPaused
    const s = parseSave(JSON.stringify(old))!
    expect([s.release, s.releaseBonus, s.buyerPaused]).toEqual([false, 0, false])
    const withBonus = (b: unknown) => parseSave(JSON.stringify({ ...old, releaseBonus: b }))!.releaseBonus
    expect(withBonus(NaN)).toBe(0)
    expect(withBonus(-1)).toBe(0)
    expect(withBonus(50)).toBe(RELEASE.cap)
    expect(withBonus('0.5')).toBe(0)
    expect(withBonus(0.4)).toBe(0.4)
  })
})
