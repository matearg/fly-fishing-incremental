// Side-view sky and skyline layers (peaks, hills, bardas, trees), baked fine. The bottom row is the waterline.
import { lcg } from '../../game/util/rand'
import { FINE, mix, type Bitmap } from '../pixels'
import type { HorizonLayer, PlaceLook } from '../places'
import { fbm, noise1, noise2, ramp, ridged, shade } from './noise'
import { fill, fineBlank } from './raster'

const SKY_STEPS = 7
const EDGE = 1 / FINE // one fine pixel, in world units

export function bakeHorizon(look: PlaceLook, w: number, h: number, seed: number): Bitmap {
  const b = fineBlank(w, h), rand = lcg(seed)
  const sky = Array.from({ length: SKY_STEPS }, (_, i) => mix(look.sky[0], look.sky[1], i / (SKY_STEPS - 1)))
  // Flat-bottomed clouds: lumpy tops, a shaded underside, kept clear of the top rows.
  const clouds = Array.from({ length: 2 + Math.floor(rand() * 3) }, () => [rand() * w, 14 + rand() * h * 0.22, 18 + rand() * 28])
  const cloudLit = mix(0xffffff, look.sky[1], 0.15), cloudMid = mix(0xe4ecf6, look.sky[1], 0.3), cloudLow = mix(0xc4d4e8, look.sky[0], 0.2)
  fill(b, 0, 0, w, h, (px, py, x, y) => {
    let c = ramp(sky, Math.pow(y / h, 1.3), px, py)
    for (const [cx, cy, cw] of clouds) {
      const nx = (x - cx) / cw, ny = (y - cy) / (cw * 0.32)
      if (ny > 0.35 || nx * nx + ny * ny > 1.2) continue
      const bump = 0.75 + 0.25 * Math.sin(nx * 9 + cx)
      if (nx * nx + (ny / bump) ** 2 > 1 - noise2(x * 0.25, y * 0.25, seed + 5) * 0.25) continue
      c = ny > 0.1 ? cloudLow : ny > -0.25 || nx > 0.3 ? cloudMid : cloudLit
    }
    return c
  })
  look.horizon.forEach((L, i) => {
    const n = look.horizon.length
    const haze = L.haze ?? (n === 1 ? 0.1 : 0.4 - (0.3 * i) / (n - 1)) // far layers fade most into the sky
    const s = seed + (i + 1) * 101
    if (L.kind === 'trees') trees(b, L, w, h, s, haze, look.sky[1], rand)
    else ridge(b, L, w, h, s, haze, look.sky[1])
  })
  return b
}

