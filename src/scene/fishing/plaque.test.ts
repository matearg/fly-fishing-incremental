import { describe, it, expect } from 'vitest'
import { newPlaqueQueue, notePlaques, plaqueFrame, PLAQUE_IN_MS, PLAQUE_MS, PLAQUE_OUT_MS } from './plaque'

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
})
