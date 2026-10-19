import { JUNK, LOCATIONS, RODS, SIZE, SPECIES, TIERS, type LocationId, type RodDef, type SpeciesDef } from '../data'
import { flyStats } from './flies'
import { licenseEffects } from '../progress/license'
import type { CatchItem, Fly, GameState } from '../state'

// The species at a place; licence species only once bought.
export function placeSpecies(location: LocationId, licensed: string[]): SpeciesDef[] {
  return SPECIES.filter(s => s.location === location && (!s.licenseCost || licensed.includes(s.id)))
}

// How likely a species is, before junk: the fly's odds bonus compounds once per tier above common.
export function speciesWeight(s: SpeciesDef, oddsBonus: number): number {
  return s.weight * (1 + oddsBonus) ** TIERS.indexOf(s.tier)
}

// Depth is a ladder: the fly can catch anything from the surface down to its max depth.
// The rod adds its bonus to the value of fish of its tiers; size, and so the release bonus, stays the same.
export function rollCatch(state: GameState, fly: Fly, rand: () => number, rod: RodDef = RODS[0]): Omit<CatchItem, 'id'> {
  const loc = LOCATIONS.find(l => l.id === state.location)!
  const st = flyStats(state, fly)
  const depth = Math.min(st.maxDepth, loc.maxDepth)
  const fish = placeSpecies(loc.id, state.licenseSpecies).filter(s => s.depth <= depth)
  const options = [
    ...fish.map(s => ({ w: speciesWeight(s, st.oddsBonus), fish: s, junk: null })),
    ...JUNK.map(j => ({ w: j.weight * loc.junkWeight, fish: null, junk: j })),
  ]
  let r = rand() * options.reduce((a, o) => a + o.w, 0)
  const pick = options.find(o => (r -= o.w) < 0) ?? options[options.length - 1]
  if (pick.junk) return { kind: 'junk', defId: pick.junk.id, value: pick.junk.value, size: 1 }
  const size = 1 + rand() * (SIZE.spread + st.sizeBonus)
  const rodMult = rod.tiers.includes(pick.fish!.tier) ? 1 + rod.bonus : 1
  return { kind: 'fish', defId: pick.fish!.id, value: pick.fish!.baseValue * size * licenseEffects(state.licenseLevels).valueMult * rodMult, size }
}
