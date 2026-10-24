import { describe, expect, it } from 'vitest'
import { layoutFor } from './layout'

describe('layoutFor', () => {
  it('keeps desktop and tablets on the desktop layout', () => {
    expect(layoutFor(1600, 900)).toBe('desktop')
    expect(layoutFor(768, 1024)).toBe('desktop')
    expect(layoutFor(1024, 768)).toBe('desktop')
  })
  it('picks upright or sideways on a phone', () => {
    expect(layoutFor(390, 750)).toBe('upright')
    expect(layoutFor(750, 340)).toBe('sideways')
  })
  it('switches at 700 wide and 500 tall', () => {
    expect(layoutFor(700, 900)).toBe('upright')
    expect(layoutFor(701, 900)).toBe('desktop')
    expect(layoutFor(1200, 500)).toBe('sideways')
    expect(layoutFor(1200, 501)).toBe('desktop')
  })
  it('a square phone is sideways: upright needs height > width', () => {
    expect(layoutFor(500, 500)).toBe('sideways')
  })
})
