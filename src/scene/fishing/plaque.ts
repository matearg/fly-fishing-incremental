import { LEGENDARY_IDS } from '../../game/progress/trophies'
import type { GameState } from '../../game/state'

// The pop-up timing: each new log card or trophy drops in, holds, fades, and waits its turn behind the one showing.
export const PLAQUE_MS = 4000, PLAQUE_IN_MS = 400, PLAQUE_OUT_MS = 600
const DROP = 12 // world units the pop-up falls from

export interface Popup { kind: 'log' | 'trophy'; id: string }
export type Shown = Pick<GameState, 'speciesLog' | 'trophies'>
const listOf = (s: Shown, kind: Popup['kind']) => (kind === 'log' ? s.speciesLog : s.trophies)

// seenLog/seenTrophies: how much of each list has been queued; startMs: when the head started showing (null = not yet)
export interface PlaqueQueue { seenLog: number; seenTrophies: number; queue: Popup[]; startMs: number | null }

// Entries already in a state when it's (re)adopted never pop up.
export function newPlaqueQueue(s: Shown): PlaqueQueue {
  return { seenLog: s.speciesLog.length, seenTrophies: s.trophies.length, queue: [], startMs: null }
}

// After a wake or a swapped-in save: pop-ups still waiting (or cut short) show again from the start if the new
// state still has them; everything else it holds counts as seen.
export function resumePlaques(q: PlaqueQueue | null, s: Shown): PlaqueQueue {
  return { ...newPlaqueQueue(s), queue: (q?.queue ?? []).filter(p => listOf(s, p.kind).includes(p.id)) }
}

// A legendary enters the log when it's mounted, so it gets only its trophy plaque.
export function notePlaques(q: PlaqueQueue, s: Shown): Popup[] {
  const fresh: Popup[] = [
    ...s.speciesLog.slice(q.seenLog).filter(id => !LEGENDARY_IDS.includes(id)).map(id => ({ kind: 'log' as const, id })),
    ...s.trophies.slice(q.seenTrophies).map(id => ({ kind: 'trophy' as const, id })),
  ]
  q.seenLog = s.speciesLog.length; q.seenTrophies = s.trophies.length
  q.queue.push(...fresh)
  return fresh
}

// started is true on the head's first frame only, so the scene plays its sound once.
// The frame a pop-up ends shows nothing; the next one starts on the frame after.
export function plaqueFrame(q: PlaqueQueue, nowMs: number): { popup: Popup; dy: number; alpha: number; started: boolean } | null {
  if (!q.queue.length) return null
  const started = q.startMs === null
  if (started) q.startMs = nowMs
  const t = nowMs - q.startMs!
  if (t >= PLAQUE_MS) { q.queue.shift(); q.startMs = null; return null }
  const k = Math.min(1, t / PLAQUE_IN_MS)
  return { popup: q.queue[0], dy: k < 1 ? -DROP * (1 - k) ** 2 : 0, alpha: Math.min(1, (PLAQUE_MS - t) / PLAQUE_OUT_MS), started }
}
