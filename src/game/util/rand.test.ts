import { describe, it, expect } from 'vitest'
import { hashString } from './rand'

describe('hashString', () => {
  it('tells places apart and is stable', () => {
    expect(hashString('creek')).not.toBe(hashString('river'))
    expect(hashString('creek')).toBe(hashString('creek'))
  })
})
