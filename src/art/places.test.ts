import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../game/data'
import { PLACE_LOOKS } from './places'
import { paint } from './pixels'

describe('place looks', () => {
  it('every place has a look with ≥3 water colours and riverH between 100 and 230', () => {
    for (const loc of LOCATIONS) {
      const look = PLACE_LOOKS[loc.id]
      expect(look.water.length, loc.id).toBeGreaterThanOrEqual(3)
      expect(look.riverH).toBeGreaterThanOrEqual(100)
      expect(look.riverH).toBeLessThanOrEqual(230)
    }
  })
  it('no two places share a look', () => {
    const keys = LOCATIONS.map(l => `${PLACE_LOOKS[l.id].water[0]}/${PLACE_LOOKS[l.id].bank}`)
    expect(new Set(keys).size).toBe(LOCATIONS.length)
  })
  it('paint accepts every decor grid with its palette', () => {
    for (const loc of LOCATIONS) for (const d of PLACE_LOOKS[loc.id].decor) expect(() => paint(d.grid, d.palette)).not.toThrow()
  })
})

describe('bakeBank', () => {
  it('edge strip touches the water side', async () => {
    const { bakeBank } = await import('./places')
    const look = PLACE_LOOKS.creek
    const rgb = (b: { w: number; data: Uint8ClampedArray }, x: number, y: number) => {
      const i = (y * b.w + x) * 4
      return (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]
    }
    const above = bakeBank(look, 480, 60, 'bottom', 1) // bank above the river: water below it
    const below = bakeBank(look, 480, 60, 'top', 2)
    expect([above.w, above.h]).toEqual([480, 60])
    for (const x of [0, 100, 479]) {
      expect(rgb(above, x, 59)).toBe(look.edge)
      expect(rgb(below, x, 0)).toBe(look.edge)
    }
  })
})
