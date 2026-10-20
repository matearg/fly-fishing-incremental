import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../game/data'
import { placeLook } from './places'
import { sideProp, topProp } from './scenery/props'
import { paint } from './pixels'

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
  it('every decor kind paints, and paint accepts every drift grid', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id)
      for (const p of look.decor) expect(topProp(p, 1).data.some((v, i) => i % 4 === 3 && v > 0), `${loc.id} ${p.kind}`).toBe(true)
      expect(() => paint(look.drift.grid, look.drift.palette), loc.id).not.toThrow()
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
