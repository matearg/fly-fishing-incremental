import { describe, it, expect } from 'vitest'
import { fbm, hash2, noise1, noise2, ramp, ridged, shade } from './noise'

describe('noise', () => {
  it('same inputs give the same value', () => {
    expect(hash2(3, 7)).toBe(hash2(3, 7))
    expect(noise1(4.2, 9)).toBe(noise1(4.2, 9))
    expect(noise2(1.5, 2.5, 3)).toBe(noise2(1.5, 2.5, 3))
    expect(fbm(0.37, 5)).toBe(fbm(0.37, 5))
    expect(ridged(0.37, 5)).toBe(ridged(0.37, 5))
  })
  it('values stay in [0,1]', () => {
    for (let i = 0; i < 1000; i++) {
      const x = i * 0.173 - 40, y = i * 0.091
      for (const v of [hash2(i, -i), noise1(x, i), noise2(x, y, i), fbm(x, i), ridged(x, i)]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
  it('ramp returns only palette colours and exact endpoints', () => {
    const cols = [0x111111, 0x555555, 0x999999, 0xdddddd]
    for (let i = 0; i <= 100; i++) for (let p = 0; p < 4; p++) expect(cols).toContain(ramp(cols, i / 100, p, i))
    for (let p = 0; p < 16; p++) {
      expect(ramp(cols, -0.5, p, p >> 2)).toBe(cols[0])
      expect(ramp(cols, 0, p, p >> 2)).toBe(cols[0])
      expect(ramp(cols, 1, p, p >> 2)).toBe(cols[3])
      expect(ramp(cols, 2, p, p >> 2)).toBe(cols[3])
    }
  })
  it('shade darkens below zero and lightens above', () => {
    expect(shade(0x808080, -1)).toBe(0x000000)
    expect(shade(0x808080, 1)).toBe(0xffffff)
    expect(shade(0x808080, 0)).toBe(0x808080)
  })
})
