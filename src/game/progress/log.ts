import { BOUNTY, SPECIES } from '../data'
import type { GameState } from '../state'

export function bountyOf(defId: string): number {
  return BOUNTY.mult * SPECIES.find(s => s.id === defId)!.baseValue
}

export function logSpecies(state: GameState, defId: string): boolean {
  if (state.speciesLog.includes(defId)) return false
  state.speciesLog.push(defId)
  return true
}

// The player's fish: a first non-legendary is logged and returns its bounty; legendaries are logged by mountTrophy.
export function logCatch(state: GameState, defId: string): number {
  if (SPECIES.find(s => s.id === defId)?.tier === 'legendary' || !logSpecies(state, defId)) return 0
  return bountyOf(defId)
}
