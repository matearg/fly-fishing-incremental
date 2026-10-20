// Side view of the left bank, baked fine: the place's ground on top, a cut of topsoil, strata and stones
// below, the face sloping into the water, props standing on the ground, and a dock where the place has one.
import { lcg } from '../../game/util/rand'
import { blit, FINE, mix, type Bitmap } from '../pixels'
import type { PlaceLook } from '../places'
import { fbm, hash2, noise1, noise2, shade } from './noise'
import { PROP_SIZE, sideProp } from './props'
import { fill, fineBlank } from './raster'

export const BANK_SURFACE = 64 // world rows above the walkable ground, room for the tallest prop
const SLOPE = 20 // world units from the shoulder to shoreX
const DOCK_LEN = 110
const EDGE = 1 / FINE

// The face's x at depth d below the ground: a rounded shoulder, a steep uneven face, then a gentler
// underwater slope flaring out to a toe on the bed. The wobble can leave small overhangs.
function faceX(d: number, flat: number, seed: number): number {
  if (d <= 0) return flat
  const wobble = 5 * (fbm(d * 0.045, seed + 26) - 0.5) + 1.2 * (noise1(d * 0.35, seed + 27) - 0.5)
  return flat + 7 * (1 - Math.exp(-d / 4)) + 0.15 * d + 0.0003 * d * d + 0.000004 * d * d * d + Math.min(1, d / 6) * wobble
}

// h: bitmap height; waterY: texture-local world row of the waterline.
export function bakeSideBank(look: PlaceLook, h: number, waterY: number, seed: number): Bitmap {
  const S = BANK_SURFACE, flat = look.shoreX - SLOPE, rand = lcg(seed)
  // Per fine row, where the bank ends on the right; the bitmap is as wide as its widest row (or the dock).
  const faces = Float64Array.from({ length: h * FINE }, (_, py) => faceX((py + 0.5) / FINE - S, flat, seed))
  const w = Math.max(Math.ceil(Math.max(...faces)) + 1, look.dock ? look.shoreX + DOCK_LEN : 0)
  const b = fineBlank(w, h)
  const flatTop = (x: number) => S - 0.5 * noise1(x * 0.2, seed + 20)
  const solid = (x: number, y: number) => y >= flatTop(x) && x < faces[Math.max(0, Math.min(faces.length - 1, Math.floor(y * FINE)))]
  // Per fine column, the top of the bank (the ground on the flat, the face beyond the shoulder).
  const tops = Float64Array.from({ length: b.w }, (_, px) => {
    const x = (px + 0.5) / FINE
    let py = Math.floor((S - 1) * FINE)
    while (py < b.h && !solid(x, (py + 0.5) / FINE)) py++
    return py / FINE
  })
  const surf = (x: number) => tops[Math.max(0, Math.min(b.w - 1, Math.floor(x * FINE)))]
  const below = (c: number, y: number) => (y < waterY ? c : mix(c, look.deep, Math.min(0.65, 0.12 + ((y - waterY) / (h - waterY)) * 0.5)))
  const top = GROUND_DEPTH[look.ground]
  const strata = [look.soil, shade(look.soil, -0.12), shade(look.soil, 0.08), shade(look.soil, -0.22)]
  const topsoil = shade(look.soil, -0.35), faceEdge = shade(look.soil, -0.6)

  // The ground only covers the top and the shoulder; the face below shows topsoil and strata,
  // weathered darker near its edge, with a dark outline where the air begins.
  fill(b, 0, S - 1, w, h, (px, py, x, y) => {
    if (!solid(x, y)) return null
    const t = surf(x), d = y - t
    let c: number
    if (t < S + 4 && d < top) c = groundAt(look, x, y, d, seed)
    else if (t < S + 10 && d < top + 4) c = noise2(x * 0.9, y * 0.9, seed + 22) > 0.55 ? shade(topsoil, 0.1) : topsoil
    else {
      c = strata[Math.floor((y + 6 * fbm(x * 0.04, seed + 23)) / 6) % 4]
      const k = noise2(x * 1.4, y * 1.4, seed + 24)
      if (k > 0.7) c = shade(c, 0.08)
      else if (k < 0.25) c = shade(c, -0.12)
    }
    if (faces[py] - x < 3) c = shade(c, -0.1)
    if (x + EDGE >= faces[py] || (x > flat && !solid(x, y - EDGE))) c = faceEdge
    return below(c, y)
  })
  // Roots poking out of the face under the topsoil.
  for (let i = 0; i < 9; i++) {
    const x0 = flat + rand() * 10, len = 4 + rand() * 9, ph = rand() * 6
    for (let v = 0; v < len; v += EDGE) {
      const x = x0 + 1.5 + v * 0.25 + Math.sin(v * 0.5 + ph) * 0.8, y = surf(x0) + top + 1 + v
      if (!solid(x, y)) continue
      fill(b, x, y, x + EDGE, y + EDGE, () => below(v < 1 ? 0x8a6a46 : 0x6a4a2e, y))
    }
  }
  // Stones in the cut, lit from the upper left; some lie out on the toe.
  const stone = [shade(look.edge, -0.6), shade(look.edge, 0.15), look.edge, shade(look.edge, -0.3)]
  for (let i = 0; i < (w * h) / 500; i++) {
    const cx = rand() * (w - 2), rx = 1.4 + rand() * 3.4, ry = rx * (0.55 + rand() * 0.25), cy = surf(cx) + top + 6 + rand() * (h - surf(cx) - top - 6)
    fill(b, cx - rx, cy - ry, cx + rx, cy + ry, (_px, _py, x, y) => {
      if (!solid(x, y) || y < surf(x) + top + 4) return null
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny
      if (r > 1) return null
      const l = -(nx + ny) * 0.55
      return below(r > 0.72 ? stone[0] : l > 0.25 ? stone[1] : l > -0.15 ? stone[2] : stone[3], y)
    })
  }
  groundTop(b, look, flat, surf, seed, rand)
  if (look.dock) dock(b, flat - 8, w, h, below, seed)
  // Props stand on the flat ground, tall ones first so low ones sit in front.
  const props = [...look.props].sort((p, q) => PROP_SIZE[q.kind][1] - PROP_SIZE[p.kind][1])
  props.forEach((p, k) => {
    const [pw, ph] = PROP_SIZE[p.kind]
    for (let i = 0; i < p.count; i++) {
      const x = 2 + Math.floor(((i + rand()) / p.count) * Math.max(1, flat - pw - 4)) // one slot each, so copies don't stack
      blit(b, sideProp(p, seed + k * 131 + i * 17), x * FINE, (S - ph) * FINE + 1)
    }
  })
  return b
}

