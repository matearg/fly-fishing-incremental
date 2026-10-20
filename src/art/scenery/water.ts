// Side-view water under the waterline, baked fine: depth ramp, the horizon's wobbly reflection, glints,
// light shafts, specks, and a gravel bed with stones and weeds below `clear`.
import { lcg } from '../../game/util/rand'
import { FINE, mix, type Bitmap } from '../pixels'
import type { PlaceLook } from '../places'
import { fbm, hash2, noise1, noise2, ramp, shade } from './noise'
import { fill, fineBlank, getPx } from './raster'

const STEPS = 8
const REFLECT = 24 // world rows of the horizon mirrored under the waterline
const EDGE = 1 / FINE

// Water-local world y of the bed's top at x; stays between `clear` and the bottom two rows.
export const bedTop = (x: number, h: number, clear: number, seed: number) => h - 2 - (h - 2 - clear) * fbm(x * 0.025, seed + 11)

export function bakeSideWater(look: PlaceLook, reflect: Bitmap, w: number, h: number, clear: number, seed: number): Bitmap {
  const b = fineBlank(w, h)
  const wat = Array.from({ length: STEPS }, (_, i) => mix(look.water[0], look.deep, i / (STEPS - 1)))
  const gravel = [0x9a9080, 0x6a6052, 0x4a4238].map(c => mix(c, look.deep, 0.6))
  const rh = reflect.h / FINE
  // Per fine column: the bed, the light-shaft phase and whether the surface line shows.
  const col = (f: (x: number) => number) => Float64Array.from({ length: b.w }, (_, px) => f((px + 0.5) / FINE))
  const beds = col(x => bedTop(x, h, clear, seed)), phase = col(x => 3 * noise1(x * 0.01, seed + 12)), surf = col(x => noise1(x * 0.3, seed + 14))
  fill(b, 0, 0, w, h, (px, py, x, y) => {
    const t = y / h
    let c = ramp(wat, Math.pow(t, 0.85), px, py)
    const sh = Math.max(0, Math.sin((x - y * 0.55) * 0.07 + phase[px])) // slanted light shafts
    c = shade(c, 0.14 * Math.pow(sh, 5) * (1 - t))
    if (y < REFLECT) {
      const wob = Math.round(Math.sin(y * 1.5 + x * 0.04) * (0.6 + y * 0.05) * FINE)
      const rc = getPx(reflect, px + wob, Math.floor((rh - y) * FINE))
      c = mix(c, mix(rc, wat[0], 0.35), 0.6 * (1 - y / REFLECT))
      if (noise2(x * 0.12, y * 1.4, seed + 13) > 0.74) c = shade(c, 0.18) // glint dashes
    }
    if (y < EDGE && surf[px] > 0.35) c = look.ripple
    const bed = beds[px]
    if (y >= bed) {
      const g = noise2(x * 0.5, y * 0.5, seed + 15)
      c = g > 0.62 ? gravel[0] : g > 0.38 ? gravel[1] : gravel[2]
      if (y - bed < EDGE) c = shade(c, 0.1)
    }
    if (hash2(px * 7 + 3, py * 13 + seed) > 0.9986 && t < 0.8) c = shade(c, 0.3) // drifting specks
    return c
  })
  const rand = lcg(seed + 17), deepest = wat[STEPS - 1]
  const dot = (x: number, y: number, c: number) => fill(b, x, y, x + EDGE, y + EDGE, () => c)
  // Weeds swaying up from the bed, where there's room for them.
  if (h - clear > 6) for (let i = 0; i < w / 10; i++) {
    const x0 = rand() * w, len = 4 + rand() * Math.min(26, h - clear), col = rand() < 0.5 ? 0x2a6a3a : 0x3a7a2a, ph = rand() * 6
    for (let v = 0; v < len; v += EDGE) dot(x0 + Math.sin(v * 0.22 + ph) * 2.2 * (v / len), bedTop(x0, h, clear, seed) - v + 1, mix(col, deepest, v / len < 0.5 ? 0.35 : 0.65))
  }
  // Rounded stones resting on the bed, lit from the upper left.
  const stone = [0x2a2620, 0xa8a090, 0x7a7468, 0x55504a].map(c => mix(c, look.deep, 0.55))
  for (let i = 0; i < w / 18; i++) {
    const cx = rand() * w, rx = 2 + rand() * 4, ry = rx * 0.6, cy = bedTop(cx, h, clear, seed) + ry * 0.3
    fill(b, cx - rx, cy - ry, cx + rx, cy + ry, (_px, _py, x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r = nx * nx + ny * ny
      if (r > 1) return null
      const l = -(nx + ny) * 0.5
      return r > 0.75 ? stone[0] : l > 0.2 ? stone[1] : l > -0.2 ? stone[2] : stone[3]
    })
  }
  return b
}
