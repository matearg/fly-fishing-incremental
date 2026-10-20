// Side-view props baked fine, each standing on its bottom row and lit from the upper left.
import { lcg } from '../../game/util/rand'
import { FINE, mix, type Bitmap } from '../pixels'
import type { Prop, PropKind } from '../places'
import { noise2, shade } from './noise'
import { fill, fineBlank } from './raster'

const EDGE = 1 / FINE

// World width and height of each kind's bitmap.
export const PROP_SIZE: Record<PropKind, [number, number]> = {
  lenga: [34, 56], poplar: [14, 60], willow: [30, 40], log: [22, 7], rock: [10, 6], coiron: [7, 6], lupine: [3, 10],
}

export function sideProp(p: Prop, seed: number): Bitmap {
  const [w, h] = PROP_SIZE[p.kind], b = fineBlank(w, h), rand = lcg(seed)
  DRAW[p.kind](b, w, h, p.colors, seed, rand)
  return b
}

type Draw = (b: Bitmap, w: number, h: number, colors: number[], seed: number, rand: () => number) => void

const dot = (b: Bitmap, x: number, y: number, c: number) => fill(b, x, y, x + EDGE, y + EDGE, () => c)
const BARK = [0x7a6a58, 0x5a4a3a, 0x3a2e24, 0x241a12]

// A trunk from the ground up to `top`, tapering and flaring at the root, lit on its left.
function trunk(b: Bitmap, cx: number, h: number, top: number, base: number, seed: number): void {
  fill(b, cx - base - 1, top, cx + base + 1, h, (_px, _py, x, y) => {
    const v = (h - y) / (h - top), half = base * (1 - v * 0.55) + (v < 0.08 ? (0.08 - v) * 14 : 0)
    const u = (x - cx - Math.sin(v * 3) * 0.6) / half
    if (Math.abs(u) > 1) return null
    let c = u < -0.3 ? BARK[0] : u < 0.4 ? BARK[1] : BARK[2]
    if (noise2(x * 0.8, y * 0.25, seed) > 0.68) c = shade(c, -0.25) // bark furrows
    return Math.abs(u) > 0.8 ? BARK[3] : c
  })
}

// Leafy blob: lit from the upper left, a dark rim on the shaded side, the odd accent leaf.
function blob(b: Bitmap, bx: number, by: number, rx: number, ry: number, leaf: number[], accent: number | undefined, seed: number, lift: number): void {
  fill(b, bx - rx - 1, by - ry - 1, bx + rx + 1, by + ry + 1, (_px, _py, x, y) => {
    const nx = (x - bx) / rx, ny = (y - by) / ry, r = Math.sqrt(nx * nx + ny * ny)
    const edge = 1 - 0.28 * noise2(x * 1.1, y * 1.1, seed)
    if (r > edge) return null
    const l = -(nx * 0.6 + ny * 0.8) * 0.6 + (noise2(x * 1.6, y * 1.6, seed + 1) - 0.5) * 0.8 + lift
    if (accent !== undefined && noise2(x * 0.35, y * 0.35, seed + 2) > 0.7 && noise2(x * 1.8, y * 1.8, seed + 3) > 0.4) return l > 0 ? shade(accent, 0.15) : accent // autumn patches
    return r > edge - 0.14 && l < 0.1 ? leaf[0] : l > 0.45 ? leaf[4] : l > 0.1 ? leaf[3] : l > -0.3 ? leaf[2] : leaf[1]
  })
}

const leafRamp = (g: number) => [shade(g, -0.6), shade(g, -0.35), g, shade(g, 0.2), shade(g, 0.4)]

