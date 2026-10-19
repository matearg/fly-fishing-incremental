import { JUNK, LOCATIONS, MATERIALS, PATTERNS, RELEASE, RODS, SPECIES, WADERS } from './data'
import { basicRecipe } from './fishing/flies'
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
  s.rods = s.rods.filter(id => has(RODS, id))
  if (!s.rods.includes(RODS[0].id)) s.rods.unshift(RODS[0].id)
  if (!s.rods.includes(s.rod)) s.rod = RODS[0].id
  s.waders = s.waders.filter(id => has(WADERS, id))
  if (!s.waders.includes(WADERS[0].id)) s.waders.unshift(WADERS[0].id)
  if (!s.waders.includes(s.wearing)) s.wearing = WADERS[0].id
  s.licenseSpecies = s.licenseSpecies.filter(id => has(SPECIES, id))
  if (!validRecipe(s.recipe)) s.recipe = basicRecipe()
  s.releaseBonus = Number.isFinite(s.releaseBonus) ? Math.min(RELEASE.cap, Math.max(0, s.releaseBonus)) : 0
  for (const k of ['chumMs', 'hatchMs', 'nextHatchMs'] as const) if (!(Number.isFinite(s[k]) && s[k] >= 0)) s[k] = d[k]
  s.flyBox = s.flyBox.filter((f: Fly) => validRecipe(f))
  for (const a of s.anglers) {
    if (a.fly && !validRecipe(a.fly)) { a.fly = null; a.phase = 'idle'; a.pending = null }
    a.pending ??= null
    if (!a.fly && a.phase !== 'idle') { a.phase = 'idle'; a.pending = null }
    if (a.pending && !has(a.pending.kind === 'fish' ? SPECIES : JUNK, a.pending.defId)) a.pending = null
  }
  return s
}

// Anything missing, corrupt or from another version is not a save.
export function parseSave(raw: string | null): GameState | null {
  try {
    const s = JSON.parse(raw ?? 'null')
    const ok = s?.version === SAVE_VERSION && Number.isFinite(s.money)
      && Array.isArray(s.anglers) && s.anglers.length > 0 && Array.isArray(s.basket) && Array.isArray(s.flyBox)
    return ok ? sanitize(s) : null
  } catch {
    return null
  }
}

// A bad save starts a fresh season instead of crashing.
export function deserialize(raw: string | null): GameState {
  return parseSave(raw) ?? newGame()
}

export interface SaveStore { read(): string | null; write(raw: string): void }

// Storage can throw (private mode, quota, blocked site data).
export const localStore: SaveStore = {
  read() { try { return localStorage.getItem(SAVE_KEY) } catch { return null } },
  write(raw) { try { localStorage.setItem(SAVE_KEY, raw) } catch { /* nothing to do; next autosave retries */ } },
}
