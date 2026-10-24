import { CHUM, LOCATIONS, TIERS } from '../data'
import { placeSpecies } from '../fishing/catch'
import { flyStats } from '../fishing/flies'
import { price, spend } from './economy'
import type { GameState } from '../state'

// A bucket is only worth throwing when the player's fly (on the line, else the recipe) reaches a rare-or-better fish here.
export function chumReach(state: GameState): boolean {
  const loc = LOCATIONS.find(l => l.id === state.location)!
  const depth = Math.min(flyStats(state, state.anglers[0].fly ?? state.recipe).maxDepth, loc.maxDepth)
  return placeSpecies(loc.id, state.licenseSpecies).some(s => TIERS.indexOf(s.tier) >= 2 && s.depth <= depth)
}

export function chumPrice(state: GameState): number {
  return price(state, CHUM.cost[state.location])
}

export function throwChum(state: GameState): boolean {
  if (state.chumMs > 0 || !chumReach(state) || !spend(state, chumPrice(state))) return false
  state.chumMs = CHUM.ms
  return true
}
