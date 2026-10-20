import type { LocationId } from '../game/data'
import type { Grid } from './pixels'

export interface Decor { grid: Grid; palette: Record<string, number>; perBank: number }
// Side-view skyline layer, drawn far to near standing on the waterline.
// trees: width = crown px (default 7), cover = share of the skyline with groves (default 1).
// haze: how much the layer fades into the sky (default 0.4 for the farthest layer down to 0.1 for the nearest).
export interface HorizonLayer { kind: 'peaks' | 'hills' | 'bardas' | 'trees'; colors: number[]; height: number; width?: number; cover?: number; haze?: number }
// water: top-down bands from the banks toward mid-river (water[0] is also the side view's surface); deep: side view's bottom.
// riverH: top-down water height. bank/edge: top-down ground and shore strip; the side view uses bank for its ground, edge for stones, soil below.
// shoreX: side-view bank width. ground: what the bank's surface is made of.
// decor: props on the title's banks, seen from above (count per bank); props: side-view props standing on the bank;
// drift: floats on the top-down river. The dock shows on both views.
export interface PlaceLook {
  water: number[]; deep: number; ripple: number; bank: number; edge: number; soil: number; riverH: number
  sky: [number, number]; horizon: HorizonLayer[]; shoreX: number; dock: boolean; ground: Ground
  decor: Prop[]; props: Prop[]; drift: Decor
}
export type Ground = 'steppe' | 'cobbles' | 'mud' | 'turf' | 'beach'
export type PropKind = 'lenga' | 'poplar' | 'willow' | 'log' | 'rock' | 'coiron' | 'lupine'
// colors[0] is the main colour (foliage, bark, stone, blades, flowers); colors[1] an optional accent.
export interface Prop { kind: PropKind; colors: number[]; count: number }

// --- drift on the top-down river ---
const FOAM: Decor = { grid: ['w.ww', '.ww.'], palette: { w: 0xe8f4f8 }, perBank: 6 }
const POPLAR_LEAF: Decor = { grid: ['.y', 'yY', 'y.'], palette: { y: 0xd8b830, Y: 0xf2d860 }, perBank: 7 }
const TWIG: Decor = { grid: ['oo....', '.oooo.', '....oo'], palette: { o: 0x5a3a1e }, perBank: 4 }
const LENGA_LEAF: Decor = { grid: ['.r', 'rR', 'r.'], palette: { r: 0xa8402a, R: 0xd8603a }, perBank: 7 }

// --- props: side view on the fishing bank, top-down on the title's banks ---
const coiron = (count: number, colors = [0xb8983e, 0xe0c060]): Prop => ({ kind: 'coiron', colors, count })
const lupine = (p: number, P: number, count: number): Prop => ({ kind: 'lupine', colors: [p, P], count })
const rock = (count: number): Prop => ({ kind: 'rock', colors: [0x8a9097], count })
const log = (count: number): Prop => ({ kind: 'log', colors: [0x7a5230], count })
const PURPLE: [number, number] = [0x7a3aa8, 0xc070d8], PINK: [number, number] = [0xb04a8a, 0xe890c0]

const ANDES_FAR: HorizonLayer = { kind: 'peaks', colors: [0x8a9ab0, 0xf4f8fc], height: 44 }

// Steppe arroyo: coirón, lupines, low ochre hills, the Andes small and far away.
const CREEK: PlaceLook = {
  water: [0x6ab8d0, 0x5eaec8, 0x52a3c0, 0x4698b6], deep: 0x1a4a62, ripple: 0xbfe6f2,
  bank: 0xb89a48, edge: 0x9a948a, soil: 0x7a5a34, riverH: 150,
  sky: [0x5aa0e0, 0xcfe6f4],
  horizon: [ANDES_FAR, { kind: 'hills', colors: [0xb8a060], height: 28 }],
  shoreX: 76, dock: false, ground: 'steppe',
  decor: [coiron(40), rock(6), lupine(...PURPLE, 14), lupine(...PINK, 10)],
  props: [coiron(8), lupine(...PURPLE, 3), lupine(...PINK, 2)],
  drift: FOAM,
}

