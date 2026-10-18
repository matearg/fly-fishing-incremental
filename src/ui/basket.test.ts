import { describe, it, expect } from 'vitest'
import type { CatchItem } from '../game/state'
import { keepOpen, stackBasket } from './basket'

const c = (id: number, kind: CatchItem['kind'], defId: string, value: number): CatchItem => ({ id, kind, defId, value, size: 1 })

describe('stackBasket', () => {
  it('groups by kind and defId in order of first catch', () => {
    const st = stackBasket([c(1, 'fish', 'dace', 2), c(2, 'junk', 'boot', -2), c(3, 'fish', 'dace', 3)])
    expect(st.map(s => s.key)).toEqual(['fish:dace', 'junk:boot'])
    expect(st[0].count).toBe(2)
    expect(st[0].total).toBe(5)
  })

  it('counts and totals a 120-catch stack, newest first', () => {
    const [st] = stackBasket(Array.from({ length: 120 }, (_, i) => c(i + 1, 'fish', 'dace', 2)))
    expect(st.count).toBe(120)
    expect(st.total).toBe(240)
    expect(st.items[0].id).toBe(120)
    expect(st.items.length).toBe(120)
  })

  it('sums negative junk values', () => {
    expect(stackBasket([c(1, 'junk', 'boot', -2), c(2, 'junk', 'boot', -2)])[0].total).toBe(-4)
  })

  it('empty basket gives no stacks', () => expect(stackBasket([])).toEqual([]))

  it('keepOpen drops a key whose stack is gone', () => {
    expect(keepOpen(stackBasket([]), 'fish:dace')).toBeNull()
    const st = stackBasket([c(1, 'fish', 'dace', 2)])
    expect(keepOpen(st, 'fish:dace')).toBe('fish:dace')
    expect(keepOpen(st, null)).toBeNull()
  })
})
