import { rollCatch } from './catch'
import { BENCH_SPEEDUP, GUIDE, HATCH, RODS, TIMING } from '../data'
import { earn, sellAll } from '../progress/economy'
import { equippedRod } from '../progress/gear'
import { logCatch } from '../progress/log'
import { mountTrophy } from '../progress/trophies'
import { basicRecipe, isDry, tieFly } from './flies'
import type { Angler, GameState } from '../state'

// Only the player fishes with the bought rods; helpers keep the plain one.
const rodOf = (state: GameState, a: Angler) => a.auto ? RODS[0] : equippedRod(state)

// The Guide only helps hired anglers.
export const castOdds = (state: GameState, a: Angler) => a.auto && state.guide ? GUIDE.oddsBonus : 0

function pick(state: GameState, a: Angler, rand: () => number): void {
  a.pending = { ...rollCatch(state, a.fly!, rand, rodOf(state, a), !a.auto && state.chumMs > 0, castOdds(state, a)), location: state.location }
}

function startWaiting(state: GameState, a: Angler, rand: () => number): void {
  a.phase = 'waiting'
  pick(state, a, rand)
  // The minimum stays at biteMinMs so a bite never comes before the cast animation lands the fly.
  const max = !a.auto && state.hatchMs > 0 && isDry(a.fly!) ? HATCH.waitMaxMs : TIMING.biteMaxMs
  a.timerMs = TIMING.biteMinMs + rand() * (max - TIMING.biteMinMs)
}

function land(state: GameState, a: Angler, rand: () => number): void {
  // Fallback for an old save loaded mid-bite or mid-reel, before catches were picked at cast.
  const { location: _, ...c } = a.pending ?? { ...rollCatch(state, a.fly!, rand, rodOf(state, a)), location: state.location }
  a.pending = null
  if (c.kind === 'fish' && !a.auto) earn(state, logCatch(state, c.defId))
  if (!(state.sorter && c.kind === 'junk')) state.basket.push({ id: state.nextCatchId++, ...c })
  if (c.kind === 'fish') mountTrophy(state, c.defId)
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

// The box holds one fly per angler; the bench cooldown pauses while it's full.
export function benchFull(state: GameState): boolean {
  return state.flyBox.length >= state.anglers.length
}

export function tick(state: GameState, dtMs: number, rand: () => number): void {
  // Clamp so a hidden tab or laptop sleep can't produce a burst of catches.
  const dt = Math.min(dtMs, TIMING.maxTickMs)
  for (const a of state.anglers) stepAngler(state, a, dt, rand)
  state.chumMs = Math.max(0, state.chumMs - dt)
  // The next gap is drawn as a hatch starts, so a hatch ended early (travel) still leaves a running countdown.
  if (state.hatchMs > 0) state.hatchMs = Math.max(0, state.hatchMs - dt)
  else if ((state.nextHatchMs -= dt) <= 0) {
    state.hatchMs = HATCH.ms
    state.nextHatchMs = HATCH.gapMinMs + rand() * (HATCH.gapMaxMs - HATCH.gapMinMs)
  }
  hatchSwap(state, rand)
  if (state.bench > 0 && !benchFull(state) && (state.benchTimerMs += dt) >= benchCooldownMs(state)) {
    state.benchTimerMs = 0
    tieFly(state) // an unaffordable tie is skipped silently
  }
  if (state.buyer && !state.buyerPaused && (state.buyerTimerMs += dt) >= TIMING.buyerIntervalMs) {
    state.buyerTimerMs -= TIMING.buyerIntervalMs
    sellAll(state)
  }
}

// During a hatch with a dry recipe, the player's non-dry fly goes back to the front of the box and a dry one goes on:
// the box's first dry fly, else one tied from the recipe, else the free basic fly. A fish already biting lands first.
export function hatchSwap(state: GameState, rand: () => number): boolean {
  const p = state.anglers[0]
  if (!(state.hatchMs > 0 && isDry(state.recipe) && p.fly && !isDry(p.fly) && (p.phase === 'idle' || p.phase === 'waiting'))) return false
  state.flyBox.unshift(p.fly)
  const i = state.flyBox.findIndex(isDry)
  if (i >= 0) p.fly = state.flyBox.splice(i, 1)[0]
  else {
    if (!tieFly(state)) tieFly(state, basicRecipe())
    p.fly = state.flyBox.pop()!
  }
  if (p.phase === 'waiting') startWaiting(state, p, rand) // re-pick for the new fly, with the hatch's wait
  return true
}

export function castPlayer(state: GameState, rand: () => number): boolean {
  const p = state.anglers[0]
  if (p.phase !== 'idle') return false
  if (!p.fly) {
    // Never stuck: box, then the recipe, then the free basic fly.
    if (!state.flyBox.length && !tieFly(state)) tieFly(state, basicRecipe())
    p.fly = state.flyBox.shift()!
  }
  hatchSwap(state, rand)
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
