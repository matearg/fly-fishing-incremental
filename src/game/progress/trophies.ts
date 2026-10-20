import { SPECIES, TROPHY } from '../data'
import type { GameState } from '../state'

export const LEGENDARY_IDS = SPECIES.filter(s => s.tier === 'legendary').map(s => s.id)

// The Taxidermist mounts the first of each legendary species landed after it's hired.
export function mountTrophy(state: GameState, defId: string): boolean {
  if (!state.taxidermist || !LEGENDARY_IDS.includes(defId) || state.trophies.includes(defId)) return false
  state.trophies.push(defId)
  return true
}

export function trophyMult(state: GameState): number {
  return 1 + state.trophies.length * TROPHY.pctEach
}
