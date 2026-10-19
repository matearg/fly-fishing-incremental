import { describe, it, expect } from 'vitest'
import { FINE } from '../pixels'
import { insectBitmaps } from './insects'

describe('insects', () => {
  it('two wing frames of the same size, both with ink', () => {
    const [up, down] = insectBitmaps()
    expect([up.w, up.h]).toEqual([down.w, down.h])
    for (const b of [up, down]) expect(b.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true)
  })
  it('is drawn at fine size', () => {
    expect([insectBitmaps()[0].w, insectBitmaps()[0].h]).toEqual([5 * FINE, 3 * FINE])
  })
})
