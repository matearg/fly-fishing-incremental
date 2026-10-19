import { describe, it, expect } from 'vitest'
import { buyRod, buyWaders, equipRod, equippedRod, wearWaders } from './gear'
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
})
