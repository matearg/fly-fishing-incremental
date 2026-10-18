import { SPECIES, type Tier } from '../game/data'
import { paint, type Bitmap, type Grid } from './pixels'

// Top-down fish facing right: tail fan, oval body with a darker back stripe, two eyes.
// Frame 0/1 swing the tail to either side for the wiggle.
function fishGrid(len: number, h: number, frame: 0 | 1): Grid {
  const tail = Math.round(len * 0.28)
  const cx = (tail + len - 1) / 2, rx = (len - 1 - tail) / 2, cy = (h - 1) / 2, ry = (h - 1) / 2
  const inBody = (x: number, y: number) => x >= tail && ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1
  const swing = frame === 0 ? -1 : 1
  const rows: string[][] = Array.from({ length: h }, () => Array(len).fill('.'))
  for (let y = 0; y < h; y++) for (let x = 0; x < len; x++) {
    if (inBody(x, y)) {
      const edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1)
      rows[y][x] = edge ? 'o' : y === Math.round(cy) && x < len - 2 ? 'a' : 'b'
    } else if (x < tail) {
      const spread = Math.round(ry * (tail - x) / tail) // fans out toward the tip
      const mid = Math.round(cy) + (x < tail - 1 ? swing : 0)
      if (Math.abs(y - mid) <= spread && !(x === 0 && y === mid)) rows[y][x] = 'f' // forked tip
    }
  }
  const ex = len - 3, ey = Math.round(ry * 0.5)
  for (const y of [Math.round(cy) - ey, Math.round(cy) + ey]) if (rows[y]?.[ex] === 'b') rows[y][ex] = 'e'
  return rows.map(r => r.join(''))
}

const SIZES: Record<Tier, [number, number]> = { common: [10, 5], uncommon: [13, 7], rare: [16, 7], legendary: [20, 9] }
export const FISH_TOP = Object.fromEntries(
  Object.entries(SIZES).map(([t, [l, h]]) => [t, [fishGrid(l, h, 0), fishGrid(l, h, 1)]]),
) as Record<Tier, [Grid, Grid]>

// Side view facing right: forked tail, dorsal and anal fins, darker back over a lighter belly, one eye.
// Frame 1 narrows the tail fork for the wiggle.
function fishSideGrid(len: number, h: number, frame: 0 | 1): Grid {
  const tail = Math.round(len * 0.25), top = Math.max(1, Math.round(h * 0.2)), bottom = h - 2
  const cx = (tail + len - 1) / 2, rx = (len - 1 - tail) / 2, cy = (top + bottom) / 2, ry = (bottom - top) / 2
  const inBody = (x: number, y: number) => x >= tail && ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1
  const rows: string[][] = Array.from({ length: h }, () => Array(len).fill('.'))
  for (let y = 0; y < h; y++) for (let x = 0; x < len; x++) {
    if (inBody(x, y)) {
      const edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1)
      rows[y][x] = edge ? 'o' : y < cy - ry / 3 ? 'a' : 'b'
    } else if (x < tail) {
      const spread = Math.max(0, Math.round(ry * (tail - x) / tail) - frame) // fans out toward the tip
      if (Math.abs(y - Math.round(cy)) <= spread && !(x === 0 && y === Math.round(cy))) rows[y][x] = 'f' // forked tip
    }
  }
  const fin = (x0: number, x1: number, dir: -1 | 1) => {
    for (let x = x0; x <= x1; x++) {
      let y = dir < 0 ? 0 : h - 1
      while (rows[y]?.[x] === '.' && (dir < 0 ? y < top : y > bottom)) y -= dir
      const hgt = Math.round(((x1 - x) / Math.max(1, x1 - x0)) * (dir < 0 ? top : 1)) // swept back
      for (let k = 1; k <= hgt; k++) if (rows[y + dir * k]?.[x] === '.') rows[y + dir * k][x] = 'f'
    }
  }
  fin(Math.round(cx - rx * 0.4), Math.round(cx + rx * 0.2), -1)
  fin(Math.round(cx - rx * 0.5), Math.round(cx - rx * 0.1), 1)
  const ex = len - 3, ey = Math.round(cy) - 1
  if (rows[ey]?.[ex] === 'a' || rows[ey]?.[ex] === 'b') rows[ey][ex] = 'e'
  return rows.map(r => r.join(''))
}

