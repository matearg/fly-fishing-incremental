import { describe, it, expect } from 'vitest'
import { newPlaqueQueue, notePlaques, plaqueFrame, resumePlaques, PLAQUE_IN_MS, PLAQUE_MS, PLAQUE_OUT_MS } from './plaque'

const T = (trophies: string[], speciesLog: string[] = []) => ({ speciesLog, trophies })
const trophy = (id: string) => ({ kind: 'trophy', id })

describe('plaque queue', () => {
  it('a reset marks existing trophies as seen', () => {
    const q = newPlaqueQueue(T(['muskie']))
    expect(notePlaques(q, T(['muskie']))).toEqual([])
    expect(plaqueFrame(q, 0)).toBeNull()
  })
  it('a new trophy starts once, drops in, holds and fades out', () => {
    const q = newPlaqueQueue(T([]))
    expect(notePlaques(q, T(['muskie']))).toEqual([trophy('muskie')])
    expect(plaqueFrame(q, 1000)).toMatchObject({ popup: trophy('muskie'), started: true, alpha: 1 })
    expect(plaqueFrame(q, 1000)!.dy).toBeLessThan(0)
    expect(plaqueFrame(q, 1000 + PLAQUE_IN_MS)).toMatchObject({ started: false, dy: 0, alpha: 1 })
    expect(plaqueFrame(q, 1000 + PLAQUE_MS - PLAQUE_OUT_MS / 2)!.alpha).toBeCloseTo(0.5, 1)
    expect(plaqueFrame(q, 1000 + PLAQUE_MS)).toBeNull()
  })
  it('queues a second mount behind the first', () => {
    const q = newPlaqueQueue(T([]))
    notePlaques(q, T(['muskie', 'arcticChar']))
    plaqueFrame(q, 0)
    expect(plaqueFrame(q, PLAQUE_MS - 1)!.popup).toEqual(trophy('muskie'))
    plaqueFrame(q, PLAQUE_MS)
    expect(plaqueFrame(q, PLAQUE_MS + 1)).toMatchObject({ popup: trophy('arcticChar'), started: true })
  })
  it('notes each new trophy once', () => {
    const q = newPlaqueQueue(T([]))
    notePlaques(q, T(['muskie']))
    expect(notePlaques(q, T(['muskie']))).toEqual([])
    expect(notePlaques(q, T(['muskie', 'arcticChar']))).toEqual([trophy('arcticChar')])
  })
  it('a reload or a wake mid-plaque shows it again from the start', () => {
    const q = newPlaqueQueue(T([])); notePlaques(q, T(['muskie', 'arcticChar'])); plaqueFrame(q, 0)
    const r = resumePlaques(q, T(['muskie', 'arcticChar']))
    expect(plaqueFrame(r, 9000)).toMatchObject({ popup: trophy('muskie'), started: true })
    expect(notePlaques(r, T(['muskie', 'arcticChar']))).toEqual([])
  })
  it('resuming never pops trophies the adopted save already had', () => {
    const q = newPlaqueQueue(T([])); notePlaques(q, T(['muskie']))
    const r = resumePlaques(q, T(['muskie', 'arcticChar', 'lakeSturgeon']))
    expect(notePlaques(r, T(['muskie', 'arcticChar', 'lakeSturgeon']))).toEqual([])
    expect(plaqueFrame(r, 0)!.popup).toEqual(trophy('muskie'))
    plaqueFrame(r, PLAQUE_MS)
    expect(plaqueFrame(r, PLAQUE_MS + 1)).toBeNull()
  })
  it('a save without the queued trophies (New Season) drops them', () => {
    const q = newPlaqueQueue(T([])); notePlaques(q, T(['muskie']))
    expect(plaqueFrame(resumePlaques(q, T([])), 0)).toBeNull()
    expect(plaqueFrame(resumePlaques(null, T(['muskie'])), 0)).toBeNull()
  })
  it('a new log entry queues a log card', () => {
    const q = newPlaqueQueue(T([]))
    expect(notePlaques(q, T([], ['dace']))).toEqual([{ kind: 'log', id: 'dace' }])
  })
  it('a mounted legendary queues only its trophy plaque', () => {
    const q = newPlaqueQueue(T([]))
    expect(notePlaques(q, T(['muskie'], ['muskie']))).toEqual([trophy('muskie')])
  })
  it('log cards and plaques share one queue, in order', () => {
    const q = newPlaqueQueue(T([]))
    notePlaques(q, T([], ['dace']))
    notePlaques(q, T(['muskie'], ['dace', 'muskie']))
    expect(plaqueFrame(q, 0)!.popup).toEqual({ kind: 'log', id: 'dace' })
    plaqueFrame(q, PLAQUE_MS)
    expect(plaqueFrame(q, PLAQUE_MS + 1)!.popup).toEqual(trophy('muskie'))
  })
  it('entries already in the state never pop up', () => {
    const s = T(['muskie'], ['dace', 'muskie'])
    const q = newPlaqueQueue(s)
    expect(notePlaques(q, s)).toEqual([])
  })
  it('resume keeps a cut-short card only if the state still has it', () => {
    const q = newPlaqueQueue(T([])); notePlaques(q, T([], ['dace'])); plaqueFrame(q, 0)
    expect(plaqueFrame(resumePlaques(q, T([])), 0)).toBeNull()
    expect(plaqueFrame(resumePlaques(q, T([], ['dace'])), 0)!.popup).toEqual({ kind: 'log', id: 'dace' })
  })
})
