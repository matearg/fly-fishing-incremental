import { LOCATIONS, SPECIES, type LocationId } from '../game/data'
import type { GameState } from '../game/state'

export interface LogPlace {
  id: LocationId; name: string; logged: number; total: number; locked: boolean
  rows: { id: string; logged: boolean; legendary: boolean }[] // empty when locked
}

// The panel's species log, place by place. A place locked this season still lists its rows once anything there is logged.
export function logPlaces(state: GameState): LogPlace[] {
  return LOCATIONS.map(l => {
    const rows = SPECIES.filter(s => s.location === l.id).map(s => ({ id: s.id, logged: state.speciesLog.includes(s.id), legendary: s.tier === 'legendary' }))
    const logged = rows.filter(r => r.logged).length
    const locked = !state.unlockedLocations.includes(l.id) && logged === 0
    return { id: l.id, name: l.name, logged, total: rows.length, locked, rows: locked ? [] : rows }
  })
}