const SIDE_SIZES: Record<Tier, [number, number]> = { common: [12, 7], uncommon: [15, 8], rare: [19, 9], legendary: [24, 11] }
export const FISH_SIDE = Object.fromEntries(
  Object.entries(SIDE_SIZES).map(([t, [l, h]]) => [t, [fishSideGrid(l, h, 0), fishSideGrid(l, h, 1)]]),
) as Record<Tier, [Grid, Grid]>
// The mouth pixel the fly meets: the tip of the snout.
export const FISH_MOUTH = Object.fromEntries(
  Object.entries(FISH_SIDE).map(([t, [g]]) => {
    const lens = g.map(row => row.replace(/\.+$/, '').length), max = Math.max(...lens)
    const tips = lens.flatMap((l, y) => (l === max ? [y] : []))
    return [t, [max - 1, tips[tips.length >> 1]]]
  }),
) as Record<Tier, [number, number]>

// How many of each tier swim in a school.
export const TIER_SCHOOL: Record<Tier, number> = { common: 3, uncommon: 2, rare: 1, legendary: 1 }

const OUTLINE = 0x10222b
const EYE = 0x0b0b0b
export interface FishColors { b: number; a: number; f: number }
// b body, a back, f fins. Palettes follow the Patagonian names (see data.ts).
export const FISH_COLORS: Record<string, FishColors> = {
  dace: { b: 0xc8ccb0, a: 0x7a8a5a, f: 0xa8b090 }, // Puyen: translucent olive with silver
  brookTrout: { b: 0x6b7f3a, a: 0x3d4f1f, f: 0xe06a2a },
  creekChub: { b: 0x9a8a6a, a: 0x5a4a32, f: 0x7a6a4a }, // Otuno: small brown catfish
  brownTrout: { b: 0xa8742e, a: 0x6b4416, f: 0xd9a04a },
  grayling: { b: 0xd0d8d0, a: 0x8a9a8a, f: 0xb0c0b8 }, // Peladilla: small and see-through
  rainbowTrout: { b: 0xb8c2c8, a: 0xd96a8a, f: 0x9aa8b0 },
  pike: { b: 0xa8a060, a: 0x5a5a2a, f: 0xc89a4a }, // Bigmouth Perch: bronze-green
  perch: { b: 0xb8b070, a: 0x5a6a3a, f: 0xd0a050 }, // Creole Perch: olive and gold
  walleye: { b: 0xc8d0d8, a: 0x4a5a6a, f: 0x8a9aa8 }, // Chinook Salmon: silver, dark back
  catfish: { b: 0x4a4a50, a: 0x2a2a30, f: 0x5a5a62 }, // Velvet Catfish: dark and velvety
  muskie: { b: 0xe0b850, a: 0x8a5a20, f: 0xf2d880 }, // Limay King: regal gold
  cutthroat: { b: 0xb8b898, a: 0x6a7a5a, f: 0xa0a888 }, // Big Puyen
  goldenTrout: { b: 0xd8dce0, a: 0x6a7a8a, f: 0xa8b4c0 }, // Landlocked Salmon: bright silver
  arcticChar: { b: 0xa8d8e8, a: 0x4a8aa8, f: 0xf2f8ff }, // Glacier Trout: icy blue
  tigerTrout: { b: 0xd9b84a, a: 0x3a2a12, f: 0xe8c86a },
  whitefish: { b: 0xe0e8ee, a: 0x5a8ab8, f: 0xc8d4e0 }, // Pejerrey: silver with a blue stripe
  cisco: { b: 0xc8d0d8, a: 0x5a7a8a, f: 0xd07a90 }, // Steelhead: steel back, pink cheek
  steelhead: { b: 0xd8dcd8, a: 0x6a6a5a, f: 0xb0b0a0 }, // Sea-run Brown Trout: silvered
  lakeSturgeon: { b: 0x8a6a4a, a: 0x4a3420, f: 0xa88a60 }, // El Cuero: a living hide
  ghostSturgeon: { b: 0xe8f2f8, a: 0xa8d8f2, f: 0xf8ffff }, // Nahuelito: pale and ghostly
}

// Named art styles (seam for future cosmetics); only `default` exists today.
export const FISH_STYLES: Record<string, Record<string, FishColors>> = { default: FISH_COLORS }

export function fishColors(id: string, style = 'default'): FishColors {
  return (FISH_STYLES[style] ?? FISH_STYLES.default)[id]
}

export function fishBitmaps(speciesId: string, style = 'default'): [Bitmap, Bitmap] {
  const tier = SPECIES.find(s => s.id === speciesId)!.tier
  const pal = { ...fishColors(speciesId, style), o: OUTLINE, e: EYE }
  return [paint(FISH_TOP[tier][0], pal), paint(FISH_TOP[tier][1], pal)]
}

export function fishSideBitmaps(speciesId: string, style = 'default'): [Bitmap, Bitmap] {
  const tier = SPECIES.find(s => s.id === speciesId)!.tier
  const pal = { ...fishColors(speciesId, style), o: OUTLINE, e: EYE }
  return [paint(FISH_SIDE[tier][0], pal), paint(FISH_SIDE[tier][1], pal)]
}
