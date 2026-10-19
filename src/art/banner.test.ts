import { describe, it, expect } from 'vitest'
import { bannerLetters, CHUM_STYLE, CHUM_TEXT, HATCH_STYLE, HATCH_TEXT } from './banner'

describe('banner letters', () => {
  it('one bitmap per letter, all the same height, null for spaces', () => {
    for (const [text, style] of [[CHUM_TEXT, CHUM_STYLE], [HATCH_TEXT, HATCH_STYLE]] as const) {
      const ls = bannerLetters(text, style)
      expect(ls).toHaveLength(text.length)
      ;[...text].forEach((ch, i) => expect(ls[i] === null, ch).toBe(ch === ' '))
      const hs = new Set(ls.filter(l => l).map(l => l!.h))
      expect(hs.size).toBe(1)
    }
  })
})