const DRAW: Record<PropKind, Draw> = {
  // Broad lenga: a trunk with three branches under a cluster of foliage blobs.
  lenga(b, w, h, [green, accent], seed, rand) {
    const cx = w / 2, leaf = leafRamp(green)
    trunk(b, cx, h, h * 0.25, 2.4, seed)
    for (const [dx, dy, k] of [[11, -8, 0.4], [-10, -7, 0.5], [7, -8, 0.6]]) {
      const y0 = h - h * k
      for (let t = 0; t < 1; t += 0.02) fill(b, cx + dx * t - 0.7, y0 + dy * t - 0.7, cx + dx * t + 0.7, y0 + dy * t + 0.7, () => BARK[2])
    }
    const blobs = Array.from({ length: 16 }, () => [cx + (rand() - 0.5) * (w - 12), h * (0.12 + rand() * 0.4), 4 + rand() * 3.5])
    blobs.sort((p, q) => p[1] - q[1]) // higher blobs first, lower ones overlap them
    blobs.forEach(([bx, by, br], i) => blob(b, bx, by, br * 1.35, br * 0.8, leaf, accent, seed + 10 + i, (h * 0.5 - by) * 0.01))
  },
  // Lombardy poplar: tall and narrow, yellow-green, a thin trunk showing at the foot.
  poplar(b, w, h, [green, accent], seed) {
    const cx = w / 2, leaf = leafRamp(mix(green, 0xc8d040, 0.25))
    trunk(b, cx, h, h * 0.6, 1.1, seed)
    fill(b, 0, 0, w, h * 0.9, (_px, _py, x, y) => {
      const v = (h * 0.9 - y) / (h * 0.9), r = (w / 2 - 0.5) * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.95 + 0.05)), 0.8) * (0.85 + 0.3 * noise2(x * 0.9, y * 0.5, seed))
      const u = (x - cx) / Math.max(r, 0.1)
      if (Math.abs(u) > 1) return null
      const l = -u * 0.7 + (noise2(x * 1.5, y * 1.5, seed + 1) - 0.5) * 0.9
      if (accent !== undefined && noise2(x * 2.4, y * 2.4, seed + 2) > 0.82) return accent
      return Math.abs(u) > 0.85 && l < 0 ? leaf[0] : l > 0.4 ? leaf[4] : l > 0.05 ? leaf[3] : l > -0.35 ? leaf[2] : leaf[1]
    })
  },
  // Willow: a short leaning trunk, a dome of leaves and strands drooping almost to the ground.
  willow(b, w, h, [green], seed, rand) {
    const cx = w / 2, leaf = leafRamp(green)
    trunk(b, cx, h, h * 0.35, 2, seed)
    for (let i = 0; i < 7; i++) blob(b, cx + (rand() - 0.5) * (w - 12), h * 0.28 + (rand() - 0.5) * 6, 5 + rand() * 3, 3.5 + rand() * 1.5, leaf, undefined, seed + 10 + i, 0.1)
    for (let x = 2; x < w - 2; x += EDGE * 2) {
      if (noise2(x * 0.7, 3, seed + 3) < 0.35) continue
      const top = h * 0.3 + Math.abs(x - cx) * 0.25, len = (h * 0.45) * (0.5 + 0.5 * noise2(x * 1.3, 7, seed + 4))
      for (let v = 0; v < len; v += EDGE) dot(b, x + Math.sin(v * 0.25 + x) * 0.4 + (x - cx) * v * 0.015, top + v, v > len - 2 ? leaf[3] : x < cx ? leaf[2] : leaf[1])
    }
  },
  // Fallen log: bark grain, an end-grain cut with rings on the right, moss on top.
  log(b, w, h, [bark], seed) {
    const R = h / 2 - 0.2, cy = h - R, x1 = w - 2
    const tone = [shade(bark, 0.25), bark, shade(bark, -0.25), shade(bark, -0.5), shade(bark, -0.65)]
    fill(b, 0, 0, w, h, (_px, _py, x, y) => {
      const v = (y - cy) / R
      if (Math.abs(v) > 1) return null
      const ex = (x - x1) / 1.6
      if (x > x1 - 1.6 && ex * ex + v * v <= 1) {
        const rr = Math.sqrt(ex * ex + v * v)
        return rr > 0.82 ? tone[4] : Math.floor(rr * 4) % 2 ? 0xb08050 : 0xd0a468
      }
      if (x > x1 || x < 0.5) return null
      const l = -v * 0.7 + (noise2(x * 0.25, y * 2.2, seed) - 0.5) * 0.9
      if (v < -0.45 && noise2(x * 0.9, y * 0.9, seed + 1) > 0.55) return noise2(x * 2, y * 2, seed + 2) > 0.5 ? 0x8aba5a : 0x5a8a3a
      return Math.abs(v) > 0.82 ? tone[4] : l > 0.35 ? tone[0] : l > -0.1 ? tone[1] : l > -0.5 ? tone[2] : tone[3]
    })
  },
  // Boulder: half buried, lit from the upper left, moss on its crown.
  rock(b, w, h, [stone], seed) {
    const cx = w / 2, rx = w / 2 - 0.3, ry = h - 0.3
    const tone = [shade(stone, 0.35), stone, shade(stone, -0.25), shade(stone, -0.45), shade(stone, -0.65)]
    fill(b, 0, 0, w, h, (_px, _py, x, y) => {
      const nx = (x - cx) / rx, ny = (y - h) / ry, r = nx * nx + ny * ny
      if (r > 1) return null
      const l = -(nx * 0.7 + ny * 0.7) * 0.6 + (noise2(x * 1.5, y * 1.5, seed) - 0.5) * 0.4
      if (ny < -0.6 && noise2(x * 2, y * 2, seed + 1) > 0.55) return 0x6a9a4a
      return r > 0.78 ? tone[4] : l > 0.35 ? tone[0] : l > 0 ? tone[1] : l > -0.3 ? tone[2] : tone[3]
    })
  },
  // Coirón: a golden tuft of blades fanning out from its root, tips paler.
  coiron(b, w, h, [blade, tip], _seed, rand) {
    for (let i = 0; i < 11; i++) {
      const a = (i / 10 - 0.5) * 2.2 + (rand() - 0.5) * 0.3, len = h * (0.6 + 0.4 * rand()), c = i % 3 ? blade : shade(blade, -0.2)
      for (let v = 0; v < len; v += EDGE) dot(b, w / 2 + Math.sin(a) * v * 0.6 + Math.sin(a) * v * v * 0.03, h - EDGE - Math.cos(a * 0.8) * v, v > len - 1.5 ? tip ?? shade(blade, 0.3) : c)
    }
  },
  // Lupine: a stem with leaves at its foot and a flower spike that narrows to the top.
  lupine(b, w, h, [flower, light]) {
    const cx = w / 2, hi = light ?? shade(flower, 0.3)
    fill(b, cx - EDGE, h * 0.35, cx + EDGE, h, () => 0x3c6e25)
    for (const [dx, y] of [[-1, h - 1.5], [1, h - 2]]) fill(b, cx + Math.min(0, dx), y, cx + Math.max(0, dx), y + EDGE, () => 0x4a8a30)
    fill(b, 0, 0, w, h * 0.65, (px, py, x, y) => {
      const v = y / (h * 0.65), r = 0.4 + v * (w / 2 - 0.4)
      if (Math.abs(x - cx) > r) return null
      return (px + py) % 2 ? flower : x < cx ? hi : shade(flower, -0.2)
    })
  },
}

