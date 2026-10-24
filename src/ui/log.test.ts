import { describe, it, expect } from 'vitest'
import { logPlaces } from './log'
import { newGame } from '../game/state'
import { SPECIES } from '../game/data'

describe('species log list', () => {
  it('lists every place in order with logged over total', () => {
    const ps = logPlaces(newGame())
    expect(ps[0]).toMatchObject({ id: 'creek', logged: 0, total: 4, locked: false })
    expect(ps[0].rows.length).toBe(4)
    expect(ps[0].rows.every(r => !r.logged)).toBe(true)
    expect(ps.reduce((n, p) => n + p.total, 0)).toBe(SPECIES.length)
  })
  it('a locked place with nothing logged is locked with no rows', () => {
    expect(logPlaces(newGame())[1]).toMatchObject({ id: 'river', locked: true, rows: [] })
  })
  it('a locked place with a logged species lists its rows', () => {
    const s = newGame(); s.speciesLog = ['grayling']
    expect(logPlaces(s)[1]).toMatchObject({ id: 'river', locked: false, logged: 1 })
    expect(logPlaces(s)[1].rows.length).toBe(3)
  })
  it('marks legendary rows', () => {
    expect(logPlaces(newGame()).find(p => p.id === 'bigRiver')).toBeDefined()
    const s = newGame(); s.unlockedLocations.push('bigRiver')
    expect(logPlaces(s).find(p => p.id === 'bigRiver')!.rows.find(r => r.id === 'muskie')).toMatchObject({ legendary: true, logged: false })
  })
})
