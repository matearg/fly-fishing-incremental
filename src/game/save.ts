import { LOCATIONS, MATERIALS, PATTERNS, SPECIES } from './data'
import { basicRecipe } from './flies'
import { newGame, SAVE_VERSION, type Fly, type GameState, type Recipe } from './state'

export const SAVE_KEY = 'flyfishing-save'

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

const has = (defs: { id: string }[], id: string) => defs.some(d => d.id === id)
const validRecipe = (r: Recipe | null | undefined) => !!r && has(PATTERNS, r.patternId) && Array.isArray(r.materialIds) && r.materialIds.every(m => has(MATERIALS, m))

// Fills fields added since the save was written and drops ids that data.ts no longer has,
// so rebalancing (renaming or removing content) never bricks an existing save.
function sanitize(raw: GameState): GameState {
  const d = newGame()
  const s: GameState = { ...d, ...raw, licenseLevels: { ...d.licenseLevels, ...raw.licenseLevels } }
  s.unlockedLocations = s.unlockedLocations.filter(id => has(LOCATIONS, id))
  if (!s.unlockedLocations.length) s.unlockedLocations = d.unlockedLocations
  if (!s.unlockedLocations.includes(s.location)) s.location = s.unlockedLocations[0]
  s.unlockedPatterns = s.unlockedPatterns.filter(id => has(PATTERNS, id))
  if (!s.unlockedPatterns.includes(PATTERNS[0].id)) s.unlockedPatterns.unshift(PATTERNS[0].id)
  s.unlockedMaterials = s.unlockedMaterials.filter(id => has(MATERIALS, id))
  s.licenseSpecies = s.licenseSpecies.filter(id => has(SPECIES, id))
  if (!validRecipe(s.recipe)) s.recipe = basicRecipe()
  s.flyBox = s.flyBox.filter((f: Fly) => validRecipe(f))
  for (const a of s.anglers) if (a.fly && !validRecipe(a.fly)) { a.fly = null; a.phase = 'idle' }
  return s
}

// Anything missing, corrupt or from another version starts a fresh season instead of crashing.
export function deserialize(raw: string | null): GameState {
  try {
    const s = JSON.parse(raw ?? 'null')
    const ok = s?.version === SAVE_VERSION && Number.isFinite(s.money)
      && Array.isArray(s.anglers) && s.anglers.length > 0 && Array.isArray(s.basket) && Array.isArray(s.flyBox)
    return ok ? sanitize(s) : newGame()
  } catch {
    return newGame()
  }
}

// Storage can throw (private mode, quota, blocked site data).
export function saveToStorage(state: GameState): void {
  try { localStorage.setItem(SAVE_KEY, serialize(state)) } catch { /* nothing to do; next autosave retries */ }
}

export function loadFromStorage(): GameState {
  try { return deserialize(localStorage.getItem(SAVE_KEY)) } catch { return newGame() }
}
