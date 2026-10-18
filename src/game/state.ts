import { LICENSE_UPGRADES, LOCATIONS, PATTERNS, type LicenseUpgradeId, type LocationId } from './data'
import { licenseEffects } from './progress/license'

export interface Fly { patternId: string; materialIds: string[]; wearLeft: number }
export type Phase = 'idle' | 'waiting' | 'bite' | 'reeling'
// pending: the catch picked at cast, for the place it was picked at; null when none is picked
export interface Angler { auto: boolean; phase: Phase; timerMs: number; fly: Fly | null; pending: Pending | null }
// size is 1 for junk
export interface CatchItem { id: number; kind: 'fish' | 'junk'; defId: string; value: number; size: number }
export type Pending = Omit<CatchItem, 'id'> & { location: LocationId }
export interface Recipe { patternId: string; materialIds: string[] }
export interface GameState {
  version: number; money: number; seasonEarnings: number
  location: LocationId; unlockedLocations: LocationId[]
  unlockedPatterns: string[]; unlockedMaterials: string[]; recipe: Recipe
  flyBox: Fly[]; anglers: Angler[] // anglers[0] is the player (auto: false)
  bench: number; bulkTrash: boolean; sorter: boolean; buyer: boolean; benchTimerMs: number; buyerTimerMs: number
  basket: CatchItem[]; nextCatchId: number
  licenses: number; licenseLevels: Record<LicenseUpgradeId, number>; licenseSpecies: string[]
}
export type Carry = Pick<GameState, 'licenses' | 'licenseLevels' | 'licenseSpecies'>

export const SAVE_VERSION = 1

export function newGame(carry?: Carry): GameState {
  const licenseLevels = carry?.licenseLevels ?? (Object.fromEntries(LICENSE_UPGRADES.map(u => [u.id, 0])) as Record<LicenseUpgradeId, number>)
  const fx = licenseEffects(licenseLevels)
  const unlockedLocations = LOCATIONS.slice(0, 1 + Math.min(fx.startLocation, LOCATIONS.length - 1)).map(l => l.id)
  return {
    version: SAVE_VERSION, money: 0, seasonEarnings: 0,
    location: unlockedLocations[unlockedLocations.length - 1], unlockedLocations,
    unlockedPatterns: PATTERNS.slice(0, 1 + fx.startPatterns).map(p => p.id), unlockedMaterials: [],
    recipe: { patternId: PATTERNS[0].id, materialIds: [] },
    flyBox: [], anglers: [{ auto: false, phase: 'idle', timerMs: 0, fly: null, pending: null }],
    bench: 0, bulkTrash: false, sorter: false, buyer: false, benchTimerMs: 0, buyerTimerMs: 0,
    basket: [], nextCatchId: 1,
    licenses: carry?.licenses ?? 0, licenseLevels: { ...licenseLevels }, licenseSpecies: [...(carry?.licenseSpecies ?? [])],
  }
}
