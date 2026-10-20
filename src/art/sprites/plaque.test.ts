import { describe, it, expect } from 'vitest'
import { plaqueBitmap } from './plaque'
import { LEGENDARY_IDS } from '../../game/progress/trophies'

describe('plaque', () => {
  it('bakes for every legendary with the fish opaque at its centre', () => {
    for (const id of LEGENDARY_IDS) {
      const b = plaqueBitmap(id), c = ((b.h >> 1) * b.w + (b.w >> 1)) * 4
      expect(b.data[c + 3], id).toBe(255)
    }
  })
  it('different species get different plaques', () => {
    const [a, b] = [plaqueBitmap('muskie'), plaqueBitmap('arcticChar')]
    expect([a.w, a.h]).toEqual([b.w, b.h])
    expect(a.data.some((v, i) => v !== b.data[i])).toBe(true)
  })
})
