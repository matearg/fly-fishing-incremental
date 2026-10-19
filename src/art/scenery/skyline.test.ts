import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../../game/data'
import { placeLook } from '../places'
import { FINE } from '../pixels'
import { getPx } from './raster'
import { bakeHorizon } from './skyline'

const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]) // toEqual is slow on big arrays

describe('bakeHorizon', () => {
  it('is fine, fully opaque, starts with the sky and depends on the seed', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id), b = bakeHorizon(look, 480, 110, 1)
      expect([b.w, b.h], loc.id).toEqual([480 * FINE, 110 * FINE])
      expect(b.data.every((v, i) => i % 4 !== 3 || v === 255), loc.id).toBe(true)
      expect(getPx(b, 0, 0), loc.id).toBe(look.sky[0])
      expect(same(bakeHorizon(look, 480, 110, 1).data, b.data), loc.id).toBe(true)
      expect(same(bakeHorizon(look, 480, 110, 2).data, b.data), loc.id).toBe(false)
    }
  })
})
