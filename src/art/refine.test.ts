import { describe, it, expect } from 'vitest'
import { paint, upscale, type Bitmap } from './pixels'
import { refine } from './refine'

const PAL = { o: 0x101010, c: 0x808080, h: 0xa06030, s: 0xe0c0a0 }
const o = PAL.o
const i = (b: Bitmap, x: number, y: number) => (y * b.w + x) * 4
const alpha = (b: Bitmap, x: number, y: number) => b.data[i(b, x, y) + 3]
const rgb = (b: Bitmap, x: number, y: number) => (b.data[i(b, x, y)] << 16) | (b.data[i(b, x, y) + 1] << 8) | b.data[i(b, x, y) + 2]
const luma = (b: Bitmap, x: number, y: number) => 0.299 * b.data[i(b, x, y)] + 0.587 * b.data[i(b, x, y) + 1] + 0.114 * b.data[i(b, x, y) + 2]
const RING = paint(['ooooooo', ...Array(5).fill('occccco'), 'ooooooo'], PAL)

describe('upscale', () => {
  it('copies each pixel into a k×k block', () => {
    const src = paint(['ch'], PAL), out = upscale(src, 2)
    expect([out.w, out.h]).toEqual([4, 2])
    expect(rgb(out, 0, 0)).toBe(rgb(src, 0, 0))
    expect(rgb(out, 1, 1)).toBe(rgb(src, 0, 0))
    expect(rgb(out, 2, 0)).toBe(rgb(src, 1, 0))
  })
})

describe('refine', () => {
  const out = refine(RING, o)
  it('doubles the size and keeps alpha per source pixel', () => {
    expect([out.w, out.h]).toEqual([14, 14])
    const holey = paint(['.o.', 'oco', '.o.'], PAL), r = refine(holey, o)
    for (const [src, b] of [[RING, out], [holey, r]] as const)
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) expect(alpha(b, x, y)).toBe(alpha(src, x >> 1, y >> 1))
  })
  it('makes the outer outline one fine pixel thick', () => {
    for (let x = 1; x <= 12; x++) expect(rgb(out, x, 0)).toBe(o)
    expect(rgb(out, 7, 1)).not.toBe(o)
  })
  it('makes an inner outline line one fine pixel thick', () => {
    const b = refine(paint(['ooo', 'oho', 'ooo', 'oso', 'ooo'], PAL), o)
    expect(rgb(b, 2, 4)).not.toBe(o)
    expect(rgb(b, 2, 5)).toBe(o)
  })
  it('turns nothing into outline without an outline colour', () => {
    const b = refine(paint(['ccc', 'ccc'], PAL))
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      expect(rgb(b, x, y)).not.toBe(o)
      expect(alpha(b, x, y)).toBe(255)
    }
  })
  it('darkens the right edge and lightens the left', () => {
    expect(luma(out, 12, 7)).toBeLessThan(luma(out, 7, 7))
    expect(luma(out, 1, 7)).toBeGreaterThan(luma(out, 7, 7))
  })
})
