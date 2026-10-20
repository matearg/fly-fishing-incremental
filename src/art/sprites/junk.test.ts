import { describe, it, expect } from 'vitest'
import { JUNK } from '../../game/data'
import { FINE } from '../pixels'
import { JUNK_ART, JUNK_SNAG, junkBitmap } from './junk'

describe('junk art', () => {
  it('every junk item has art and a snag point', () => {
    for (const j of JUNK) {
      expect(JUNK_ART[j.id], j.id).toBeDefined()
      expect(JUNK_SNAG[j.id], j.id).toBeDefined()
    }
  })
  it('junkBitmap paints each item and the snag lands on it', () => {
    for (const j of JUNK) {
      const b = junkBitmap(j.id), [x, y] = JUNK_SNAG[j.id].map(v => v * FINE)
      expect(b.w * b.h, j.id).toBeGreaterThan(0)
      expect(b.data[(y * b.w + x) * 4 + 3], j.id).toBe(255)
    }
  })
  it('grids are rectangular', () => {
    for (const j of JUNK) for (const row of JUNK_ART[j.id].grid) expect(row.length, j.id).toBe(JUNK_ART[j.id].grid[0].length)
  })
})
