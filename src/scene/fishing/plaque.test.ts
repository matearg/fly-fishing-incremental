import { describe, it, expect } from 'vitest'
import { newPlaqueQueue, notePlaques, plaqueFrame, resumePlaques, PLAQUE_IN_MS, PLAQUE_MS, PLAQUE_OUT_MS } from './plaque'

describe('plaque queue', () => {
  it('a reset marks existing trophies as seen', () => {
    const q = newPlaqueQueue(['muskie'])
    expect(notePlaques(q, ['muskie'])).toEqual([])
    expect(plaqueFrame(q, 0)).toBeNull()
  })
  it('a new trophy starts once, drops in, holds and fades out', () => {
    const q = newPlaqueQueue([])
    expect(notePlaques(q, ['muskie'])).toEqual(['muskie'])
    expect(plaqueFrame(q, 1000)).toMatchObject({ id: 'muskie', started: true, alpha: 1 })
    expect(plaqueFrame(q, 1000)!.dy).toBeLessThan(0)
    expect(plaqueFrame(q, 1000 + PLAQUE_IN_MS)).toMatchObject({ started: false, dy: 0, alpha: 1 })
    expect(plaqueFrame(q, 1000 + PLAQUE_MS - PLAQUE_OUT_MS / 2)!.alpha).toBeCloseTo(0.5, 1)
    expect(plaqueFrame(q, 1000 + PLAQUE_MS)).toBeNull()
  })
  it('queues a second mount behind the first', () => {
    const q = newPlaqueQueue([])
    notePlaques(q, ['muskie', 'arcticChar'])
    plaqueFrame(q, 0)
    expect(plaqueFrame(q, PLAQUE_MS - 1)!.id).toBe('muskie')
    plaqueFrame(q, PLAQUE_MS)
    expect(plaqueFrame(q, PLAQUE_MS + 1)).toMatchObject({ id: 'arcticChar', started: true })
  })
  it('notes each new trophy once', () => {
    const q = newPlaqueQueue([])
    notePlaques(q, ['muskie'])
    expect(notePlaques(q, ['muskie'])).toEqual([])
    expect(notePlaques(q, ['muskie', 'arcticChar'])).toEqual(['arcticChar'])
  })
  it('a reload or a wake mid-plaque shows it again from the start', () => {
    const q = newPlaqueQueue([]); notePlaques(q, ['muskie', 'arcticChar']); plaqueFrame(q, 0)
    const r = resumePlaques(q, ['muskie', 'arcticChar'])
    expect(plaqueFrame(r, 9000)).toMatchObject({ id: 'muskie', started: true })
    expect(notePlaques(r, ['muskie', 'arcticChar'])).toEqual([])
  })
  it('resuming never pops trophies the adopted save already had', () => {
    const q = newPlaqueQueue([]); notePlaques(q, ['muskie'])
    const r = resumePlaques(q, ['muskie', 'arcticChar', 'lakeSturgeon'])
    expect(notePlaques(r, ['muskie', 'arcticChar', 'lakeSturgeon'])).toEqual([])
    expect(plaqueFrame(r, 0)!.id).toBe('muskie')
    plaqueFrame(r, PLAQUE_MS)
    expect(plaqueFrame(r, PLAQUE_MS + 1)).toBeNull()
  })
  it('a save without the queued trophies (New Season) drops them', () => {
    const q = newPlaqueQueue([]); notePlaques(q, ['muskie'])
    expect(plaqueFrame(resumePlaques(q, []), 0)).toBeNull()
    expect(plaqueFrame(resumePlaques(null, ['muskie']), 0)).toBeNull()
  })
})
