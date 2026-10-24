// Seeded value noise and dithered colour ramps for procedural scenery. Pure and deterministic.
import { mix } from '../pixels'

export function hash2(i: number, j: number): number {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const smooth = (f: number) => f * f * (3 - 2 * f)

export function noise1(x: number, seed: number): number {
  const i = Math.floor(x), u = smooth(x - i)
  return hash2(i, seed) * (1 - u) + hash2(i + 1, seed) * u
}

export function noise2(x: number, y: number, seed: number): number {
  const i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j), o = Math.imul(seed, 1013)
  const row = (jj: number) => hash2(i + o, jj) * (1 - u) + hash2(i + 1 + o, jj) * u
  return row(j) * (1 - v) + row(j + 1) * v
}

export function fbm(x: number, seed: number, octaves = 4): number {
  let a = 0.5, t = 0, f = 1
  for (let k = 0; k < octaves; k++) { t += a * noise1(x * f, seed + k * 31); f *= 2.03; a *= 0.5 }
  return t / (1 - Math.pow(0.5, octaves))
}

// Sharp crests: each octave's valleys fold up into ridges, weighted by the octave below.
export function ridged(x: number, seed: number, octaves = 3): number {
  let a = 0.5, t = 0, f = 1, w = 1, sum = 0
  for (let k = 0; k < octaves; k++) {
    const n = (1 - Math.abs(2 * noise1(x * f, seed + k * 17) - 1)) ** 2
    t += a * n * w; sum += a
    w = Math.min(1, n * 1.6); f *= 2.1; a *= 0.5
  }
  return t / sum
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

// Picks a step of `cols`; only the middle 40% between two steps is Bayer-dithered, so bands stay flat.
export function ramp(cols: number[], t: number, px: number, py: number): number {
  const n = cols.length - 1, v = Math.max(0, Math.min(1, t)) * n, i = Math.floor(v)
  const f = Math.min(1, Math.max(0, (v - i - 0.3) / 0.4))
  return cols[Math.min(n, i + (f > (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16 ? 1 : 0))]
}

export const shade = (c: number, k: number) => (k < 0 ? mix(c, 0x000000, -k) : mix(c, 0xffffff, k))