// --- seen from above (title backdrop) ---

// World size of each kind seen from above; never wider than its side view.
const TOP_SIZE: Record<PropKind, [number, number]> = {
  lenga: [16, 16], poplar: [9, 9], willow: [14, 14], log: [20, 6], rock: [6, 5], coiron: [6, 6], lupine: [3, 3],
}
const SHADOW_ALPHA = 70 // translucent, so blit only lays it on empty pixels

export function topProp(p: Prop, seed: number): Bitmap {
  const [w, h] = TOP_SIZE[p.kind], b = fineBlank(w, h)
  TOP[p.kind](b, w, h, p.colors, seed)
  return b
}

type TopDraw = (b: Bitmap, w: number, h: number, colors: number[], seed: number) => void

// Paints `shape`, plus its shadow cast toward the lower right.
function withShadow(b: Bitmap, w: number, h: number, inside: (x: number, y: number) => boolean, paintAt: (x: number, y: number) => number, off = 1): void {
  fill(b, 0, 0, w, h, (_px, _py, x, y) => (inside(x, y) ? paintAt(x, y) : null))
  for (let py = 0; py < b.h; py++) for (let px = 0; px < b.w; px++) {
    const x = (px + 0.5) / FINE, y = (py + 0.5) / FINE, i = (py * b.w + px) * 4
    if (!b.data[i + 3] && inside(x - off, y - off)) b.data.set([0, 0, 0, SHADOW_ALPHA], i)
  }
}

