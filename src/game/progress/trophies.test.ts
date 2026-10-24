import { describe, it, expect } from 'vitest'
import { LEGENDARY_IDS, mountTrophy, trophyMult } from './trophies'
import { newGame } from '../state'
import { SPECIES, TROPHY } from '../data'

describe('trophies', () => {
  it('LEGENDARY_IDS lists every legendary species', () => {
    expect([...LEGENDARY_IDS].sort()).toEqual(['arcticChar', 'ghostSturgeon', 'lakeSturgeon', 'muskie', 'tigerTrout'])
  })
  it('mounts only with the Taxidermist, only legendaries, once per species', () => {
    const s = newGame()
    expect(mountTrophy(s, 'muskie')).toBe(false)
    s.taxidermist = true
    expect(mountTrophy(s, 'muskie')).toBe(true)
    expect(mountTrophy(s, 'muskie')).toBe(false)
    expect(mountTrophy(s, SPECIES.find(d => d.tier === 'rare')!.id)).toBe(false)
    expect(s.trophies).toEqual(['muskie'])
  })
  it('a mount logs the legendary, with no bounty', () => {
    const s = newGame(); s.taxidermist = true
    mountTrophy(s, 'muskie')
    expect([s.speciesLog, s.money]).toEqual([['muskie'], 0])
    s.trophies = [] // a new season
    mountTrophy(s, 'muskie')
    expect(s.speciesLog).toEqual(['muskie'])
  })
  it('trophyMult adds pctEach per trophy', () => {
    const s = newGame(); s.trophies = ['muskie', 'arcticChar']
    expect(trophyMult(s)).toBeCloseTo(1 + 2 * TROPHY.pctEach)
  })
})
