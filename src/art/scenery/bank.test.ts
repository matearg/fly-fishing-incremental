import { describe, it, expect } from 'vitest'
import { LOCATIONS } from '../../game/data'
import { placeLook } from '../places'
import { FINE, type Bitmap } from '../pixels'
import { BANK_SURFACE, bakeSideBank } from './bank'

const alpha = (b: Bitmap, px: number, py: number) => b.data[(py * b.w + px) * 4 + 3]

describe('bakeSideBank', () => {
  it('is shoreX wide (wider with a dock), solid at the surface, clear on row 0, with props above the ground', () => {
    for (const loc of LOCATIONS) {
      const look = placeLook(loc.id), b = bakeSideBank(look, 176, 72, 1)
      expect([b.w, b.h], loc.id).toEqual([(look.shoreX + (look.dock ? 110 : 0)) * FINE, 176 * FINE])
      expect(alpha(b, 4 * FINE, BANK_SURFACE * FINE), loc.id).toBe(255)
      for (let px = 0; px < b.w; px++) expect(alpha(b, px, 0), `${loc.id} px=${px}`).toBe(0)
      if (look.props.length) {
        let above = false
        for (let py = 0; py < (BANK_SURFACE - 3) * FINE && !above; py++) for (let px = 0; px < b.w; px++) if (alpha(b, px, py)) { above = true; break }
        expect(above, loc.id).toBe(true)
      }
    }
  })
})
