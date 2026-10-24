import { describe, it, expect } from 'vitest'
import { comboMult, noteCombo } from './combo'
import { newGame } from '../state'

describe('combo', () => {
  it('comboMult: ×1 for the first fish, +pctStep each, capped at maxSteps', () => {
    expect(comboMult(1)).toBe(1)
    expect(comboMult(2)).toBeCloseTo(1.1)
    expect(comboMult(11)).toBeCloseTo(2)
    expect(comboMult(30)).toBeCloseTo(2)
  })
  it('noteCombo extends a same-species run and restarts on another species', () => {
    const s = newGame()
    expect([noteCombo(s, 'dace'), noteCombo(s, 'dace')]).toEqual([1, comboMult(2)])
    expect(s.combo).toEqual({ defId: 'dace', count: 2 })
    expect(noteCombo(s, 'brookTrout')).toBe(1)
    expect(s.combo).toEqual({ defId: 'brookTrout', count: 1 })
  })
})
