import { describe, it, expect } from 'vitest'
import { bakeLogo } from './logo'

describe('logo', () => {
  it('bakeLogo fits the canvas', () => {
    const b = bakeLogo()
    expect(b.w).toBeLessThanOrEqual(300)
    expect(b.h).toBeLessThanOrEqual(110)
    expect(b.data.length).toBe(b.w * b.h * 4)
  })
})
