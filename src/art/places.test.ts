import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../game/data'
import { bakeBank, placeLook } from './places'
import { sideProp } from './scenery/props'
import { paint, type Bitmap } from './pixels'

const alpha = (b: Bitmap, x: number, y: number) => b.data[(y * b.w + x) * 4 + 3]
const rgb = (b: Bitmap, x: number, y: number) => {
  const i = (y * b.w + x) * 4
  return (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]
}

describe('place looks', () => {
  it('every place has a look with ≥3 water colours and riverH between 100 and 230', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id)
      expect(look.water.length, loc.id).toBeGreaterThanOrEqual(3)
      expect(look.riverH).toBeGreaterThanOrEqual(100)
      expect(look.riverH).toBeLessThanOrEqual(230)
    }
  })
  it('no two places share a look', () => {
    const keys = LOCATIONS.map(l => `${placeLook(l.id).water[0]}/${placeLook(l.id).bank}`)
    expect(new Set(keys).size).toBe(LOCATIONS.length)
  })
  it('paint accepts every decor and drift grid with its palette', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id)
      for (const d of [...look.decor, look.drift]) expect(() => paint(d.grid, d.palette), loc.id).not.toThrow()
    }
  })
  it('every prop kind paints', () => {
    for (const loc of LOCATIONS) for (const p of placeLook(loc.id).props)
      expect(sideProp(p, 1).data.some((v, i) => i % 4 === 3 && v > 0), `${loc.id} ${p.kind}`).toBe(true)
  })
  it('every place has a ground and the five grounds are all different', () => {
    expect(new Set(LOCATIONS.map(l => placeLook(l.id).ground)).size).toBe(LOCATIONS.length)
  })
  it('every place has ≥2 horizon layers and water that darkens', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id)
      expect(look.horizon.length, loc.id).toBeGreaterThanOrEqual(2)
      expect(look.deep, loc.id).not.toBe(look.water[0])
    }
  })
  it('an unknown style falls back to default', () => {
    expect(placeLook('creek', 'nope')).toBe(placeLook('creek'))
  })
})

describe('bakeBank', () => {
  it('edge strip touches the water side', () => {
    const look = placeLook('creek')
    const above = bakeBank(look, 480, 60, 'bottom', 1) // bank above the river: water below it
    const below = bakeBank(look, 480, 60, 'top', 2)
    expect([above.w, above.h]).toEqual([480, 60])
    for (const x of [0, 100, 479]) {
      expect(rgb(above, x, 59)).toBe(look.edge)
      expect(rgb(below, x, 0)).toBe(look.edge)
    }
  })
})
