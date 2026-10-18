import { JUNK, LOCATIONS, SIZE, SPECIES, TIERS, type LocationId, type SpeciesDef } from './data'
import { flyStats } from './flies'
import { licenseEffects } from './license'
import type { CatchItem, Fly, GameState } from './state'

// The species at a place; licence species only once bought.
export function placeSpecies(location: LocationId, licensed: string[]): SpeciesDef[] {
  return SPECIES.filter(s => s.location === location && (!s.licenseCost || licensed.includes(s.id)))
}

// Depth is a ladder: the fly can catch anything from the surface down to its max depth.
export function rollCatch(state: GameState, fly: Fly, rand: () => number): Omit<CatchItem, 'id'> {
  const loc = LOCATIONS.find(l => l.id === state.location)!
  const st = flyStats(state, fly)
  const depth = Math.min(st.maxDepth, loc.maxDepth)
  const fish = placeSpecies(loc.id, state.licenseSpecies).filter(s => s.depth <= depth)
  const options = [
    ...fish.map(s => ({ w: s.weight * (1 + st.oddsBonus) ** TIERS.indexOf(s.tier), fish: s, junk: null })),
    ...JUNK.map(j => ({ w: j.weight * loc.junkWeight, fish: null, junk: j })),
  ]
  let r = rand() * options.reduce((a, o) => a + o.w, 0)
  const pick = options.find(o => (r -= o.w) < 0) ?? options[options.length - 1]
  if (pick.junk) return { kind: 'junk', defId: pick.junk.id, value: pick.junk.value, size: 1 }
  const size = 1 + rand() * (SIZE.spread + st.sizeBonus)
  return { kind: 'fish', defId: pick.fish!.id, value: pick.fish!.baseValue * size * licenseEffects(state.licenseLevels).valueMult, size }
}
