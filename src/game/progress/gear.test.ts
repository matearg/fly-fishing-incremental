import { describe, it, expect } from 'vitest'
import { bestRod, buyRod, buyWaders, equipRod, equippedRod, rodGain, wearWaders } from './gear'
import { LOCATIONS, RODS } from '../data'
import { wadersDiscount } from './economy'
import { newGame } from '../state'

describe('gear', () => {
  it('buying a rod charges its price and equips it', () => {
    const s = newGame(); s.money = 500
    expect(buyRod(s, 'willowRod')).toBe(true)
    expect(s.money).toBe(0); expect(s.rod).toBe('willowRod'); expect(s.rods).toContain('willowRod')
    expect(buyRod(s, 'willowRod')).toBe(false)
    expect(buyRod(s, 'nope')).toBe(false)
  })
  it('only owned rods can be equipped', () => {
    const s = newGame()
    expect(equipRod(s, 'graphiteRod')).toBe(false)
    s.rods.push('graphiteRod'); expect(equipRod(s, 'graphiteRod')).toBe(true)
    expect(equipRod(s, 'plainRod')).toBe(true); expect(equippedRod(s).id).toBe('plainRod')
  })
  it('a pair is priced with the discount owned before buying it', () => {
    const s = newGame(); s.waders.push('rubberWaders'); s.money = 4000 * 0.98
    expect(buyWaders(s, 'canvasWaders')).toBe(true)
    expect(s.money).toBeCloseTo(0); expect(s.wearing).toBe('canvasWaders')
  })
  it('wearing an older pair keeps the best discount', () => {
    const s = newGame(); s.waders.push('rubberWaders', 'neopreneWaders')
    expect(wearWaders(s, 'rubberWaders')).toBe(true)
    expect(wadersDiscount(s)).toBeCloseTo(0.06)
  })
  it('with every rod owned, each rod is the single best somewhere', () => {
    const best = new Set<string>()
    for (const ob of [0, 0.2, 0.4]) for (const loc of LOCATIONS) for (let d = 0; d <= loc.maxDepth; d++) {
      const g = RODS.slice(1).map(r => ({ id: r.id, v: rodGain(r, loc.id, d, ob, []) })).sort((x, y) => y.v - x.v)
      if (g[0].v > g[1].v * 1.05) best.add(g[0].id)
    }
    expect([...best].sort()).toEqual(RODS.slice(1).map(r => r.id).sort())
  })
  it('bestRod picks the owned rod that pays most here', () => {
    const s = newGame(); s.location = 'mountainLake'; s.unlockedLocations.push('mountainLake')
    s.rods.push('bambooCane', 'fiberglassRod') // basic dry reaches only Mountain Lake's commons
    expect(bestRod(s)).toBe('bambooCane')
  })
})
