import { describe, it, expect } from 'vitest'
import { FAVICONS } from './favicon'
import { iconBitmap } from './icons'

describe('favicon', () => {
  it('comes square at 16 and 32, paints, and has opaque pixels', () => {
    expect(FAVICONS.map(f => f.grid.length)).toEqual([16, 32])
    for (const f of FAVICONS) {
      const b = iconBitmap(f)
      expect(b.w).toBe(b.h)
      expect(b.data.some((v, i) => i % 4 === 3 && v === 255)).toBe(true)
    }
  })
})
