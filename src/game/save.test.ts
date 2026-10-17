import { describe, it, expect } from 'vitest'
import { serialize, deserialize } from './save'
import { newGame } from './state'
import { buyHelper } from './helpers'
import { tieFly } from './flies'

describe('save', () => {
  it('round-trips a mid-game state', () => {
    const s = newGame()
    s.money = 1e6
    buyHelper(s, 'angler'); buyHelper(s, 'bench'); buyHelper(s, 'sorter')
    tieFly(s)
    s.basket = [{ id: 1, kind: 'junk', defId: 'boot', value: -2, size: 1 }]
    s.licenses = 4; s.licenseLevels.valueMult = 2; s.licenseSpecies = ['tigerTrout']
    expect(deserialize(serialize(s))).toEqual(s)
  })
  it.each([
    ['null', null],
    ['bad JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: 999 })],
    ['non-number money', JSON.stringify({ version: 1, money: 'lots' })],
    ['JSON null', 'null'],
  ])('corrupt save (%s) → fresh game', (_, raw) => {
    expect(deserialize(raw)).toEqual(newGame())
  })
})
