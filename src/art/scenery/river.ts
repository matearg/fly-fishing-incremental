// The title's top-down river and its two banks, baked fine and lit from the upper left.
import { lcg } from '../../game/util/rand'
import { blit, FINE, mix, type Bitmap } from '../pixels'
import type { PlaceLook, PropKind } from '../places'
import { hash2, noise1, noise2, ramp, shade } from './noise'
import { topProp } from './props'
import { fill, fineBlank } from './raster'

const EDGE = 1 / FINE
const SHORE = 3 // world rows of wet ground and stones along the water
const TREES = new Set<PropKind>(['lenga', 'poplar', 'willow'])

// Water deepening from both shores to mid-river, the bed showing faintly near the shores, foam along them.
export function bakeRiver(look: PlaceLook, w: number, h: number, seed: number): Bitmap {
  const b = fineBlank(w, h), cols = look.water
  const bed = [0x9a9080, 0x6a6052, 0x4a4238].map(c => mix(c, cols[0], 0.55))
  const foam = mix(look.ripple, 0xffffff, 0.4)
  fill(b, 0, 0, w, h, (px, py, x, y) => {
    const shore = Math.min(y, h - y), t = 1 - Math.abs((2 * y) / h - 1) // 0 at the shores, 1 mid-river
    let c = ramp(cols, Math.pow(t, 0.8), px, py)
    if (t < 0.35) {
      const g = noise2(x * 0.45, y * 0.45, seed + 15)
      if (g > 0.6 || g < 0.3) c = mix(c, g > 0.6 ? bed[0] : bed[2], (0.35 - t) * 0.9)
    }
    if (noise2(x * 0.04, y * 0.5, seed + 16) > 0.72) c = shade(c, 0.05) // long current streaks
    const lace = 1.2 + 1.2 * noise1(x * 0.12 + (y < h / 2 ? 0 : 40), seed + 17)
    if (shore < lace && noise2(x * 0.5, y * 1.5, seed + 18) > 0.35) c = shore < lace * 0.5 ? foam : mix(c, foam, 0.5)
    return c
  })
  return b
}

// One bank strip: the place's ground from above, worn dirt patches, a wet shoreline with stones on the water
// side, the place's decor, and the Great Lake's dock.
export function bakeBank(look: PlaceLook, w: number, h: number, waterSide: 'top' | 'bottom', seed: number): Bitmap {
  const b = fineBlank(w, h), rand = lcg(seed)
  const toWater = (y: number) => (waterSide === 'top' ? y : h - y) // world distance from the water
  const wet = (x: number) => SHORE * (0.6 + 0.6 * noise1(x * 0.15, seed + 30))
  fill(b, 0, 0, w, h, (px, py, x, y) => {
    let c = groundTop(look, x, y, seed)
    if (noise2(x * 0.06, y * 0.12, seed + 31) > 0.78) c = mix(c, look.soil, 0.25) // worn dirt
    const d = toWater(y), e = wet(x)
    if (d < e) c = mix(shade(c, -0.25), look.deep, 0.15)
    else if (d < e + EDGE) c = shade(c, -0.35)
    return c
  })
  // Stones along the waterline.
  const stone = [shade(look.edge, -0.55), shade(look.edge, 0.15), look.edge, shade(look.edge, -0.25)]
  for (let i = 0; i < w / 4; i++) {
    const cx = rand() * w, rx = 0.8 + rand() * 1.4, ry = rx * 0.75, d = rand() * SHORE * 1.4, cy = waterSide === 'top' ? d : h - d
    fill(b, cx - rx, cy - ry, cx + rx, cy + ry, (_px, _py, x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny
      if (r > 1) return null
      const l = -(nx + ny) * 0.55
      return r > 0.7 ? stone[0] : l > 0.2 ? stone[1] : l > -0.2 ? stone[2] : stone[3]
    })
  }
  // A plank dock running from the far edge down to the water.
  if (look.dock) {
    const x0 = Math.floor(w * (0.25 + rand() * 0.5)), dw = 10, plank = 0x9a6a3a, seam = 0x6b4422
    fill(b, x0, 0, x0 + dw, h, (_px, _py, x, y) => {
      if (x - x0 < EDGE || x0 + dw - x < EDGE) return shade(seam, -0.3)
      if (Math.floor(y) % 2 === 0 && y - Math.floor(y) < EDGE) return seam // one board per two units
      return noise2(x * 0.25, y * 3, seed + 32) > 0.62 ? shade(plank, -0.12) : (x - x0 < 2 ? shade(plank, 0.12) : plank)
    })
  }
  // Decor away from the shore; trees last so their crowns sit on top.
  for (const p of [...look.decor].sort((a, z) => +TREES.has(a.kind) - +TREES.has(z.kind))) {
    for (let i = 0; i < p.count; i++) {
      const art = topProp(p, seed + i * 7 + p.kind.length * 131)
      const aw = art.w / FINE, ah = art.h / FINE, room = h - ah - SHORE * 2 - 1
      if (room < 0) continue
      const x = rand() * (w - aw), d = SHORE * 2 + rand() * room
      blit(b, art, Math.floor(x * FINE), Math.floor((waterSide === 'top' ? d : h - d - ah) * FINE))
    }
  }
  return b
}

function groundTop(look: PlaceLook, x: number, y: number, seed: number): number {
  const g = look.bank, n = noise2(x * 1.3, y * 1.3, seed + 21), m = noise2(x * 0.2, y * 0.2, seed + 22)
  switch (look.ground) {
    case 'steppe': return m > 0.65 ? shade(g, -0.12) : n > 0.7 ? shade(g, 0.12) : n < 0.25 ? shade(g, -0.08) : g
    case 'turf': return hash2(Math.floor(x * FINE), Math.floor(y * FINE) + seed) > 0.85 ? shade(g, 0.25) : m > 0.6 ? shade(g, -0.12) : n > 0.6 ? shade(g, 0.08) : g
    case 'mud': {
      const wet = shade(g, -0.15)
      if (m > 0.86) return mix(look.sky[1], wet, 0.55 + (n - 0.5) * 0.2) // puddle catching the sky
      return n > 0.62 ? shade(wet, 0.1) : n < 0.3 ? shade(wet, -0.12) : wet
    }
    case 'beach': {
      const p = hash2(Math.floor(x * 2), Math.floor(y * 2) + seed)
      return p > 0.75 ? shade(look.edge, 0.15) : p > 0.45 ? g : p > 0.2 ? shade(g, -0.15) : shade(look.edge, -0.3)
    }
    case 'cobbles': {
      // Staggered rows of stones, each nudged and sized by its own hash so no grid shows.
      const cy = Math.floor(y / 3), u = x / 3.5 + (cy % 2) * 0.5, cx = Math.floor(u), hh = hash2(cx, cy + seed)
      const fx = u - cx - 0.5 - (hh - 0.5) * 0.25, fy = y / 3 - cy - 0.5 - (hash2(cy, cx + seed) - 0.5) * 0.25
      if (fx * fx + fy * fy > 0.13 + 0.12 * hh) return shade(g, -0.25)
      const c = hh > 0.6 ? look.edge : hh > 0.3 ? g : shade(g, -0.12)
      return -(fx + fy) > 0.15 ? shade(c, 0.15) : fx + fy > 0.25 ? shade(c, -0.2) : c
    }
  }
}
