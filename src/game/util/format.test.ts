import { describe, it, expect } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it('plain below 1000, floored', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(12.7)).toBe('12')
    expect(formatNumber(999)).toBe('999')
  })
  it('suffixes with 2 decimals', () => {
    expect(formatNumber(1234)).toBe('1.23K')
    expect(formatNumber(1_000_000)).toBe('1.00M')
    expect(formatNumber(1.5e12)).toBe('1.50T')
  })
  it('scientific past the last suffix (Dc = 1e33)', () => {
    expect(formatNumber(1.234e33)).toBe('1.23Dc')
    expect(formatNumber(1e36)).toBe('1.00e36')
  })
  it('negatives and non-finite', () => {
    expect(formatNumber(-1234)).toBe('-1.23K')
    expect(formatNumber(Infinity)).toBe('∞')
    expect(formatNumber(NaN)).toBe('0')
  })
})

describe('formatNumber float edge', () => {
  it('does not truncate 1150 to 1.14K', () => {
    expect(formatNumber(1150)).toBe('1.15K')
  })
})