// A round crown: leafy noise edge, lit from the upper left; willows streak out from the middle.
function crownTop(b: Bitmap, d: number, colors: number[], seed: number, strands: boolean): void {
  const c = d / 2 - 0.6, r0 = c - 0.2, leaf = leafRamp(colors[0]), accent = colors[1]
  const inside = (x: number, y: number) => Math.hypot((x - c) / r0, (y - c) / r0) <= 1 - 0.22 * noise2(x * 1.1, y * 1.1, seed)
  withShadow(b, d, d, inside, (x, y) => {
    const nx = (x - c) / r0, ny = (y - c) / r0
    let l = -(nx + ny) * 0.45 + (noise2(x * 1.6, y * 1.6, seed + 1) - 0.5) * 0.8
    if (strands) l += Math.sin(Math.atan2(ny, nx) * 9 + seed) * 0.25
    if (accent !== undefined && noise2(x * 0.5, y * 0.5, seed + 2) > 0.66 && noise2(x * 1.8, y * 1.8, seed + 3) > 0.4) return l > 0 ? shade(accent, 0.15) : accent
    return l > 0.45 ? leaf[4] : l > 0.1 ? leaf[3] : l > -0.3 ? leaf[2] : l > -0.6 ? leaf[1] : leaf[0]
  }, 1.2)
}

const TOP: Record<PropKind, TopDraw> = {
  lenga: (b, w, _h, colors, seed) => crownTop(b, w, colors, seed, false),
  poplar: (b, w, _h, [green, accent], seed) => crownTop(b, w, [mix(green, 0xc8d040, 0.25), ...(accent === undefined ? [] : [accent])], seed, false),
  willow: (b, w, _h, colors, seed) => crownTop(b, w, colors, seed, true),
  // A log lying across the bank: lit along its top, rings on its right end, a little moss.
  log(b, w, h, [bark], seed) {
    const R = h / 2 - 0.7, cy = h / 2 - 0.4, x1 = w - 2.2
    const tone = [shade(bark, 0.25), bark, shade(bark, -0.25), shade(bark, -0.55)]
    withShadow(b, w, h, (x, y) => Math.abs(y - cy) <= R && x > 0.5 && x < x1 + 1.4, (x, y) => {
      const v = (y - cy) / R, ex = (x - x1) / 1.4
      if (x > x1 - 1.4 && ex * ex + v * v <= 1) return Math.hypot(ex, v) > 0.8 ? tone[3] : Math.floor(Math.hypot(ex, v) * 4) % 2 ? 0xb08050 : 0xd0a468
      if (x > x1) return tone[3]
      if (v < -0.3 && noise2(x * 0.9, y * 0.9, seed + 1) > 0.6) return 0x6a9a4a
      const l = -v * 0.8 + (noise2(x * 0.3, y * 2, seed) - 0.5) * 0.7
      return Math.abs(v) > 0.8 ? tone[3] : l > 0.3 ? tone[0] : l > -0.2 ? tone[1] : tone[2]
    })
  },
  rock(b, w, h, [stone], seed) {
    const cx = w / 2 - 0.5, cy = h / 2 - 0.5, rx = cx - 0.2, ry = cy - 0.2
    const tone = [shade(stone, 0.35), stone, shade(stone, -0.25), shade(stone, -0.55)]
    withShadow(b, w, h, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny
      if (nx + ny < -0.6 && noise2(x * 2, y * 2, seed) > 0.6) return 0x6a9a4a
      const l = -(nx + ny) * 0.55
      return r > 0.75 ? tone[3] : l > 0.25 ? tone[0] : l > -0.15 ? tone[1] : tone[2]
    }, 0.6)
  },
  // A tuft of blades fanning out in every direction, paler at the tips.
  coiron(b, w, _h, [blade, tip], seed) {
    const c = w / 2, rand = lcg(seed)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.4, len = c * (0.6 + 0.4 * rand())
      for (let v = 0; v < len; v += EDGE) dot(b, c + Math.cos(a) * v, c + Math.sin(a) * v, v > len - 1 ? tip ?? shade(blade, 0.3) : i % 3 ? blade : shade(blade, -0.2))
    }
  },
  // A lupine spike from above: a small round head of flowers.
  lupine(b, w, _h, [flower, light]) {
    const c = w / 2
    fill(b, 0, 0, w, w, (px, py, x, y) => (Math.hypot(x - c, y - c) > c ? null : (px + py) % 2 ? flower : light ?? shade(flower, 0.3)))
  },
}