// World rows of the ground's own material before the topsoil starts.
const GROUND_DEPTH: Record<PlaceLook['ground'], number> = { steppe: 3, cobbles: 4, mud: 3, turf: 2.5, beach: 4 }

function groundAt(look: PlaceLook, x: number, y: number, d: number, seed: number): number {
  const g = look.bank, n = noise2(x * 1.6, y * 1.6, seed + 21)
  switch (look.ground) {
    case 'steppe': return d < 1 ? (n > 0.55 ? shade(g, 0.12) : g) : n > 0.6 ? shade(g, -0.08) : shade(g, -0.2)
    case 'turf': return d < 1 ? (n > 0.5 ? shade(g, 0.25) : g) : n > 0.55 ? shade(g, -0.1) : shade(g, -0.22)
    case 'mud': {
      const wet = shade(g, -0.2)
      if (d < EDGE * 2 && noise1(x * 0.15, seed + 25) > 0.68) return mix(look.sky[1], wet, 0.45) // puddle catching the sky
      return n > 0.62 ? shade(wet, 0.1) : d < 1 ? wet : shade(wet, -0.15)
    }
    case 'beach': {
      const p = hash2(Math.floor(x * 2), Math.floor(y * 2) + seed) // fine pebbles, one per half unit
      return p > 0.75 ? shade(look.edge, 0.15) : p > 0.45 ? g : p > 0.2 ? shade(g, -0.15) : shade(look.edge, -0.3)
    }
    case 'cobbles': {
      // Rounded stones packed in cells, each shaded from its upper left.
      const cx = Math.floor(x / 2.5), cy = Math.floor(y / 2), fx = x / 2.5 - cx - 0.5, fy = y / 2 - cy - 0.5
      const r = fx * fx + fy * fy, h = hash2(cx, cy + seed)
      if (r > 0.2) return shade(g, -0.4)
      const c = h > 0.6 ? look.edge : h > 0.3 ? g : shade(g, -0.12)
      return -(fx + fy) > 0.15 ? shade(c, 0.15) : fx + fy > 0.25 ? shade(c, -0.2) : c
    }
  }
}

