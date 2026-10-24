import { describe, it, expect } from 'vitest'
import { logCardBitmap } from './logcard'
import { plaqueBitmap } from './plaque'
import { SPECIES } from '../../game/data'
import { LEGENDARY_IDS } from '../../game/progress/trophies'

const ids = SPECIES.map(s => s.id).filter(id => !LEGENDARY_IDS.includes(id))

describe('log card', () => {
  it('bakes for every non-legendary species with the fish opaque at its centre', () => {
    for (const id of ids) {
      const b = logCardBitmap(id), c = ((b.h >> 1) * b.w + (b.w >> 1)) * 4
      expect(b.data[c + 3], id).toBe(255)
    }
  })
  it('different species get different cards', () => {
    const [a, b] = [logCardBitmap('dace'), logCardBitmap('brookTrout')]
    expect([a.w, a.h]).toEqual([b.w, b.h])
    expect(a.data.some((v, i) => v !== b.data[i])).toBe(true)
  })
  it('no taller than the trophy shield', () => {
    for (const id of ids) expect(logCardBitmap(id).h, id).toBeLessThanOrEqual(plaqueBitmap('muskie').h)
  })
})
