import type { LocationId } from '../game/data'
import { lcg } from '../game/rand'
import { blank, blit, paint, type Bitmap, type Grid } from './pixels'

export interface Decor { grid: Grid; palette: Record<string, number>; perBank: number }
// water: bands from the banks toward mid-river; riverH: water height in px on the 270 px canvas
export interface PlaceLook { water: number[]; ripple: number; bank: number; edge: number; riverH: number; decor: Decor[] }

const PEBBLE: Decor = { grid: ['.oo.', 'oggo', '.oo.'], palette: { o: 0x5f6468, g: 0x9a9fa5 }, perBank: 8 }
const TUFT: Decor = { grid: ['.g.g.', 'g.g.g', '.ggg.'], palette: { g: 0x3c6e25 }, perBank: 22 }
const FLOWER: Decor = { grid: ['.y.', 'yoy', '.y.'], palette: { y: 0xf2e8a0, o: 0xe8a03a }, perBank: 6 }

const CREEK: PlaceLook = {
  water: [0x4fa3c4, 0x4598bb, 0x3c8db1, 0x3584aa],
  ripple: 0x9ad6ea,
  bank: 0x5a9a38,
  edge: 0xc9b787,
  riverH: 150,
  decor: [TUFT, PEBBLE, FLOWER],
}

const REED: Decor = { grid: ['.c..', '.c.c', '.r.c', '.r.r', 'rr.r', '.rr.'], palette: { c: 0x7a4a22, r: 0x4f7a2a }, perBank: 18 }
const SAND: Decor = { grid: ['.sss.', 'sssss', '.sss.'], palette: { s: 0xd8c48a }, perBank: 6 }
const RIVER: PlaceLook = {
  water: [0x3f92b8, 0x3786ad, 0x2f7aa1, 0x286f96],
  ripple: 0x8ccbe2,
  bank: 0x6a9a3c,
  edge: 0xd8c48a,
  riverH: 180,
  decor: [SAND, REED, { ...PEBBLE, perBank: 4 }],
}

const LOG: Decor = { grid: ['.oooooooooo.', 'obbbbbbbbbbo', 'obkbbbbkbbbo', '.oooooooooo.'], palette: { o: 0x3a2614, b: 0x7a5230, k: 0x5a3a1e }, perBank: 3 }
const PUDDLE: Decor = { grid: ['.mm.', 'mmmm', '.mm.'], palette: { m: 0x52432a }, perBank: 8 }
const BIG_RIVER: PlaceLook = {
  water: [0x2f6f8f, 0x28648a, 0x225a80, 0x1d5076],
  ripple: 0x6aa6c4,
  bank: 0x6b5a3a,
  edge: 0x4a3a24,
  riverH: 200,
  decor: [PUDDLE, { ...TUFT, palette: { g: 0x4f6a2a }, perBank: 14 }, LOG],
}

const ROCK: Decor = { grid: ['..oooo..', '.oggggo.', 'ogglgggo', 'oggggggo', '.oooooo.'], palette: { o: 0x4a4f55, g: 0x8a9097, l: 0xb8bec4 }, perBank: 6 }
const PINE: Decor = { grid: ['...d...', '..ddd..', '.ddgdd.', 'ddgggdd', '.ddgdd.', '..ddd..', '...d...'], palette: { d: 0x1f4a2a, g: 0x2f6a3a }, perBank: 9 }
const MOUNTAIN_LAKE: PlaceLook = {
  water: [0x3fb0b0, 0x36a2a8, 0x2e94a0, 0x268698],
  ripple: 0xa8e6e2,
  bank: 0x4a7a4a,
  edge: 0x8a8f96,
  riverH: 190,
  decor: [ROCK, PINE],
}

const DOCK: Decor = {
  grid: ['oooooooooo', 'pppppppppp', 'oooooooooo', 'pppppppppp', 'oooooooooo', 'pppppppppp', 'oooooooooo', 'pppppppppp', 'oooooooooo', 'pppppppppp', 'oooooooooo'],
  palette: { o: 0x6b4422, p: 0x9a6a3a },
  perBank: 1,
}
const SHELL: Decor = { grid: ['.w.', 'www'], palette: { w: 0xf2ece0 }, perBank: 10 }
const DUNE_GRASS: Decor = { ...TUFT, palette: { g: 0x8aa84a }, perBank: 10 }
const GREAT_LAKE: PlaceLook = {
  water: [0x2a6aa8, 0x245e9c, 0x1f5290, 0x1a4684],
  ripple: 0x7aaee0,
  bank: 0xe0cf98,
  edge: 0xb8a878,
  riverH: 220,
  decor: [SHELL, DUNE_GRASS, DOCK],
}

export const PLACE_LOOKS: Record<LocationId, PlaceLook> = {
  creek: CREEK, river: RIVER, bigRiver: BIG_RIVER, mountainLake: MOUNTAIN_LAKE, greatLake: GREAT_LAKE,
}

const EDGE_MAX = 5

// One bank strip: grass, a wobbly shore edge on the water side, seeded decor away from the shore.
export function bakeBank(look: PlaceLook, w: number, h: number, waterSide: 'top' | 'bottom', seed: number): Bitmap {
  const b = blank(w, h)
  const fill = (x: number, y: number, c: number) => b.data.set([c >> 16, (c >> 8) & 0xff, c & 0xff, 255], (y * w + x) * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fill(x, y, look.bank)
  for (let x = 0; x < w; x++) {
    const e = Math.max(1, Math.min(EDGE_MAX, 2 + Math.round((Math.sin((x >> 1) * 0.42 + seed) + Math.sin((x >> 1) * 0.14)) * 1.5)))
    for (let i = 0; i < e; i++) fill(x, waterSide === 'top' ? i : h - 1 - i, look.edge)
  }
  const rand = lcg(seed)
  for (const d of look.decor) {
    const art = paint(d.grid, d.palette)
    const room = h - art.h - EDGE_MAX - 2
    for (let i = 0; i < d.perBank; i++) {
      const y = Math.floor(rand() * room)
      blit(b, art, Math.floor(rand() * (w - art.w)), waterSide === 'top' ? h - art.h - y : y)
    }
  }
  return b
}
