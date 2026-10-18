import { describe, expect, it } from 'vitest'
import { PATTERNS } from '../../game/data'
import { LINE_FLIES, LINE_FLY_EYE, lineFlyBitmap } from './flies'

describe('line flies', () => {
  it('every pattern has a sprite that paints', () => {
    for (const p of PATTERNS) {
      expect(LINE_FLIES[p.id], p.id).toBeDefined()
      expect(() => lineFlyBitmap(p.id), p.id).not.toThrow()
    }
  })
  it('the line ties on at an opaque pixel inside the sprite', () => {
    for (const p of PATTERNS) {
      const b = lineFlyBitmap(p.id), [x, y] = LINE_FLY_EYE[p.id]
      expect(x >= 0 && y >= 0 && x < b.w && y < b.h, p.id).toBe(true)
      expect(b.data[(y * b.w + x) * 4 + 3], p.id).toBe(255)
    }
  })
  it('an unknown pattern falls back to basicDry', () => {
    const b = lineFlyBitmap('nope'), d = lineFlyBitmap('basicDry')
    expect([b.w, b.h]).toEqual([d.w, d.h])
  })
})
