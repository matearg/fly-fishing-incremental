import { describe, it, expect } from 'vitest'
import { helperCost, buyHelper, toggleBuyerPause } from './helpers'
import { benchCooldownMs, tick } from '../fishing/sim'
import { newGame, type GameState } from '../state'
import { HELPERS, LICENSE_UPGRADES, PATTERNS, TIMING } from '../data'
import { seqRand } from '../util/testutil'

const run = (s: GameState, ms: number, r = seqRand(0.1, 0.3, 0.5)) => { for (let t = 0; t < ms; t += 100) tick(s, 100, r) }

describe('helper costs', () => {
  it('helpers stack the license discount and the waders discount', () => {
    const s = newGame(); s.licenseLevels.helperDiscount = 1; s.waders.push('guideProWaders')
    expect(helperCost(s, 'buyer')).toBeCloseTo(HELPERS.buyer.cost * 0.9 * 0.9)
  })
  it('catch & release is a one-off helper', () => {
    const s = newGame()
    expect(s.release).toBe(false)
    expect(helperCost(s, 'release')).toBe(HELPERS.release.cost)
    s.money = HELPERS.release.cost
    expect(buyHelper(s, 'release')).toBe(true)
    expect(s.release).toBe(true)
    expect(s.money).toBe(0)
    expect(helperCost(s, 'release')).toBeNull()
  })
  it('the junk sorter costs over 3× bulk trash', () => {
    expect(HELPERS.sorter.cost).toBeGreaterThan(3 * HELPERS.bulkTrash.cost)
  })
  it('angler cost grows and license discount applies', () => {
    const s = newGame()
    s.money = 1e9
    expect(buyHelper(s, 'angler')).toBe(true)
    expect(s.anglers).toHaveLength(2)
    expect(s.anglers[1].auto).toBe(true)
    expect(helperCost(s, 'angler')).toBe(Math.round(HELPERS.angler.baseCost * HELPERS.angler.growth))
    s.licenseLevels.helperDiscount = 1
    const per = LICENSE_UPGRADES.find(u => u.id === 'helperDiscount')!.perLevel
    expect(helperCost(s, 'angler')).toBe(Math.round(HELPERS.angler.baseCost * HELPERS.angler.growth * (1 - per)))
  })
  it('broke purchase changes nothing; one-offs only once', () => {
    const s = newGame()
    const before = structuredClone(s)
    expect(buyHelper(s, 'angler')).toBe(false)
    expect(buyHelper(s, 'sorter')).toBe(false)
    expect(s).toEqual(before)
    s.money = 1e9
    expect(buyHelper(s, 'sorter')).toBe(true)
    expect(buyHelper(s, 'sorter')).toBe(false)
    expect(helperCost(s, 'sorter')).toBeNull()
  })
  it('bulk trash is a one-off that comes before the sorter', () => {
    const s = newGame()
    expect(helperCost(s, 'bulkTrash')!).toBeLessThan(helperCost(s, 'sorter')!)
    s.money = 1e9
    expect(buyHelper(s, 'bulkTrash')).toBe(true)
    expect(s.bulkTrash).toBe(true)
    expect(helperCost(s, 'bulkTrash')).toBeNull()
  })
})

describe('helpers in tick', () => {
  it('bench ties one fly per cooldown, up to one per angler', () => {
    const s = newGame()
    s.money = 1e9
    s.bench = 1
    s.anglers.push({ auto: true, phase: 'reeling', timerMs: 1e12, fly: null, pending: null }) // busy, never takes a fly
    run(s, TIMING.benchTieMs - 100)
    expect(s.flyBox).toHaveLength(0)
    run(s, 200)
    expect(s.flyBox).toHaveLength(1)
    run(s, TIMING.benchTieMs * 50)
    expect(s.flyBox).toHaveLength(s.anglers.length)
    expect(s.benchTimerMs).toBe(0) // paused while full
  })
  it('each extra bench cuts the cooldown by 25%', () => {
    const s = newGame()
    s.bench = 1
    expect(benchCooldownMs(s)).toBe(TIMING.benchTieMs)
    s.bench = 3
    expect(benchCooldownMs(s)).toBeCloseTo(TIMING.benchTieMs * 0.75 ** 2)
  })
  it('sorter drops landed junk', () => {
    const s = newGame()
    s.sorter = true
    s.anglers.push({ auto: true, phase: 'reeling', timerMs: 1, fly: { patternId: PATTERNS[0].id, materialIds: [], wearLeft: 5 }, pending: null })
    tick(s, 100, seqRand(0.9999, 0.5))
    expect(s.anglers[1].phase).toBe('idle')
    expect(s.basket).toHaveLength(0)
  })
  it('buyer sells the basket on its interval', () => {
    const s = newGame()
    s.buyer = true
    s.basket = [{ id: 1, kind: 'fish', defId: 'dace', value: 10, size: 1 }]
    run(s, TIMING.buyerIntervalMs + 100)
    expect(s.money).toBe(10)
    expect(s.basket).toHaveLength(0)
  })
})

describe('buyer pause', () => {
  it('a paused buyer neither sells nor advances its timer', () => {
    const s = newGame(); s.buyer = true
    expect(toggleBuyerPause(s)).toBe(true); expect(s.buyerPaused).toBe(true)
    s.basket = [{ id: 1, kind: 'fish', defId: 'dace', value: 5, size: 1 }]
    run(s, TIMING.buyerIntervalMs * 2)
    expect(s.basket).toHaveLength(1); expect(s.buyerTimerMs).toBe(0)
    toggleBuyerPause(s); run(s, TIMING.buyerIntervalMs + 100)
    expect(s.basket).toHaveLength(0)
  })
  it('no buyer, no pause', () => {
    const s = newGame()
    expect(toggleBuyerPause(s)).toBe(false); expect(s.buyerPaused).toBe(false)
  })
})
