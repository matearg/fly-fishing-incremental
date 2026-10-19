import { LOCATIONS, RODS, WADERS, type LocationId, type RodDef } from '../data'
import { placeSpecies, speciesWeight } from '../fishing/catch'
import { flyStats } from '../fishing/flies'
import { price, spend } from './economy'
import type { GameState } from '../state'

// Buying a piece of gear puts it on right away.
function buy(state: GameState, owned: string[], def: { id: string; cost: number } | undefined): boolean {
  if (!def || owned.includes(def.id) || !spend(state, price(state, def.cost))) return false
  owned.push(def.id)
  return true
}

export function buyRod(state: GameState, id: string): boolean {
  return buy(state, state.rods, RODS.find(r => r.id === id)) && equipRod(state, id)
}

export function equipRod(state: GameState, id: string): boolean {
  if (!state.rods.includes(id)) return false
  state.rod = id
  return true
}

export function buyWaders(state: GameState, id: string): boolean {
  return buy(state, state.waders, WADERS.find(w => w.id === id)) && wearWaders(state, id)
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
  const depth = Math.min(st.maxDepth, LOCATIONS.find(l => l.id === state.location)!.maxDepth)
  const gain = (r: RodDef) => rodGain(r, state.location, depth, st.oddsBonus, state.licenseSpecies)
  return RODS.filter(r => state.rods.includes(r.id)).reduce((b, r) => gain(r) > gain(b) ? r : b).id
}
