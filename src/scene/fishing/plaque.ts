// The Taxidermist's pop-up timing: each new trophy drops in, holds, fades, and waits its turn behind the one showing.
export const PLAQUE_MS = 4000, PLAQUE_IN_MS = 400, PLAQUE_OUT_MS = 600
const DROP = 12 // world units the plaque falls from

// seen: how many of state.trophies have been queued; startMs: when the head started showing (null = not yet)
export interface PlaqueQueue { seen: number; queue: string[]; startMs: number | null }

// Trophies already mounted when a state is (re)adopted never pop up.
export function newPlaqueQueue(trophies: string[]): PlaqueQueue {
  return { seen: trophies.length, queue: [], startMs: null }
}

// After a wake or a swapped-in save: plaques still waiting (or cut short) show again from the start if the new
// trophies still have them; everything else the save holds counts as seen.
export function resumePlaques(q: PlaqueQueue | null, trophies: string[]): PlaqueQueue {
  return { ...newPlaqueQueue(trophies), queue: (q?.queue ?? []).filter(id => trophies.includes(id)) }
}

export function notePlaques(q: PlaqueQueue, trophies: string[]): string[] {
  const fresh = trophies.slice(q.seen)
  q.seen = trophies.length
  q.queue.push(...fresh)
  return fresh
}

// started is true on the head's first frame only, so the scene plays the fanfare once.
// The frame a plaque ends shows nothing; the next one starts on the frame after.
export function plaqueFrame(q: PlaqueQueue, nowMs: number): { id: string; dy: number; alpha: number; started: boolean } | null {
  if (!q.queue.length) return null
  const started = q.startMs === null
  if (started) q.startMs = nowMs
  const t = nowMs - q.startMs!
  if (t >= PLAQUE_MS) { q.queue.shift(); q.startMs = null; return null }
  const k = Math.min(1, t / PLAQUE_IN_MS)
  return { id: q.queue[0], dy: k < 1 ? -DROP * (1 - k) ** 2 : 0, alpha: Math.min(1, (PLAQUE_MS - t) / PLAQUE_OUT_MS), started }
}
