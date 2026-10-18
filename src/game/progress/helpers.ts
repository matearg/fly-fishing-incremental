import { HELPERS } from '../data'
import { spend } from './economy'
import { licenseEffects } from './license'
import type { GameState } from '../state'

export type HelperKind = 'angler' | 'bench' | 'bulkTrash' | 'sorter' | 'buyer' | 'release'

// null = a one-off helper that is already owned
export function helperCost(state: GameState, kind: HelperKind): number | null {
  const discount = 1 - licenseEffects(state.licenseLevels).helperDiscount
  switch (kind) {
    case 'angler': return HELPERS.angler.baseCost * HELPERS.angler.growth ** (state.anglers.length - 1) * discount
    case 'bench': return HELPERS.bench.baseCost * HELPERS.bench.growth ** state.bench * discount
    case 'bulkTrash': return state.bulkTrash ? null : HELPERS.bulkTrash.cost * discount
    case 'sorter': return state.sorter ? null : HELPERS.sorter.cost * discount
    case 'buyer': return state.buyer ? null : HELPERS.buyer.cost * discount
    case 'release': return state.release ? null : HELPERS.release.cost * discount
  }
}

export function buyHelper(state: GameState, kind: HelperKind): boolean {
  const cost = helperCost(state, kind)
  if (cost === null || !spend(state, cost)) return false
  if (kind === 'angler') state.anglers.push({ auto: true, phase: 'idle', timerMs: 0, fly: null, pending: null })
  else if (kind === 'bench') state.bench++
  else state[kind] = true
  return true
}

export function toggleBuyerPause(state: GameState): boolean {
  if (!state.buyer) return false
  state.buyerPaused = !state.buyerPaused
  return true
}
