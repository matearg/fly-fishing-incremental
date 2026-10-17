import { rollCatch } from './catch'
import { TIMING } from './data'
import { basicRecipe, tieFly } from './flies'
import type { Angler, GameState } from './state'

function startWaiting(a: Angler, rand: () => number): void {
  a.phase = 'waiting'
  a.timerMs = TIMING.biteMinMs + rand() * (TIMING.biteMaxMs - TIMING.biteMinMs)
}

function land(state: GameState, a: Angler, rand: () => number): void {
  state.basket.push({ id: state.nextCatchId++, ...rollCatch(state, a.fly!, rand) })
  if (--a.fly!.wearLeft <= 0) a.fly = null
  a.phase = 'idle'
}

function stepAngler(state: GameState, a: Angler, dt: number, rand: () => number): void {
  switch (a.phase) {
    case 'idle':
      if (!a.auto) return // the player only moves via castPlayer
      a.fly ??= state.flyBox.shift() ?? null
      if (a.fly) startWaiting(a, rand)
      return
    case 'waiting':
      if ((a.timerMs -= dt) <= 0) a.phase = 'bite'
      return
    case 'bite':
      if (a.auto) { a.phase = 'reeling'; a.timerMs = TIMING.reelMs }
      return
    case 'reeling':
      if ((a.timerMs -= dt) <= 0) land(state, a, rand)
  }
}

export function tick(state: GameState, dtMs: number, rand: () => number): void {
  // Clamp so a hidden tab or laptop sleep can't produce a burst of catches.
  const dt = Math.min(dtMs, TIMING.maxTickMs)
  for (const a of state.anglers) stepAngler(state, a, dt, rand)
}

export function castPlayer(state: GameState, rand: () => number): boolean {
  const p = state.anglers[0]
  if (p.phase !== 'idle') return false
  if (!p.fly) {
    // Never stuck: box, then the recipe, then the free basic fly.
    if (!state.flyBox.length && !tieFly(state)) tieFly(state, basicRecipe())
    p.fly = state.flyBox.shift()!
  }
  startWaiting(p, rand)
  return true
}

export function reelPlayer(state: GameState): boolean {
  const p = state.anglers[0]
  if (p.phase !== 'bite') return false
  p.phase = 'reeling'
  p.timerMs = TIMING.reelMs
  return true
}
