import { LOCATIONS, MATERIALS, PATTERNS, RELEASE, SPECIES, WADERS, type LocationId } from '../data'
import type { CatchItem, GameState, Recipe } from '../state'
import { trophyMult } from './trophies'

export function spend(state: GameState, cost: number): boolean {
  if (state.money < cost) return false
  state.money -= cost
  return true
}

// The best pair of waders owned sets the discount, whichever pair is worn.
export function wadersDiscount(state: GameState): number {
  return Math.max(0, ...WADERS.filter(w => state.waders.includes(w.id)).map(w => w.discount))
}

// What a money purchase from the panel costs; the panel shows this, never its own math.
// Whole dollars, so the panel's number is exactly what is charged.
export function price(state: GameState, base: number): number {
  return Math.round(base * (1 - wadersDiscount(state)))
}

// Junk can make amount negative; money never drops below 0 and losses don't count against earnings.
export function earn(state: GameState, amount: number): void {
  state.money = Math.max(0, state.money + amount)
  state.seasonEarnings += Math.max(0, amount)
}

// withBonus: only the player's own Sell all pays the release bonus. It and the trophies multiply fish, never junk.
export function saleValue(state: GameState, withBonus = false): number {
  const fishMult = (1 + (withBonus ? state.releaseBonus : 0)) * trophyMult(state)
  return state.basket.reduce((a, c) => a + c.value * (c.kind === 'fish' ? fishMult : 1), 0)
}

// A sale with no fish in it leaves the bonus waiting.
export function sellAll(state: GameState, withBonus = false): number {
  const sum = saleValue(state, withBonus)
  if (withBonus && state.basket.some(c => c.kind === 'fish')) state.releaseBonus = 0
  earn(state, sum)
  state.basket = []
  return sum
}

// What one trashed catch adds to the release bonus, measured by price against its own place's cheapest fish.
export function releaseBonusOf(c: CatchItem): number {
  const def = c.kind === 'fish' ? SPECIES.find(d => d.id === c.defId) : undefined
  if (!def) return 0
  const cheapest = Math.min(...SPECIES.filter(d => d.location === def.location).map(d => d.baseValue))
  return RELEASE.pctPerUnit * def.baseValue * c.size / cheapest
}

function release(state: GameState, gone: CatchItem[]): void {
  if (state.release) state.releaseBonus = Math.min(RELEASE.cap, gone.reduce((a, c) => a + releaseBonusOf(c), state.releaseBonus))
}

export function trash(state: GameState, catchId: number): boolean {
  const i = state.basket.findIndex(c => c.id === catchId)
  if (i < 0) return false
  release(state, state.basket.splice(i, 1))
  return true
}

// Bulk trash throws away every catch of one kind and species at once.
export function trashStack(state: GameState, kind: CatchItem['kind'], defId: string): boolean {
  if (!state.bulkTrash) return false
  const kept: CatchItem[] = [], gone: CatchItem[] = []
  for (const c of state.basket) (c.kind === kind && c.defId === defId ? gone : kept).push(c)
  if (!gone.length) return false
  release(state, gone)
  state.basket = kept
  return true
}

// Buys `id` into `owned` once, at the discounted price.
export function purchase(state: GameState, owned: string[], id: string, base: number): boolean {
  if (owned.includes(id) || !spend(state, price(state, base))) return false
  owned.push(id)
  return true
}

export function unlockPattern(state: GameState, id: string): boolean {
  const p = PATTERNS.find(p => p.id === id)
  return !!p && purchase(state, state.unlockedPatterns, p.id, p.unlockCost)
}

export function unlockMaterial(state: GameState, id: string): boolean {
  const m = MATERIALS.find(m => m.id === id)
  return !!m && purchase(state, state.unlockedMaterials, m.id, m.unlockCost)
}

// Only the next locked location in LOCATIONS order can be bought.
export function unlockLocation(state: GameState, id: LocationId): boolean {
  const next = LOCATIONS.find(l => !state.unlockedLocations.includes(l.id))
  return next?.id === id && purchase(state, state.unlockedLocations, next.id, next.unlockCost)
}

export function travel(state: GameState, id: LocationId): boolean {
  if (!state.unlockedLocations.includes(id)) return false
  state.location = id
  state.chumMs = 0; state.hatchMs = 0 // both belong to the water left behind
  return true
}

export function setRecipe(state: GameState, recipe: Recipe): boolean {
  const ok = state.unlockedPatterns.includes(recipe.patternId)
    && recipe.materialIds.every(m => state.unlockedMaterials.includes(m))
    && new Set(recipe.materialIds).size === recipe.materialIds.length // no stacking the same material
  if (ok) state.recipe = { patternId: recipe.patternId, materialIds: [...recipe.materialIds] }
  return ok
}
