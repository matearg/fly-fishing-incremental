import { paint, type Bitmap, type Grid } from '../pixels'

export type Pose = 'idle' | 'back' | 'cast' | 'reel'
export type FigureKind = 'angler' | 'helper'
// Poses are shared; a style recolours them (seam for future cosmetics).
export interface FigureStyle { palette: Record<string, number> }

// Side view facing right (the water): felt hat, shirt, belt, waders, boots. Arm and rod are added per pose.
// o outline, h hat, H band, s skin, e eye, c shirt, C shirt shade, b belt, p waders, P waders shade, w boots
const BODY: Grid = [
  '....oooooo....',
  '...ohhhhhho...',
  '...oHHHHHHo...',
  '..oohhhhhhoo..',
  '.ohhhhhhhhhhho',
  '.oooooooooooo.',
  '...ossssesso..',
  '...ossssssso..',
  '....osssssso..',
  '....ooossooo..',
  '...occccccco..',
  '..oCcccccccco.',
  '..oCcccccccco.',
  '..oCcccccccco.',
  '..oCcccccccco.',
  '..oCcccccccco.',
  '..obbbbbbbbbo.',
  '..oPppppppppo.',
  '..oPppppppppo.',
  '..oPppppppppo.',
  '..oPpppoPpppo.',
  '..oPppo.oPppo.',
  '..oPppo.oPppo.',
  '..oPppo.oPppo.',
  '..oPppo.oPppo.',
  '..oPppo.oPppo.',
  '..owwwo.owwwo.',
  '..owwwwoowwwwo',
  '..owwwwoowwwwo',
  '..oooooooooooo',
]
// Empty margin left of and above BODY so the back-cast rod fits; scenes place sprites at x - BODY_X.
const PAD_L = 6, PAD_T = 8
export const BODY_X = PAD_L
export const BODY_Y = PAD_T
const W = PAD_L + 28 // body plus room for the rod
const SHOULDER: [number, number] = [9, 11]

// k cork grip, r rod. Each rod is a polyline from the hand; its last point is the tip. In BODY coordinates.
const POSES: Record<Pose, { hand: [number, number]; rod: [number, number][] }> = {
  idle: { hand: [12, 15], rod: [[13, 15], [25, 3]] },
  back: { hand: [13, 8], rod: [[13, 7], [12, 4], [8, -3], [1, -7]] }, // raised by the shoulder, rod up and back over the hat
  cast: { hand: [13, 12], rod: [[14, 12], [27, 9]] },
  reel: { hand: [12, 11], rod: [[13, 11], [16, 3], [20, 1], [24, 2], [25, 5]] }, // raised and bent by the fish
}
const pad = ([x, y]: [number, number]): [number, number] => [x + PAD_L, y + PAD_T]

function line(rows: string[][], [x0, y0]: [number, number], [x1, y1]: [number, number], ch: (i: number) => string, start = 0): number {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / (n || 1)), y = Math.round(y0 + ((y1 - y0) * i) / (n || 1))
    rows[y][x] = ch(start + i)
  }
  return start + n + 1
}

function poseGrid(pose: Pose): Grid {
  const rows = [...Array<string>(PAD_T).fill(''), ...BODY].map(r => [...('.'.repeat(r ? PAD_L : 0) + r).padEnd(W, '.')])
  const hand = pad(POSES[pose].hand), rod = POSES[pose].rod.map(pad), shoulder = pad(SHOULDER)
  for (const dy of [0, 1]) line(rows, [shoulder[0], shoulder[1] + dy], [hand[0] - 1, hand[1] + dy], () => 'C') // sleeve
  for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) rows[hand[1] + dy][hand[0] + dx] = 's'
  let n = 0
  for (let i = 1; i < rod.length; i++) n = line(rows, rod[i - 1], rod[i], k => (k < 3 ? 'k' : 'r'), i === 1 ? 0 : n - 1)
  return rows.map(r => r.join(''))
}

const POSE_NAMES = Object.keys(POSES) as Pose[]
export const FIGURE_POSES = Object.fromEntries(POSE_NAMES.map(p => [p, poseGrid(p)])) as Record<Pose, Grid>
// Pixel the line leaves from, relative to the sprite's top-left.
export const ROD_TIP = Object.fromEntries(POSE_NAMES.map(p => [p, pad(POSES[p].rod[POSES[p].rod.length - 1])])) as Record<Pose, [number, number]>
export const FEET_Y = PAD_T + BODY.length - 1

const BASE = { o: 0x10161c, h: 0x8a6a3e, H: 0x3a2a18, s: 0xe8c8a0, e: 0x10161c, b: 0x3a2a18, p: 0x5a6a4a, P: 0x46543a, w: 0x3a3026, k: 0xd8b880, r: 0x2a1a0e }
export const FIGURE_STYLES: Record<FigureKind, Record<string, FigureStyle>> = {
  angler: { default: { palette: { ...BASE, c: 0xd9534f, C: 0xa83a36 } } },
  helper: { default: { palette: { ...BASE, c: 0x4f8fe0, C: 0x3a6ab0, h: 0x6a7a5a } } },
}

export function figureBitmaps(kind: FigureKind, style = 'default'): Record<Pose, Bitmap> {
  const { palette } = FIGURE_STYLES[kind][style] ?? FIGURE_STYLES[kind].default
  return Object.fromEntries(POSE_NAMES.map(p => [p, paint(FIGURE_POSES[p], palette)])) as Record<Pose, Bitmap>
}
