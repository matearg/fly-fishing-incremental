import { describe, it, expect } from 'vitest'
import { glints, tailFrame } from './swim'
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
