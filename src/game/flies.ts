import { MATERIALS, PATTERNS } from './data'
import { spend } from './economy'
import { licenseEffects } from './license'
import type { GameState, Recipe } from './state'

export interface FlyStats { maxDepth: number; wear: number; oddsBonus: number; sizeBonus: number; tieCost: number }

export function flyStats(state: GameState, recipe: Recipe): FlyStats {
  const p = PATTERNS.find(x => x.id === recipe.patternId)!
  const st: FlyStats = { maxDepth: p.maxDepth, wear: p.wear + licenseEffects(state.licenseLevels).extraWear, oddsBonus: p.oddsBonus, sizeBonus: 0, tieCost: p.tieCost }
  for (const id of recipe.materialIds) {
    const m = MATERIALS.find(x => x.id === id)!
    st.maxDepth += m.depthBonus
    st.wear += m.wearBonus
    st.oddsBonus += m.oddsBonus
    st.sizeBonus += m.sizeBonus
    st.tieCost += m.tieCost
  }
  return st
}

export function basicRecipe(): Recipe {
  return { patternId: PATTERNS[0].id, materialIds: [] }
}

export function tieFly(state: GameState, recipe: Recipe = state.recipe): boolean {
  const st = flyStats(state, recipe)
  if (!spend(state, st.tieCost)) return false
  state.flyBox.push({ patternId: recipe.patternId, materialIds: [...recipe.materialIds], wearLeft: st.wear })
  return true
}
