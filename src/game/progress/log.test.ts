import { describe, it, expect } from 'vitest'
import { bountyOf, logCatch } from './log'
import { newGame } from '../state'
import { BOUNTY } from '../data'

describe('species log', () => {
  it('bountyOf is mult × base value', () => {
    expect(bountyOf('brookTrout')).toBe(BOUNTY.mult * 8)
  })
  it('logCatch logs a new non-legendary once and returns its bounty', () => {
    const s = newGame()
    expect(logCatch(s, 'brookTrout')).toBe(bountyOf('brookTrout'))
    expect(logCatch(s, 'brookTrout')).toBe(0)
    expect(s.speciesLog).toEqual(['brookTrout'])
  })
  it('logCatch ignores legendaries', () => {
    const s = newGame()
    expect(logCatch(s, 'muskie')).toBe(0)
    expect(s.speciesLog).toEqual([])
  })
})
