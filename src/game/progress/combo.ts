import { COMBO } from '../data'
import type { GameState } from '../state'

export function comboMult(count: number): number {
  return 1 + COMBO.pctStep * Math.min(count - 1, COMBO.maxSteps)
}

// The player's fish: extends or restarts the streak and returns this fish's value multiplier.
export function noteCombo(state: GameState, defId: string): number {
  if (state.combo.defId === defId) state.combo.count++
  else state.combo = { defId, count: 1 }
  return comboMult(state.combo.count)
}
