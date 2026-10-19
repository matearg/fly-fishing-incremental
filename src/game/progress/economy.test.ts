import { describe, it, expect } from 'vitest'
import { price, releaseBonusOf, saleValue, sellAll, trash, trashStack, unlockPattern, unlockMaterial, unlockLocation, travel, setRecipe, wadersDiscount } from './economy'
import { flyStats, tieFly } from '../fishing/flies'
import { newGame, type CatchItem } from '../state'
import { PATTERNS, MATERIALS, RELEASE, RODS, SPECIES } from '../data'
import { rollCatch } from '../fishing/catch'
import { seqRand } from '../util/testutil'

const item = (id: number, value: number, kind: CatchItem['kind'] = 'fish'): CatchItem => ({ id, kind, defId: 'x', value, size: 1 })
const fish = (id: number, defId: string, size: number): CatchItem => ({ id, kind: 'fish', defId, value: SPECIES.find(d => d.id === defId)!.baseValue * size, size })

describe('selling and trash', () => {
  it('the release bonus is the same whatever rod caught the fish', () => {
    const s = newGame(), bamboo = RODS.find(r => r.id === 'bambooCane')!
    const f = { patternId: 'basicDry', materialIds: [], wearLeft: 1 }
    const a = { id: 1, ...rollCatch(s, f, seqRand(0, 0.5)) }
    const b = { id: 2, ...rollCatch(s, f, seqRand(0, 0.5), bamboo) }
    expect(b.value).toBeGreaterThan(a.value)
    expect(releaseBonusOf(b)).toBe(releaseBonusOf(a))
  })
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

describe('catch & release', () => {
  it('bonus is 2% per multiple of the place’s cheapest fish', () => {
    expect(releaseBonusOf(fish(1, 'dace', 1))).toBeCloseTo(0.02)
    expect(releaseBonusOf(fish(1, 'brownTrout', 1))).toBeCloseTo(0.30)
    expect(releaseBonusOf(fish(1, 'whitefish', 1.5))).toBeCloseTo(0.03)
    expect(releaseBonusOf({ ...fish(1, 'dace', 1), kind: 'junk', defId: 'tire' })).toBe(0)
  })
  it('same bonus per dollar for any species at one place', () => {
    const a = fish(1, 'creekChub', 1.3), b = fish(2, 'brownTrout', 1.7)
    expect(releaseBonusOf(a) / a.value).toBeCloseTo(releaseBonusOf(b) / b.value)
  })
  it('only counts once owned, and only fish', () => {
    const s = newGame()
    s.basket = [fish(1, 'brownTrout', 1), { ...item(2, -2, 'junk'), defId: 'boot' }]
    trash(s, 1); expect(s.releaseBonus).toBe(0)
    s.release = true
    s.basket.push(fish(3, 'brownTrout', 1))
    trash(s, 2); expect(s.releaseBonus).toBe(0)
    trash(s, 3); expect(s.releaseBonus).toBeCloseTo(0.30)
  })
  it('trash all adds every fish and stops at the cap', () => {
    const s = newGame(); s.release = true; s.bulkTrash = true
    s.basket = Array.from({ length: 5 }, (_, i) => fish(i + 1, 'brownTrout', 1))
    expect(trashStack(s, 'fish', 'brownTrout')).toBe(true)
    expect(s.releaseBonus).toBe(RELEASE.cap)
    s.basket = [fish(9, 'brownTrout', 1)]; trash(s, 9)
    expect(s.releaseBonus).toBe(RELEASE.cap)
  })
  it('a fish from another place uses its own place’s cheapest fish', () => {
    const s = newGame(); s.release = true; s.location = 'greatLake'
    s.basket = [fish(1, 'brownTrout', 1)]; trash(s, 1)
    expect(s.releaseBonus).toBeCloseTo(0.30)
  })
  it('manual sell multiplies fish only, then resets', () => {
    const s = newGame(); s.releaseBonus = 0.5
    s.basket = [item(1, 10), item(2, -2, 'junk')]
    expect(saleValue(s, true)).toBe(13)
    expect(saleValue(s)).toBe(8)
    expect(sellAll(s, true)).toBe(13)
    expect(s.releaseBonus).toBe(0)
  })
  it('a junk-only sale and the buyer’s sale keep the bonus', () => {
    const s = newGame(); s.releaseBonus = 0.5
    s.basket = [item(1, -2, 'junk')]; sellAll(s, true)
    expect(s.releaseBonus).toBe(0.5)
    s.basket = [item(2, 10)]
    expect(sellAll(s)).toBe(10)
    expect(s.releaseBonus).toBe(0.5)
  })
})

describe('waders discount', () => {
  it('is the best pair owned', () => {
    const s = newGame()
    expect(wadersDiscount(s)).toBe(0)
    s.waders.push('neopreneWaders', 'rubberWaders')
    expect(wadersDiscount(s)).toBeCloseTo(0.06)
    expect(price(s, 1000)).toBeCloseTo(940)
  })
  it('prices are whole dollars, so the shown price is the one charged', () => {
    const s = newGame(); s.waders.push('rubberWaders')
    for (const p of PATTERNS) expect(Number.isInteger(price(s, p.unlockCost)), p.id).toBe(true)
    const pat = PATTERNS[1]; s.money = Math.floor(price(s, pat.unlockCost))
    expect(unlockPattern(s, pat.id)).toBe(true)
  })
  it('unlocks charge the discounted price', () => {
    const s = newGame(); s.waders.push('guideProWaders')
    const pat = PATTERNS[1]; s.money = price(s, pat.unlockCost)
    expect(unlockPattern(s, pat.id)).toBe(true)
    expect(s.money).toBeCloseTo(0)
  })
  it('tying a fly is not discounted', () => {
    const s = newGame(); s.waders.push('guideProWaders'); s.unlockedPatterns.push('pheasantTail')
    setRecipe(s, { patternId: 'pheasantTail', materialIds: [] }); s.money = 100
    tieFly(s)
    expect(s.money).toBe(100 - flyStats(s, s.recipe).tieCost)
  })
})
