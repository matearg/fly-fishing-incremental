import { RODS, WADERS, type RodDef } from '../data'
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
