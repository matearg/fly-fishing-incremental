import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../../game/data'
import { placeLook } from '../places'
import { FINE, type Bitmap } from '../pixels'
import { getPx } from './raster'
import { bakeHorizon } from './skyline'
import { bakeSideWater, bedTop } from './water'

const luma = (c: number) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff)
const rowLuma = (b: Bitmap, py: number) => { let t = 0; for (let px = 0; px < b.w; px++) t += luma(getPx(b, px, py)); return t / b.w }

describe('bakeSideWater', () => {
  it('is fine, fully opaque and darker at the bottom', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id), b = bakeSideWater(look, bakeHorizon(look, 480, 110, 1), 480, 160, 148, 1)
      expect([b.w, b.h], loc.id).toEqual([480 * FINE, 160 * FINE])
      expect(b.data.every((v, i) => i % 4 !== 3 || v === 255), loc.id).toBe(true)
      expect(rowLuma(b, b.h - 1), loc.id).toBeLessThan(rowLuma(b, 0))
    }
  })
  it('bedTop never rises above clear', () => {
    for (let x = 0; x < 480; x++) {
      const y = bedTop(x, 160, 148, 1)
      expect(y).toBeGreaterThanOrEqual(148)
      expect(y).toBeLessThanOrEqual(158)
    }
  })
})
