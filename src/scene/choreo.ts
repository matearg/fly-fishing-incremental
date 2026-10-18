// Pure timing for the fishing scene's animations; the scene reads sim state and asks these what to draw.
import { SPECIES, type SpeciesDef } from '../game/data'
import type { Angler, GameState, Pending } from '../game/state'

export const APPROACH_MS = 2000 // the chosen fish's notice + swim to the fly, ending at the bite
export const NOTICE_SHARE = 0.4 // first part of the approach: stop and turn toward the fly
export const CAST_MS = 300 // rod swing at the start of a wait

export type ApproachStage = 'cruise' | 'notice' | 'swim'

// The approach lasts min(APPROACH_MS, waitMs) and ends at remainingMs = 0; k runs 0→1 within each stage.
export function approach(remainingMs: number, waitMs: number): { stage: ApproachStage; k: number } {
  const dur = Math.min(APPROACH_MS, waitMs)
  if (remainingMs > dur || dur <= 0) return { stage: remainingMs > 0 ? 'cruise' : 'swim', k: remainingMs > 0 ? 0 : 1 }
  const t = 1 - Math.max(0, remainingMs) / dur
  return t < NOTICE_SHARE ? { stage: 'notice', k: t / NOTICE_SHARE } : { stage: 'swim', k: (t - NOTICE_SHARE) / (1 - NOTICE_SHARE) }
}

export function castPose(waitMs: number, remainingMs: number): boolean {
  return waitMs - remainingMs < CAST_MS
}

// The species swimming at the current place (licence species only once bought).
export function schoolSpecies(state: GameState): SpeciesDef[] {
  return SPECIES.filter(s => s.location === state.location && (!s.licenseCost || state.licenseSpecies.includes(s.id)))
}

export function schoolKey(state: GameState): string {
  return `${state.location}:${schoolSpecies(state).map(s => s.id).join(',')}`
}

// What the scene remembers per visible angler: the catch it last saw, and the wait remaining when it appeared.
export interface Track { pending: Pending | null; waitMs: number }

// A new catch (a cast, or a re-pick after travel) restarts the approach within the wait that is left.
export function trackCatch(tr: Track, a: Angler | undefined): Track {
  const pending = a?.pending ?? null
  if (pending !== tr.pending) { tr.pending = pending; tr.waitMs = a?.timerMs ?? 0 }
  return tr
}
