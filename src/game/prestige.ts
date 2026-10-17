import { LICENSE_UPGRADES, SEASON, SPECIES, type LicenseUpgradeId } from './data'
import { newGame, type GameState } from './state'

export function licensesForSeason(state: GameState): number {
  return Math.floor(Math.sqrt(state.seasonEarnings / SEASON.licenseDivisor))
}

export function canStartSeason(state: GameState): boolean {
  return state.seasonEarnings >= SEASON.minEarnings
}

// Returns a fresh state; the caller replaces its state with it.
export function startNewSeason(state: GameState): GameState {
  return newGame({ licenses: state.licenses + licensesForSeason(state), licenseLevels: state.licenseLevels, licenseSpecies: state.licenseSpecies })
}

// null = max level
export function licenseUpgradeCost(state: GameState, id: LicenseUpgradeId): number | null {
  return LICENSE_UPGRADES.find(u => u.id === id)!.costs[state.licenseLevels[id]] ?? null
}

export function buyLicenseUpgrade(state: GameState, id: LicenseUpgradeId): boolean {
  const cost = licenseUpgradeCost(state, id)
  if (cost === null || state.licenses < cost) return false
  state.licenses -= cost
  state.licenseLevels[id]++
  return true
}

export function buyLicenseSpecies(state: GameState, speciesId: string): boolean {
  const cost = SPECIES.find(s => s.id === speciesId)?.licenseCost
  if (!cost || state.licenseSpecies.includes(speciesId) || state.licenses < cost) return false
  state.licenses -= cost
  state.licenseSpecies.push(speciesId)
  return true
}