// What sticks up above the walkable line: tufts, grass blades over the edge, loose stones, driftwood.
function groundTop(b: Bitmap, look: PlaceLook, flat: number, surf: (x: number) => number, seed: number, rand: () => number): void {
  const dot = (x: number, y: number, c: number) => fill(b, x, y, x + EDGE, y + EDGE, () => c)
  if (look.ground === 'turf' || look.ground === 'steppe') {
    const turf = look.ground === 'turf', reach = turf ? flat + 12 : flat
    const tip = turf ? shade(look.bank, 0.4) : 0xe0c060, mid = turf ? look.bank : 0xb8983e, low = shade(look.bank, -0.2)
    for (let x = 0; x < reach; x += EDGE) {
      const over = x > flat
      if (over && x > flat + 4 + 6 * noise1(x * 0.3, seed + 70)) continue
      if (!turf && noise1(x * 0.4, seed + 71) < 0.55) continue // steppe: separate tufts
      const t = surf(Math.min(x, flat - EDGE)), hb = (0.5 + noise1(x * 0.9, seed + 25) * (turf ? 2.8 : 2.2)) * (hash2(Math.floor(x * FINE), 9 + seed) > 0.25 ? 1 : 0.3)
      for (let k = 0; k < hb; k += EDGE) {
        const y = over ? surf(x) + k * 0.8 : t - k - EDGE, xx = over ? x + k * 0.3 : x + (k > 1.5 ? noise1(x, seed + 72) - 0.5 : 0)
        dot(xx, y, k > hb - 1 ? tip : noise1(x * 2, seed + 73) > 0.5 ? mid : low)
      }
    }
  } else if (look.ground === 'cobbles' || look.ground === 'beach') {
    const big = look.ground === 'cobbles'
    for (let i = 0; i < flat / (big ? 5 : 3); i++) {
      const cx = rand() * flat, rx = big ? 1.2 + rand() * 1.2 : 0.6 + rand() * 0.5, ry = rx * 0.7, cy = surf(cx) - ry * 0.4
      fill(b, cx - rx, cy - ry, cx + rx, cy + ry, (_px, _py, x, y) => {
        const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny
        if (r > 1) return null
        const l = -(nx + ny) * 0.55
        return r > 0.7 ? shade(look.edge, -0.55) : l > 0.2 ? shade(look.edge, 0.15) : l > -0.2 ? look.edge : shade(look.edge, -0.3)
      })
    }
  } else {
    // Mud: a bleached piece of driftwood lying at the top of the face.
    const x0 = flat - 7, len = 10, wood = [0xb8ac98, 0x968a76, 0x6a604e]
    fill(b, x0, surf(x0) - 1.6, x0 + len, surf(x0) + 0.4, (_px, _py, x, y) => {
      const v = (y - (surf(x0) - 0.6)) / 1
      if (Math.abs(v) > 1 || (x > x0 + len - 2 && v < -0.2)) return null
      return Math.abs(v) > 0.7 ? wood[2] : v < 0 ? wood[0] : wood[1]
    })
  }
}

// Planks with grain and seams every 8 units, a darker underside, and shaded posts down into the water.
function dock(b: Bitmap, x0: number, w: number, h: number, below: (c: number, y: number) => number, seed: number): void {
  const S = BANK_SURFACE, plank = 0x9a6a3a, dark = 0x4a2e16, seam = 0x6b4422
  for (let x = x0 + 6; x < w - 1; x += 22) fill(b, x, S + 4, x + 3, h, (_px, _py, xx, y) => {
    const u = xx - x
    return below(u < 1 ? 0x8a5a30 : u < 2 ? seam : dark, y)
  })
  fill(b, x0, S, w, S + 4, (_px, _py, x, y) => {
    const d = y - S
    if (d < EDGE) return shade(plank, 0.2)
    if (d > 3) return dark
    if (d > 3 - EDGE * 2) return seam // underside in shade
    if ((x - x0) % 8 > 8 - EDGE * 2) return dark
    return noise2(x * 0.3, y * 2.5, seed + 80) > 0.62 ? shade(plank, -0.12) : plank
  })
}
