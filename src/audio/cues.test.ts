import { describe, it, expect } from 'vitest'
import { anglerCues, cueFrame, panelCue, type CueFrame } from './cues'
import type { Pending, Phase } from '../game/state'

const fish = (defId: string, kind: 'fish' | 'junk' = 'fish'): Pending => ({ kind, defId, value: 1, size: 1, location: 'creek' })
const f = (phase: Phase, castMs: number, timerMs: number, pending: Pending | null = null): CueFrame => ({ phase, castMs, timerMs, pending })
// A waiting frame `since` ms into a 3000 ms cast.
const w = (since: number) => f('waiting', 3000, 3000 - since)

describe('anglerCues', () => {
  it('fires nothing without both frames', () => {
    expect(anglerCues(null, w(0))).toEqual([])
    expect(anglerCues(w(0), null)).toEqual([])
    expect(cueFrame(undefined, { pending: null, waitMs: 0, castMs: 0, lastMs: 0 })).toBeNull()
  })

  it('plays the cast as it happens', () => {
    expect(anglerCues(f('idle', 0, 0), w(0))).toEqual(['castBack'])
    expect(anglerCues(w(590), w(610))).toEqual(['castForward'])
    expect(anglerCues(w(990), w(1010))).toEqual(['plip'])
  })

  it('fires every threshold a frame crosses, once', () => {
    expect(anglerCues(w(500), w(1100))).toEqual(['castForward', 'plip'])
    expect(anglerCues(w(0), w(1500))).toEqual(['castForward', 'plip'])
    expect(anglerCues(w(700), w(710))).toEqual([])
  })

  it('blips once on a bite', () => {
    expect(anglerCues(w(2000), f('bite', 3000, 0))).toEqual(['bite'])
    expect(anglerCues(f('bite', 3000, 0), f('bite', 3000, 0))).toEqual([])
  })

  it('reels', () => {
    expect(anglerCues(f('bite', 3000, 0), f('reeling', 3000, 800))).toEqual(['reel'])
    expect(anglerCues(w(2000), f('reeling', 3000, 800))).toEqual(['bite', 'reel'])
  })

  it('splashes and plays the catch when it lands', () => {
    expect(anglerCues(f('reeling', 3000, 100, fish('dace')), f('idle', 3000, 0))).toEqual(['splashOut', 'catch'])
    expect(anglerCues(f('reeling', 3000, 100, fish('boot', 'junk')), f('idle', 3000, 0))).toEqual(['splashOut', 'junk'])
    expect(anglerCues(f('reeling', 3000, 100, fish('brownTrout')), f('idle', 3000, 0))).toEqual(['splashOut', 'catchBig'])
  })

  it('lands and recasts in one frame', () => {
    expect(anglerCues(f('reeling', 3000, 100, fish('dace')), f('waiting', 2000, 1990))).toEqual(['splashOut', 'catch', 'castBack'])
  })
})

describe('panelCue', () => {
  it('rings purchases and sales', () => {
    expect(panelCue('hire', true)).toBe('buy')
    expect(panelCue('hire', false)).toBe('nope')
    expect(panelCue('sell', 12)).toBe('sell')
    expect(panelCue('sell', 0)).toBe('select')
    expect(panelCue('travel', true)).toBe('select')
  })
  it('rings gear purchases, and equipping is a select', () => {
    expect(panelCue('buyRod', true)).toBe('buy')
    expect(panelCue('buyWaders', false)).toBe('nope')
    expect(panelCue('equipRod', true)).toBe('select')
    expect(panelCue('wearWaders', true)).toBe('select')
  })
})
