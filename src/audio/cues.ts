import { catchSound, type SoundId } from './sounds'
import { BACK_MS, CAST_MS, STRAIGHT_MS, type Track } from '../scene/fishing/choreo'
import type { Angler, Pending, Phase } from '../game/state'

// What one rendered frame shows of an angler, for working out which sounds just happened.
export interface CueFrame { phase: Phase; castMs: number; timerMs: number; pending: Pending | null }

export function cueFrame(a: Angler | undefined, tr: Track): CueFrame | null {
  return a ? { phase: a.phase, castMs: tr.castMs, timerMs: a.timerMs, pending: a.pending ?? tr.pending } : null
}

const CAST_CUES: [number, SoundId][] = [[0, 'castBack'], [BACK_MS + STRAIGHT_MS, 'castForward'], [CAST_MS, 'plip']]

// Compares whole frames, not ticks: a helper can bite, reel, land and recast between two frames,
// and `?speed=20` runs many ticks per frame, so each change sounds once.
export function anglerCues(prev: CueFrame | null, cur: CueFrame | null): SoundId[] {
  if (!prev || !cur) return []
  const out: SoundId[] = []
  if (prev.phase === 'reeling' && cur.phase !== 'reeling') out.push('splashOut', prev.pending ? catchSound(prev.pending) : 'catch')
  if (prev.phase === 'waiting' && (cur.phase === 'bite' || cur.phase === 'reeling')) out.push('bite')
  if (cur.phase === 'reeling' && prev.phase !== 'reeling') out.push('reel')
  if (cur.phase === 'waiting') {
    const since = cur.castMs - cur.timerMs
    const before = prev.phase === 'waiting' && prev.castMs === cur.castMs ? prev.castMs - prev.timerMs : -1
    for (const [t, id] of CAST_CUES) if (before < t && t <= since) out.push(id)
  }
  return out
}

const PURCHASES = new Set(['hire', 'unlockPattern', 'unlockMaterial', 'unlockLocation', 'licenseUpgrade', 'licenseSpecies', 'buyRod', 'buyWaders'])

// `result` is what the action returned: whether a purchase went through, or the money a sale made.
export function panelCue(action: string, result: unknown): SoundId {
  if (PURCHASES.has(action)) return result ? 'buy' : 'nope'
  if (action === 'sell') return result ? 'sell' : 'select'
  return 'select'
}
