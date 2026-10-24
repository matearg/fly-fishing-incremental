import { CHUM } from '../data'
import { isRarePlus, placeSpecies } from '../fishing/catch'
import { reachDepth } from '../fishing/flies'
import { price, spend } from './economy'
import type { GameState } from '../state'

// A bucket is only worth throwing when the player's fly (on the line, else the recipe) reaches a rare-or-better fish here.
export function chumReach(state: GameState): boolean {
  const depth = reachDepth(state, state.anglers[0].fly ?? state.recipe)
  return placeSpecies(state.location, state.licenseSpecies).some(s => isRarePlus(s.tier) && s.depth <= depth)
}

export function chumPrice(state: GameState): number {
  return price(state, CHUM.cost[state.location])
}

export function throwChum(state: GameState): boolean {
  if (state.chumMs > 0 || !chumReach(state) || !spend(state, chumPrice(state))) return false
  state.chumMs = CHUM.ms
  return true
}
