// Water motion shared by the title's river and the fishing scene.
import { VIEW_W } from './view'

// A swimmer's tail frame: 8 steps a second, ≈4 Hz wiggle.
export function tailFrame(frames: [string, string], phase: number, t: number): string {
  return frames[Math.floor(t * 8 + phase) % 2]
}

export interface Glint { x0: number; y: number; len: number; speed: number }

// n drifting surface glints over `rows` world rows from y0; the rand() order keeps seeded layouts stable.
export function glints(rand: () => number, n: number, y0: number, rows: number): Glint[] {
  return Array.from({ length: n }, () => ({ x0: rand() * VIEW_W, y: y0 + Math.floor(rand() * rows), len: 2 + Math.floor(rand() * 5), speed: 6 + rand() * 10 }))
}