// Peaks, hills and bardas: a height profile filled down to the waterline.
function ridge(b: Bitmap, L: HorizonLayer, w: number, h: number, seed: number, haze: number, hz: number): void {
  const H = L.height
  const f = 0.9 / H // wider layers get broader shapes, so tall ranges stay rounded
  let top: (x: number) => number
  if (L.kind === 'peaks') top = x => h - H * (0.3 + 0.7 * (0.55 * ridged(x * f, seed, 3) + 0.45 * fbm(x * f, seed)))
  else if (L.kind === 'hills') top = x => h - H * (0.5 + 0.5 * fbm(x * f * 0.7, seed, 3))
  else top = x => {
    const notch = Math.max(0, noise1(x * 0.035, seed + 3) - 0.72) / 0.28 // the odd dry gully cut into the mesa
    return h - H * (0.84 + 0.12 * (fbm(x * 0.01, seed, 2) - 0.5)) + H * 0.4 * Math.min(1, notch * 2.5)
  }
  const [rock, snow] = L.colors, shadow = shade(rock, -0.25), snowSh = mix(snow ?? rock, rock, 0.3)
  // The profile only depends on x, so it is sampled once per fine column.
  const tops = Float64Array.from({ length: b.w + 2 }, (_, i) => top((i - 0.5) / FINE))
  fill(b, 0, h - H - 2, w, h, (px, py, x, y) => {
    const t = tops[px + 1]
    if (y < t) return null
    const d = y - t, dh = tops[px] - tops[px + 2]
    const lit = dh > 0.12 ? true : dh < -0.12 ? false : noise2(x * 0.4, y * 0.4, seed) > 0.5 // sun from the left
    let c: number
    if (L.kind === 'peaks') {
      const gul = noise2((x + y * 0.5) * 0.25, y * 0.07, seed + 5)
      const line = h - H * 0.62 + 12 * (noise1(x * 0.06, seed + 9) - 0.5) + (gul > 0.62 ? (gul - 0.62) * 50 : 0) + (lit ? 4 : -3)
      if (y < line && snow !== undefined) c = lit ? snow : snowSh
      else {
        c = lit ? rock : shadow
        if (gul < 0.3) c = shade(c, -0.15)
        else if (gul > 0.72) c = shade(c, 0.1)
        if (noise2(x * 1.5, y * 1.5, seed + 2) > 0.75) c = shade(c, -0.1)
      }
      if (d < EDGE) c = shade(shadow, -0.3)
    } else if (L.kind === 'hills') {
      c = lit ? L.colors[0] : shade(L.colors[0], -0.15)
      const g = noise2(x * 1.2, y * 1.2, seed + 2)
      if (g > 0.68) c = shade(c, 0.1)
      else if (g < 0.28) c = shade(c, -0.1)
      if (d < EDGE) c = shade(L.colors[0], -0.3)
    } else {
      c = L.colors[Math.floor((h - y + 3 * fbm(x * 0.03, seed + 4)) / 4) % L.colors.length]
      if (noise2(x * 0.35, y * 0.04, seed + 6) > 0.7) c = shade(c, -0.18) // vertical gullies
      else if (!lit) c = shade(c, -0.1)
      if (d < EDGE) c = shade(L.colors[0], -0.35)
    }
    return mix(c, hz, haze * (0.5 + 0.5 * Math.min(1, d / 50)))
  })
}

// Individual crowns standing on the waterline: lit left, shaded right, leafy edges. Narrow ones are pointed poplars.
function trees(b: Bitmap, L: HorizonLayer, w: number, h: number, seed: number, haze: number, hz: number, rand: () => number): void {
  const wd = L.width ?? 7, cover = L.cover ?? 1, pointed = wd <= 5, p1 = rand() * 6
  for (let x = Math.floor(rand() * 3) - wd, i = 0; x < w + wd; x += Math.max(2, Math.round(wd * 0.7)) + Math.floor(rand() * 2), i++) {
    if (cover < 1 && (Math.sin(x * 0.012 + p1) + 1) / 2 > cover) continue
    const th = L.height * (0.55 + 0.45 * rand()), cx = x + wd / 2, half = (wd / 2) * (0.8 + 0.4 * rand())
    const c = L.colors[Math.floor(rand() * L.colors.length)], cols = [shade(c, -0.3), c, shade(c, 0.2)], s = seed + i * 7
    fill(b, cx - half - 1, h - th, cx + half + 1, h, (_px, _py, xx, y) => {
      const v = (h - y) / th // 0 at the ground, 1 at the top
      if (v > 1) return null
      // Pointed: a spire widest low down. Rounded: full below, then lumpy tiers closing to a round top.
      let r = pointed ? half * Math.min(1, 3 * v) * Math.pow(1 - v, 0.9) * 1.4
        : half * (v < 0.5 ? 1 : Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05 + 0.08)), 0.7)) * (0.86 + 0.14 * Math.cos(v * th * 0.8))
      r *= 0.8 + 0.4 * noise2(xx * 0.7, y * 0.7, s)
      if (Math.abs(xx - cx) > r) return null
      const u = (xx - cx) / Math.max(r, 0.1), light = -u * 0.6 + (v - 0.5) * 0.5 + (noise2(xx * 1.3, y * 1.3, s + 1) - 0.5) * 0.9
      let k = light > 0.3 ? cols[2] : light > -0.25 ? cols[1] : cols[0]
      if (Math.abs(xx - cx) > r - EDGE && light < 0) k = shade(cols[0], -0.3)
      return mix(k, hz, haze)
    })
  }
}
