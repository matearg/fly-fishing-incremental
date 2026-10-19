import { describe, it, expect } from 'vitest'
import { FINE } from '../pixels'
import { fill, fineBlank, getPx, setPx } from './raster'

describe('raster', () => {
  it('fineBlank is FINE× the world size', () => {
    const b = fineBlank(30, 7)
    expect([b.w, b.h]).toEqual([30 * FINE, 7 * FINE])
  })
  it('fill covers exactly the fine pixels of a world rect', () => {
    const b = fineBlank(4, 4)
    fill(b, 1, 1, 2, 2, () => 0xff0000)
    for (let py = 0; py < b.h; py++) for (let px = 0; px < b.w; px++) {
      const inside = px >= FINE && px < 2 * FINE && py >= FINE && py < 2 * FINE
      expect(b.data[(py * b.w + px) * 4 + 3], `${px},${py}`).toBe(inside ? 255 : 0)
    }
  })
  it('fill passes world centres and a null leaves the pixel', () => {
    const b = fineBlank(2, 1), seen: number[] = []
    fill(b, 0, 0, 2, 1, (px, _py, x) => { seen.push(x); return px === 0 ? null : 0x00ff00 })
    expect(seen[0]).toBe(0.5 / FINE)
    expect(b.data[3]).toBe(0)
    expect(getPx(b, 1, 0)).toBe(0x00ff00)
  })
  it('setPx clips and getPx clamps', () => {
    const b = fineBlank(1, 1)
    setPx(b, -1, 0, 0xffffff); setPx(b, 99, 99, 0xffffff)
    expect([...b.data].every(v => v === 0)).toBe(true)
    setPx(b, 0, 0, 0x123456)
    expect(getPx(b, -5, -5)).toBe(0x123456)
  })
})
