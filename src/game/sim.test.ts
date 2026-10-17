import { describe, it, expect } from 'vitest'
import { tick, castPlayer, reelPlayer } from './sim'
import { newGame, type GameState } from './state'
import { PATTERNS, TIMING } from './data'
import { seqRand } from './testutil'

const r = seqRand(0.1, 0.3, 0.5)
const run = (s: GameState, ms: number) => { for (let t = 0; t < ms; t += 100) tick(s, 100, r) }
const autoAngler = () => ({ auto: true, phase: 'idle' as const, timerMs: 0, fly: null })

describe('player', () => {
  it('broke with an empty box can still cast (never stuck)', () => {
    const s = newGame()
    expect(castPlayer(s, r)).toBe(true)
    expect(s.anglers[0].phase).toBe('waiting')
    expect(s.anglers[0].fly?.patternId).toBe(PATTERNS[0].id)
  })
  it('spam clicks while waiting do nothing', () => {
    const s = newGame()
    castPlayer(s, r)
    const before = structuredClone(s)
    expect(castPlayer(s, r)).toBe(false)
    expect(reelPlayer(s)).toBe(false)
    expect(s).toEqual(before)
  })
  it('cast → bite → reel → basket, wear down by 1', () => {
    const s = newGame()
    castPlayer(s, r)
    const wear = s.anglers[0].fly!.wearLeft
    run(s, TIMING.biteMaxMs + 100)
    expect(s.anglers[0].phase).toBe('bite')
    expect(reelPlayer(s)).toBe(true)
    expect(s.anglers[0].phase).toBe('reeling')
    run(s, TIMING.reelMs + 100)
    expect(s.basket).toHaveLength(1)
    expect(s.anglers[0].phase).toBe('idle')
    expect(s.anglers[0].fly!.wearLeft).toBe(wear - 1)
  })
  it('last wear breaks the fly', () => {
    const s = newGame()
    castPlayer(s, r)
    s.anglers[0].fly!.wearLeft = 1
    run(s, TIMING.biteMaxMs + 100)
    reelPlayer(s)
    run(s, TIMING.reelMs + 100)
    expect(s.anglers[0].fly).toBeNull()
  })
  it('player waits on a bite instead of auto-reeling', () => {
    const s = newGame()
    castPlayer(s, r)
    run(s, 30_000)
    expect(s.anglers[0].phase).toBe('bite')
    expect(s.basket).toHaveLength(0)
  })
})

describe('auto anglers', () => {
  it('idle without flies, fishes alone with one', () => {
    const s = newGame()
    s.anglers.push(autoAngler())
    run(s, 10_000)
    expect(s.anglers[1].phase).toBe('idle')
    expect(s.basket).toHaveLength(0)
    s.flyBox.push({ patternId: PATTERNS[0].id, materialIds: [], wearLeft: 1 })
    run(s, 10_000)
    expect(s.basket).toHaveLength(1)
  })
  it('a huge dt is clamped (no burst after sleep)', () => {
    const s = newGame()
    s.anglers.push(autoAngler())
    s.flyBox.push({ patternId: PATTERNS[0].id, materialIds: [], wearLeft: 99 })
    tick(s, 3_600_000, r)
    expect(s.basket.length).toBeLessThanOrEqual(1)
    expect(s.anglers[1].phase).toBe('waiting')
  })
})
