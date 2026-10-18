import { describe, it, expect } from 'vitest'
import { NOTES, SPEAKER, soundIconMask } from './soundIcons'
import { SMALL, textMask } from './font'

describe('sound icons', () => {
  it('bakes the speaker as drawn', () => {
    const m = soundIconMask(SPEAKER, false)
    expect([m.w, m.h]).toEqual([11, 9])
    SPEAKER.forEach((row, y) => [...row].forEach((ch, x) => expect(m.on[y * m.w + x], `${x},${y}`).toBe(ch === '#' ? 1 : 0)))
  })

  it('slashes the muted speaker with a gap below the line', () => {
    const m = soundIconMask(SPEAKER, true)
    expect(m.on[0]).toBe(1)
    expect(m.on[8 * m.w + 10]).toBe(1)
    for (let x = 0; x < m.w; x++) {
      const y = Math.round(x * (m.h - 1) / (m.w - 1))
      expect(m.on[y * m.w + x]).toBe(1)
      if (y + 1 < m.h) expect(m.on[(y + 1) * m.w + x], `below ${x}`).toBe(0)
    }
  })

  it('slashes the notes too', () => {
    const m = soundIconMask(NOTES, true)
    expect([m.w, m.h]).toEqual([9, 9])
    expect(m.on[0]).toBe(1)
    expect(m.on[8 * 9 + 8]).toBe(1)
  })

  it('has the glyphs for the percent label', () => {
    expect(() => textMask('100%', SMALL)).not.toThrow()
    expect(() => textMask('OFF', SMALL)).not.toThrow()
  })
})
