import { LOCATIONS, MATERIALS, PATTERNS, type LocationId } from './data'
import type { GameState, Recipe } from './state'

export function spend(state: GameState, cost: number): boolean {
  if (state.money < cost) return false
  state.money -= cost
  return true
}

// Junk can make amount negative; money never drops below 0 and losses don't count against earnings.
export function earn(state: GameState, amount: number): void {
  state.money = Math.max(0, state.money + amount)
  state.seasonEarnings += Math.max(0, amount)
}

export function sellAll(state: GameState): number {
  const sum = state.basket.reduce((a, c) => a + c.value, 0)
  earn(state, sum)
  state.basket = []
  return sum
}

export function trash(state: GameState, catchId: number): boolean {
  const i = state.basket.findIndex(c => c.id === catchId)
  if (i < 0) return false
  state.basket.splice(i, 1)
  return true
}

function unlock(state: GameState, owned: string[], def: { id: string; unlockCost: number } | undefined): boolean {
  if (!def || owned.includes(def.id) || !spend(state, def.unlockCost)) return false
  owned.push(def.id)
  return true
}

export function unlockPattern(state: GameState, id: string): boolean {
  return unlock(state, state.unlockedPatterns, PATTERNS.find(p => p.id === id))
}

export function unlockMaterial(state: GameState, id: string): boolean {
  return unlock(state, state.unlockedMaterials, MATERIALS.find(m => m.id === id))
}

// Only the next locked location in LOCATIONS order can be bought.
export function unlockLocation(state: GameState, id: LocationId): boolean {
  const next = LOCATIONS.find(l => !state.unlockedLocations.includes(l.id))
  if (next?.id !== id) return false
  return unlock(state, state.unlockedLocations, next)
}

export function travel(state: GameState, id: LocationId): boolean {
  if (!state.unlockedLocations.includes(id)) return false
  state.location = id
  return true
}

export function setRecipe(state: GameState, recipe: Recipe): boolean {
  const ok = state.unlockedPatterns.includes(recipe.patternId)
    && recipe.materialIds.every(m => state.unlockedMaterials.includes(m))
    && new Set(recipe.materialIds).size === recipe.materialIds.length // no stacking the same material
  if (ok) state.recipe = { patternId: recipe.patternId, materialIds: [...recipe.materialIds] }
  return ok
}
