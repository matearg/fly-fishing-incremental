import { rollCatch } from './catch'
import { BENCH_SPEEDUP, TIMING } from '../data'
import { sellAll } from '../progress/economy'
import { basicRecipe, tieFly } from './flies'
import type { Angler, GameState } from '../state'

function pick(state: GameState, a: Angler, rand: () => number): void {
  a.pending = { ...rollCatch(state, a.fly!, rand), location: state.location }
}

function startWaiting(state: GameState, a: Angler, rand: () => number): void {
  a.phase = 'waiting'
  pick(state, a, rand)
  a.timerMs = TIMING.biteMinMs + rand() * (TIMING.biteMaxMs - TIMING.biteMinMs)
}

function land(state: GameState, a: Angler, rand: () => number): void {
  // Fallback for an old save loaded mid-bite or mid-reel, before catches were picked at cast.
  const { location: _, ...c } = a.pending ?? { ...rollCatch(state, a.fly!, rand), location: state.location }
  a.pending = null
  if (!(state.sorter && c.kind === 'junk')) state.basket.push({ id: state.nextCatchId++, ...c })
  if (--a.fly!.wearLeft <= 0) a.fly = null
  a.phase = 'idle'
}

function stepAngler(state: GameState, a: Angler, dt: number, rand: () => number): void {
  switch (a.phase) {
    case 'idle':
      if (!a.auto) return // the player only moves via castPlayer
      a.fly ??= state.flyBox.shift() ?? null
      if (a.fly) startWaiting(state, a, rand)
      return
    case 'waiting':
      // Travel re-picks so the catch belongs to this place; also fills null from old saves.
      if (a.pending?.location !== state.location) pick(state, a, rand)
      if ((a.timerMs -= dt) <= 0) a.phase = 'bite'
      return
    case 'bite':
      if (a.auto) { a.phase = 'reeling'; a.timerMs = TIMING.reelMs }
      return
    case 'reeling':
      if ((a.timerMs -= dt) <= 0) land(state, a, rand)
  }
}

export function benchCooldownMs(state: GameState): number {
  return TIMING.benchTieMs * (1 - BENCH_SPEEDUP) ** (state.bench - 1)
}

export function tick(state: GameState, dtMs: number, rand: () => number): void {
  // Clamp so a hidden tab or laptop sleep can't produce a burst of catches.
  const dt = Math.min(dtMs, TIMING.maxTickMs)
  for (const a of state.anglers) stepAngler(state, a, dt, rand)
  // The box holds one fly per angler; the cooldown pauses while it's full.
  if (state.bench > 0 && state.flyBox.length < state.anglers.length && (state.benchTimerMs += dt) >= benchCooldownMs(state)) {
    state.benchTimerMs = 0
    tieFly(state) // an unaffordable tie is skipped silently
  }
  if (state.buyer && (state.buyerTimerMs += dt) >= TIMING.buyerIntervalMs) {
    state.buyerTimerMs -= TIMING.buyerIntervalMs
    sellAll(state)
  }
}

export function castPlayer(state: GameState, rand: () => number): boolean {
  const p = state.anglers[0]
  if (p.phase !== 'idle') return false
  if (!p.fly) {
    // Never stuck: box, then the recipe, then the free basic fly.
    if (!state.flyBox.length && !tieFly(state)) tieFly(state, basicRecipe())
    p.fly = state.flyBox.shift()!
  }
  startWaiting(state, p, rand)
  return true
}

export function reelPlayer(state: GameState): boolean {
  const p = state.anglers[0]
  if (p.phase !== 'bite') return false
  p.phase = 'reeling'
  p.timerMs = TIMING.reelMs
  return true
}
