import { describe, it, expect } from 'vitest'
import { sellAll, trash, trashStack, unlockPattern, unlockMaterial, unlockLocation, travel, setRecipe } from './economy'
import { newGame, type CatchItem } from '../state'
import { PATTERNS, MATERIALS } from '../data'

const item = (id: number, value: number, kind: CatchItem['kind'] = 'fish'): CatchItem => ({ id, kind, defId: 'x', value, size: 1 })

describe('selling and trash', () => {
  it('sellAll sums fish and junk', () => {
    const s = newGame()
    s.basket = [item(1, 10), item(2, 5), item(3, -3, 'junk')]
    expect(sellAll(s)).toBe(12)
    expect(s.money).toBe(12)
    expect(s.basket).toEqual([])
    expect(s.seasonEarnings).toBe(12)
  })
  it('junk loss while broke clamps money at 0', () => {
    const s = newGame()
    s.money = 2
    s.basket = [item(1, -5, 'junk')]
    sellAll(s)
    expect(s.money).toBe(0)
    expect(s.seasonEarnings).toBe(0)
  })
  it('trash removes by id without touching money', () => {
    const s = newGame()
    s.basket = [item(1, -2, 'junk'), item(2, 4)]
    expect(trash(s, 1)).toBe(true)
    expect(s.basket.map(c => c.id)).toEqual([2])
    expect(s.money).toBe(0)
    expect(trash(s, 99)).toBe(false)
  })
  it('trashStack needs bulk trash and removes only that kind and species', () => {
    const s = newGame()
    s.basket = [item(1, 2), { ...item(2, 3), defId: 'y' }, item(3, -1, 'junk'), item(4, 2)]
    expect(trashStack(s, 'fish', 'x')).toBe(false)
    expect(s.basket).toHaveLength(4)
    s.bulkTrash = true
    expect(trashStack(s, 'fish', 'x')).toBe(true)
    expect(s.basket.map(c => c.id)).toEqual([2, 3])
    expect(s.money).toBe(0)
    expect(trashStack(s, 'fish', 'x')).toBe(false)
  })
})

describe('unlocks', () => {
  it('unaffordable unlocks change nothing', () => {
    const s = newGame()
    const before = structuredClone(s)
    expect(unlockPattern(s, PATTERNS[1].id)).toBe(false)
    expect(unlockMaterial(s, MATERIALS[0].id)).toBe(false)
    expect(unlockLocation(s, 'river')).toBe(false)
    expect(s).toEqual(before)
  })
  it('affordable unlock pays and records', () => {
    const s = newGame()
    s.money = PATTERNS[1].unlockCost
    expect(unlockPattern(s, PATTERNS[1].id)).toBe(true)
    expect(s.money).toBe(0)
    expect(s.unlockedPatterns).toContain(PATTERNS[1].id)
    expect(unlockPattern(s, PATTERNS[1].id)).toBe(false)
  })
  it('locations unlock only in order', () => {
    const s = newGame()
    s.money = 1e12
    expect(unlockLocation(s, 'bigRiver')).toBe(false)
    expect(unlockLocation(s, 'river')).toBe(true)
    expect(unlockLocation(s, 'bigRiver')).toBe(true)
  })
  it('travel needs an unlocked location', () => {
    const s = newGame()
    expect(travel(s, 'river')).toBe(false)
    s.unlockedLocations.push('river')
    expect(travel(s, 'river')).toBe(true)
    expect(s.location).toBe('river')
  })
  it('setRecipe needs unlocked pattern and materials', () => {
    const s = newGame()
    expect(setRecipe(s, { patternId: PATTERNS[0].id, materialIds: [MATERIALS[0].id] })).toBe(false)
    s.unlockedMaterials.push(MATERIALS[0].id)
    expect(setRecipe(s, { patternId: PATTERNS[0].id, materialIds: [MATERIALS[0].id] })).toBe(true)
    expect(s.recipe.materialIds).toEqual([MATERIALS[0].id])
  })
})

describe('setRecipe duplicates', () => {
  it('rejects the same material twice', () => {
    const s = newGame()
    s.unlockedMaterials.push(MATERIALS[0].id)
    expect(setRecipe(s, { patternId: PATTERNS[0].id, materialIds: [MATERIALS[0].id, MATERIALS[0].id] })).toBe(false)
  })
})
