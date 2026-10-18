import { LOCATIONS, MATERIALS, PATTERNS, RELEASE, SPECIES, type LocationId } from '../data'
import type { CatchItem, GameState, Recipe } from '../state'

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

// withBonus: only the player's own Sell all pays and uses up the release bonus, and only on a sale with fish.
export function sellAll(state: GameState, withBonus = false): number {
  let sum = state.basket.reduce((a, c) => a + c.value, 0)
  if (withBonus && state.basket.some(c => c.kind === 'fish')) {
    sum += state.releaseBonus * state.basket.reduce((a, c) => a + (c.kind === 'fish' ? c.value : 0), 0)
    state.releaseBonus = 0
  }
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
  const kept = state.basket.filter(c => c.kind !== kind || c.defId !== defId)
  if (kept.length === state.basket.length) return false
  release(state, state.basket.filter(c => !kept.includes(c)))
  state.basket = kept
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
