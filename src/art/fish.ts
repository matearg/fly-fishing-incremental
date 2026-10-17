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

// How many of each tier swim in a school.
export const TIER_SCHOOL: Record<Tier, number> = { common: 3, uncommon: 2, rare: 1, legendary: 1 }

const OUTLINE = 0x10222b
const EYE = 0x0b0b0b
// b body, a back stripe, f fins
export const FISH_COLORS: Record<string, { b: number; a: number; f: number }> = {
  dace: { b: 0xc9d3d8, a: 0x8fa3ad, f: 0xb0bec5 },
  brookTrout: { b: 0x6b7f3a, a: 0x3d4f1f, f: 0xe06a2a },
  creekChub: { b: 0xb8a77a, a: 0x7a6a45, f: 0xc9b98a },
  brownTrout: { b: 0xa8742e, a: 0x6b4416, f: 0xd9a04a },
  grayling: { b: 0x9aa3b8, a: 0x5c6680, f: 0x8a6bb8 },
  rainbowTrout: { b: 0xb8c2c8, a: 0xd96a8a, f: 0x9aa8b0 },
  smallmouthBass: { b: 0x8a7a3a, a: 0x5a4a1f, f: 0xa89a5a },
  pike: { b: 0x5f8a3a, a: 0x3a5a1f, f: 0x8aa84a },
  perch: { b: 0xd9c23a, a: 0x4a5a1f, f: 0xe8722e },
  walleye: { b: 0xc9a85a, a: 0x7a6a3a, f: 0xd9c28a },
  catfish: { b: 0x5a5f66, a: 0x3a3d42, f: 0x7a7f86 },
  muskie: { b: 0x8aa86a, a: 0x4a6a3a, f: 0xa8b88a },
  cutthroat: { b: 0xb8a882, a: 0xd9442e, f: 0xc9b892 },
  goldenTrout: { b: 0xf2c14e, a: 0xd9442e, f: 0xffd97a },
  lakeTrout: { b: 0x6a7a8a, a: 0x3a4a5a, f: 0x9aaab8 },
  arcticChar: { b: 0xd9662e, a: 0x8a3a1f, f: 0xf2f2e8 },
  tigerTrout: { b: 0xd9b84a, a: 0x3a2a12, f: 0xe8c86a },
  whitefish: { b: 0xe8ecef, a: 0xaab4bb, f: 0xd0d8dd },
  cisco: { b: 0xc0cfdb, a: 0x6a8aa8, f: 0xd8e2ea },
  steelhead: { b: 0x9fb2c0, a: 0xc95a7a, f: 0xb8c8d4 },
  lakeSturgeon: { b: 0x7a7a6a, a: 0x4a4a3a, f: 0x9a9a8a },
  ghostSturgeon: { b: 0xe8f2f8, a: 0xa8d8f2, f: 0xf8ffff },
}

export function fishBitmaps(speciesId: string): [Bitmap, Bitmap] {
  const tier = SPECIES.find(s => s.id === speciesId)!.tier
  const pal = { ...FISH_COLORS[speciesId], o: OUTLINE, e: EYE }
  return [paint(FISH_TOP[tier][0], pal), paint(FISH_TOP[tier][1], pal)]
}
