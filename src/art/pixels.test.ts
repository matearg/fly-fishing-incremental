import { describe, it, expect } from 'vitest'
import { paint, stylize } from './pixels'
import { BIG, SMALL, textMask } from './font'

const px = (b: { w: number; data: Uint8ClampedArray }, x: number, y: number) => [...b.data.slice((y * b.w + x) * 4, (y * b.w + x) * 4 + 4)]

describe('paint', () => {
  it("maps palette chars and leaves '.' transparent", () => {
    const b = paint(['a.', '.b'], { a: 0x112233, b: 0x445566 })
    expect([b.w, b.h]).toEqual([2, 2])
    expect(px(b, 0, 0)).toEqual([0x11, 0x22, 0x33, 255])
    expect(px(b, 1, 0)[3]).toBe(0)
    expect(px(b, 1, 1)).toEqual([0x44, 0x55, 0x66, 255])
  })
  it('throws on unknown char', () => {
    expect(() => paint(['x'], { a: 0 })).toThrow()
  })
})

describe('stylize', () => {
  const style = { top: 0xff0000, bottom: 0x0000ff, outline: 0x00ff00, outlineW: 2 }
  it('outlines every inked pixel', () => {
    const b = stylize({ w: 1, h: 1, on: new Uint8Array([1]) }, style)
    // ink lands at (2,2) after growing by outlineW on each side
    expect([b.w, b.h]).toEqual([5, 5])
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      if (x === 2 && y === 2) continue
      expect(px(b, x, y)).toEqual([0, 255, 0, 255])
    }
  })
  it('gradient: first inked row is top colour, last is bottom', () => {
    const b = stylize({ w: 1, h: 8, on: new Uint8Array(8).fill(1) }, style)
    expect(px(b, 2, 2)).toEqual([255, 0, 0, 255])
    expect(px(b, 2, 9)).toEqual([0, 0, 255, 255])
  })
})

describe('font', () => {
  it('every SMALL glyph is 5 wide and 7 tall', () => {
    for (const [ch, g] of Object.entries(SMALL)) {
      expect(g, ch).toHaveLength(7)
      for (const row of g) expect(row.length, ch).toBe(5)
    }
  })
  it('every BIG glyph is 15 tall with rows of equal width', () => {
    for (const [ch, g] of Object.entries(BIG)) {
      expect(g, ch).toHaveLength(15)
      for (const row of g) expect(row.length, ch).toBe(g[0].length)
    }
  })
  it('textMask width = sum of glyph widths + spacing, and throws on unknown char', () => {
    const m = textMask('AB', SMALL)
    expect(m.w).toBe(5 + 1 + 5)
    expect(m.h).toBe(7)
    expect(() => textMask('A~', SMALL)).toThrow()
  })
})