// Clear water over cobbles, ochre bardas, a row of poplars, distant snowy peaks.
const RIVER: PlaceLook = {
  water: [0x58aacc, 0x4c9ec2, 0x4092b8, 0x3486ae], deep: 0x123c58, ripple: 0xaedcee,
  bank: 0x9a948a, edge: 0xc0b8a8, soil: 0x7a6a50, riverH: 180,
  sky: [0x4a96dc, 0xd4e8f4],
  horizon: [
    { ...ANDES_FAR, height: 56 },
    { kind: 'bardas', colors: [0xc89a5a, 0xb07a44, 0xd8b070, 0x9a6a3a], height: 40 },
    { kind: 'trees', colors: [0x2f5a24, 0x3f7a2e], height: 44, width: 4, cover: 0.25 },
  ],
  shoreX: 70, dock: false, ground: 'cobbles',
  decor: [rock(14), coiron(8), { kind: 'poplar', colors: [0x3f7a2e], count: 4 }],
  props: [coiron(3), rock(2)],
  drift: POPLAR_LEAF,
}

// Wide and slow, darker water, tall bardas, poplars and willows, driftwood on a muddy bank.
const BIG_RIVER: PlaceLook = {
  water: [0x3f88a8, 0x377c9e, 0x2f7094, 0x27648a], deep: 0x0c2a40, ripple: 0x8ac0d8,
  bank: 0x7a6a40, edge: 0x4a3a24, soil: 0x5a4a2e, riverH: 200,
  sky: [0x4a90d8, 0xe0e8ec],
  horizon: [
    { kind: 'bardas', colors: [0xc89a5a, 0xb07a44, 0xd8b070, 0x9a6a3a], height: 80 },
    { kind: 'trees', colors: [0x2f5a24, 0x3f7a2e], height: 44, width: 4, cover: 0.35 },
    { kind: 'trees', colors: [0x4a7a2e, 0x5a8a3a], height: 32, width: 11, cover: 0.3 },
  ],
  shoreX: 80, dock: false, ground: 'mud',
  decor: [coiron(12, [0x5a6a2a, 0x7a8a3a]), log(3), { kind: 'willow', colors: [0x5a8a3a], count: 4 }],
  props: [{ kind: 'willow', colors: [0x5a8a3a], count: 2 }, log(1)],
  drift: TWIG,
}

// Turquoise glacial water, lenga forest with some autumn red, snowy peaks close and tall.
const MOUNTAIN_LAKE: PlaceLook = {
  water: [0x3ac0c0, 0x31b0b6, 0x28a0ac, 0x1f94a8], deep: 0x0a4058, ripple: 0xa8e6e2,
  bank: 0x4a7a4a, edge: 0x8a8f96, soil: 0x5a5a5a, riverH: 190,
  sky: [0x3a86d4, 0xdcecf6],
  horizon: [
    { kind: 'peaks', colors: [0x5a6478, 0xffffff], height: 84 },
    { kind: 'trees', colors: [0x1f4a2a, 0x2f6a3a, 0x2a5a30, 0x1f4a2a, 0xa8402a, 0x2f6a3a, 0x2a5a30], height: 32 },
  ],
  shoreX: 70, dock: false, ground: 'turf',
  decor: [rock(6), { kind: 'lenga', colors: [0x2f6a3a, 0xb04a2a], count: 18 }],
  props: [{ kind: 'lenga', colors: [0x2f6a3a, 0xb04a2a], count: 1 }, log(1), rock(1)],
  drift: LENGA_LEAF,
}

// Deep blue water, the Andes filling the sky, dark forest at their foot, a cobble beach and a long dock.
const GREAT_LAKE: PlaceLook = {
  water: [0x2a70b8, 0x2464ac, 0x1e58a0, 0x184c94], deep: 0x061830, ripple: 0x8ab8e8,
  bank: 0xa8a090, edge: 0xc0b8a8, soil: 0x7a6a50, riverH: 220,
  sky: [0x2a78cc, 0xd8eaf6],
  horizon: [
    { kind: 'peaks', colors: [0x4a5468, 0xffffff], height: 100 },
    { kind: 'trees', colors: [0x1f3a2a, 0x2a4a34], height: 28 },
  ],
  shoreX: 46, dock: true, ground: 'beach',
  decor: [rock(10)],
  props: [{ kind: 'lenga', colors: [0x2f6a3a], count: 1 }],
  drift: FOAM,
}

// Named art styles (seam for future cosmetics); only `default` exists today.
export const PLACE_STYLES: Record<string, Record<LocationId, PlaceLook>> = {
  default: { creek: CREEK, river: RIVER, bigRiver: BIG_RIVER, mountainLake: MOUNTAIN_LAKE, greatLake: GREAT_LAKE },
}

export function placeLook(id: LocationId, style = 'default'): PlaceLook {
  return (PLACE_STYLES[style] ?? PLACE_STYLES.default)[id]
}
