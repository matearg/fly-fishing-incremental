// Pure timing for the fishing scene's animations; the scene reads sim state and asks these what to draw.
import { placeSpecies } from '../../game/fishing/catch'
import type { Angler, GameState, Pending } from '../../game/state'

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

export function schoolKey(state: GameState): string {
  return `${state.location}:${placeSpecies(state.location, state.licenseSpecies).map(s => s.id).join(',')}`
}

// What the scene remembers per visible angler: the catch it last saw, the wait remaining when it appeared (drives the approach),
// the wait remaining when the cast began (drives the cast and sink), and the last timer seen.
export interface Track { pending: Pending | null; waitMs: number; castMs: number; lastMs: number }

// Compared by value: a reloaded save (tab return, another tab, Continue) rebuilds the same catch as new objects.
export function sameCatch(a: Pending | null, b: Pending | null): boolean {
  return a === b || (!!a && !!b && a.kind === b.kind && a.defId === b.defId && a.value === b.value && a.size === b.size && a.location === b.location)
}

// A new catch (a cast, or a re-pick after travel) restarts the approach within the wait that is left.
// Only the timer jumping back up is a new cast, even if the new catch happens to equal the last one.
export function trackCatch(tr: Track, a: Angler | undefined): Track {
  const pending = a?.pending ?? null, ms = a?.timerMs ?? 0
  if (ms > tr.lastMs) tr.castMs = tr.waitMs = ms
  else if (!sameCatch(pending, tr.pending)) tr.waitMs = ms
  tr.pending = pending; tr.lastMs = ms
  return tr
}

// A fish that was on the line has landed: it must not swim back into view.
export function releaseOffscreen(lastPhase: Angler['phase']): boolean {
  return lastPhase === 'bite' || lastPhase === 'reeling'
}

// While waiting, the catch heads for where the fly will rest (it may still be mid-cast); once hooked it follows the fly.
export function approachTarget(phase: Angler['phase'], fly: [number, number], rest: [number, number]): [number, number] {
  return phase === 'waiting' ? rest : fly
}
