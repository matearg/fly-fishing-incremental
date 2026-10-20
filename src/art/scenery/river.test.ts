import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../../game/data'
import { placeLook } from '../places'
import { FINE, type Bitmap } from '../pixels'
import { getPx } from './raster'
import { bakeBank, bakeRiver } from './river'

const opaqueRow = (b: Bitmap, py: number) => Array.from({ length: b.w }, (_, px) => b.data[(py * b.w + px) * 4 + 3]).every(a => a === 255)
const luma = (c: number) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff)
const rowLuma = (b: Bitmap, py: number) => { let t = 0; for (let px = 0; px < b.w; px++) t += luma(getPx(b, px, py)); return t / b.w }

describe('bakeRiver', () => {
  it('is fine, fully opaque, and mid-river differs from the shore', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id), b = bakeRiver(look, 480, look.riverH, 1)
      expect([b.w, b.h], loc.id).toEqual([960, look.riverH * FINE])
      expect(b.data.every((v, i) => i % 4 !== 3 || v === 255), loc.id).toBe(true)
      expect(Math.abs(rowLuma(b, b.h >> 1) - rowLuma(b, 0)), loc.id).toBeGreaterThan(3)
    }
  })
})

describe('bakeBank', () => {
  it('is fine and the row touching the water is fully opaque', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id), above = bakeBank(look, 480, 60, 'bottom', 1), below = bakeBank(look, 480, 60, 'top', 2)
      expect([above.w, above.h], loc.id).toEqual([960, 120])
      expect(opaqueRow(above, above.h - 1), loc.id).toBe(true)
      expect(opaqueRow(below, 0), loc.id).toBe(true)
    }
  })
})
