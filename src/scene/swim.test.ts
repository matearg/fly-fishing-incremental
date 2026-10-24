import { describe, it, expect } from 'vitest'
import { foldX, glints, tailFrame } from './swim'
import { lcg } from '../game/util/rand'
import { VIEW_W } from './view'

describe('swim helpers', () => {
  it('tailFrame flips at 8 steps a second', () => {
    expect([0, 0.125, 0.25].map(t => tailFrame(['a', 'b'], 0, t))).toEqual(['a', 'b', 'a'])
  })
  it('glints draw in the old order, so seeded layouts do not move', () => {
    const r = lcg(7), old = Array.from({ length: 5 }, () => ({ x0: r() * VIEW_W, y: 110 + Math.floor(r() * 8), len: 2 + Math.floor(r() * 5), speed: 6 + r() * 10 }))
    expect(glints(lcg(7), 5, 110, 8)).toEqual(old)
  })
})

describe('foldX', () => {
  it('is the identity inside the range, heading right', () => {
    expect(foldX(15, 10, 30)).toEqual({ x: 15, right: true })
  })
  it('reflects off the top', () => {
    expect(foldX(35, 10, 30)).toEqual({ x: 25, right: false })
  })
  it('comes back up after the bottom', () => {
    expect(foldX(55, 10, 30)).toEqual({ x: 15, right: true })
  })
  it('below lo mirrors the top case', () => {
    expect(foldX(5, 10, 30)).toEqual({ x: 15, right: false })
  })
  it('reaches both endpoints', () => {
    expect(foldX(30, 10, 30).x).toBe(30)
    expect(foldX(10, 10, 30).x).toBe(10)
  })
  it('an empty or inverted range pins x to lo', () => {
    expect(foldX(123, 10, 10)).toEqual({ x: 10, right: true })
    expect(foldX(123, 10, 4)).toEqual({ x: 10, right: true })
  })
  it('always lands inside [lo, hi]', () => {
    const r = lcg(3)
    for (let i = 0; i < 200; i++) {
      const u = (r() * 2 - 1) * 10_000, { x } = foldX(u, -7, 41)
      expect(x).toBeGreaterThanOrEqual(-7)
      expect(x).toBeLessThanOrEqual(41)
    }
  })
})
