import { describe, it, expect } from 'vitest'
import type { PropKind } from '../places'
import { FINE, type Bitmap } from '../pixels'
import { PROP_SIZE, sideProp } from './props'

const opaque = (b: Bitmap, py: number) => Array.from({ length: b.w }, (_, px) => b.data[(py * b.w + px) * 4 + 3]).some(a => a > 0)

describe('sideProp', () => {
  for (const kind of Object.keys(PROP_SIZE) as PropKind[]) it(`${kind} paints, fits and stands on its bottom row`, () => {
    const p = { kind, colors: [0x2f6a3a, 0xb04a2a], count: 1 }, b = sideProp(p, 3)
    const [w, h] = PROP_SIZE[kind]
    expect(b.w).toBeLessThanOrEqual(w * FINE)
    expect(b.h).toBeLessThanOrEqual(h * FINE)
    expect(b.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true)
    expect(opaque(b, b.h - 1)).toBe(true)
    expect(sideProp(p, 3).data.every((v, i) => v === b.data[i])).toBe(true)
  })
})
