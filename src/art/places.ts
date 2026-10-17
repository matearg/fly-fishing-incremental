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

// shortcut: the other places reuse the Creek until Task 5 gives each its own look
export const PLACE_LOOKS: Record<LocationId, PlaceLook> = {
  creek: CREEK, river: CREEK, bigRiver: CREEK, mountainLake: CREEK, greatLake: CREEK,
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
