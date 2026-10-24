import { RODS, WADERS, type LocationId, type RodDef } from '../data'
import { placeSpecies, speciesWeight } from '../fishing/catch'
import { flyStats, reachDepth } from '../fishing/flies'
import { purchase } from './economy'
import type { GameState } from '../state'

// Buying a piece of gear puts it on right away.
export function buyRod(state: GameState, id: string): boolean {
  const def = RODS.find(r => r.id === id)
  return !!def && purchase(state, state.rods, def.id, def.cost) && equipRod(state, id)
}

export function equipRod(state: GameState, id: string): boolean {
  if (!state.rods.includes(id)) return false
  state.rod = id
  return true
}

export function buyWaders(state: GameState, id: string): boolean {
  const def = WADERS.find(w => w.id === id)
  return !!def && purchase(state, state.waders, def.id, def.cost) && wearWaders(state, id)
}

export function wearWaders(state: GameState, id: string): boolean {
  if (!state.waders.includes(id)) return false
  state.wearing = id
  return true
}

export function equippedRod(state: GameState): RodDef {
  return RODS.find(r => r.id === state.rod) ?? RODS[0]
}

// What a rod adds per catch at a place, unnormalized: only for comparing rods with each other.
export function rodGain(rod: RodDef, location: LocationId, maxDepth: number, oddsBonus: number, licensed: string[]): number {
  return placeSpecies(location, licensed).filter(s => s.depth <= maxDepth && rod.tiers.includes(s.tier))
    .reduce((a, s) => a + speciesWeight(s, oddsBonus) * s.baseValue * rod.bonus, 0)
}

// The owned rod that pays most for the player's fly here; ties go to the earlier rod.
export function bestRod(state: GameState): string {
  const st = flyStats(state, state.recipe)
  const depth = reachDepth(state, state.recipe)
  const gain = (r: RodDef) => rodGain(r, state.location, depth, st.oddsBonus, state.licenseSpecies)
  return RODS.filter(r => state.rods.includes(r.id)).reduce((b, r) => gain(r) > gain(b) ? r : b).id
}
