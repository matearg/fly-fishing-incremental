// Pure timing for the fishing scene's animations; the scene reads sim state and asks these what to draw.
import { placeSpecies } from '../../game/fishing/catch'
import type { Angler, GameState, Pending } from '../../game/state'

export const APPROACH_MS = 2000 // the chosen fish's notice + swim to the fly, ending at the bite
export const NOTICE_SHARE = 0.4 // first part of the approach: stop and turn toward the fly
// The cast at the start of a wait: back cast, the loop straightening behind, forward cast; then the fly sinks.
export const BACK_MS = 350
export const STRAIGHT_MS = 250
export const FORWARD_MS = 400
export const CAST_MS = BACK_MS + STRAIGHT_MS + FORWARD_MS
export const SINK_MS = 400
export const BACK_LEN = 34 // how far behind the rod tip the line straightens out
const LOOP = 6 // gap between the legs of the line's U loop

export type Pt = [number, number]
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpPt = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
export const ease = (k: number) => k * k * (3 - 2 * k)

export type ApproachStage = 'cruise' | 'notice' | 'swim'

// The approach lasts min(APPROACH_MS, waitMs) and ends at remainingMs = 0; k runs 0→1 within each stage.
export function approach(remainingMs: number, waitMs: number): { stage: ApproachStage; k: number } {
  const dur = Math.min(APPROACH_MS, waitMs)
  if (remainingMs > dur || dur <= 0) return { stage: remainingMs > 0 ? 'cruise' : 'swim', k: remainingMs > 0 ? 0 : 1 }
  const t = 1 - Math.max(0, remainingMs) / dur
  return t < NOTICE_SHARE ? { stage: 'notice', k: t / NOTICE_SHARE } : { stage: 'swim', k: (t - NOTICE_SHARE) / (1 - NOTICE_SHARE) }
}

// The rod is back through the back cast and the straighten, forward for the forward cast.
export function castPose(sinceMs: number): 'back' | 'cast' | null {
  return sinceMs < BACK_MS + STRAIGHT_MS ? 'back' : sinceMs < CAST_MS ? 'cast' : null
}

// The cast line from the rod tip, as a polyline ending at the fly; null once the fly is down.
// The loop: tip → front L → bulge → lower leg → fly, with the lower leg `g` below the upper.
// `tip` is the current pose's rod tip; the line behind hangs off the back pose's tip, so it stays put when the rod swings forward.
export function castLine(sinceMs: number, tip: Pt, land: Pt, backTip: Pt = tip): Pt[] | null {
  const B: Pt = [backTip[0] - BACK_LEN, backTip[1] + 2]
  const loop = (front: Pt, g: number, dir: number, fly: Pt): Pt[] =>
    [tip, front, [front[0] + dir * g / 3, front[1] + g / 2], [front[0], front[1] + g], fly]
  if (sinceMs < BACK_MS) {
    const k = sinceMs / BACK_MS, e = ease(k), L = lerpPt(tip, B, e), g = LOOP * e
    return loop(L, g, -1, [L[0] + (1 - k) * (tip[0] - L[0]), L[1] + g])
  }
  if (sinceMs < BACK_MS + STRAIGHT_MS) {
    const g = LOOP * (1 - (sinceMs - BACK_MS) / STRAIGHT_MS)
    return loop(B, g, -1, [B[0], B[1] + g])
  }
  if (sinceMs < CAST_MS) {
    const e = ease((sinceMs - BACK_MS - STRAIGHT_MS) / FORWARD_MS), arc = Math.sin(Math.PI * e)
    const F: Pt = [lerp(tip[0], land[0], e), lerp(tip[1], land[1], e) - arc * 12], g = LOOP * arc
    return loop(F, g, 1, lerpPt(B, F, e * e))
  }
  return null
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
