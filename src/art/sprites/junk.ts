import { paint, type Bitmap, type Grid } from '../pixels'
import { refine } from '../refine'

// Side-view junk that drifts into the line. One entry per JUNK id in data.ts.
const O = 0x10161c

// Tire: a ring with tread marks, generated so it stays round.
function tireGrid(d: number): Grid {
  const c = (d - 1) / 2, ro = d / 2, ri = d / 4
  return Array.from({ length: d }, (_, y) => Array.from({ length: d }, (_, x) => {
    const r = Math.hypot(x - c, y - c)
    if (r > ro || r < ri - 0.5) return '.'
    if (r > ro - 1 || r < ri + 0.5) return 'o'
    return (x + y) % 3 === 0 ? 'T' : 't'
  }).join(''))
}

export const JUNK_ART: Record<string, { grid: Grid; palette: Record<string, number> }> = {
  can: {
    grid: ['.oooooooo.', 'ollllllllo', 'orrrrrrrro', 'oRRrrrrRro', 'orrrrrrrro', 'ollllllllo', '.oooooooo.'],
    palette: { o: O, l: 0xb8bcc0, r: 0xb04a2a, R: 0x7a2a18 },
  },
  tangledLine: {
    grid: ['..ll....ll..', '.l..l..l..l.', 'l....ll....l', 'l...lggl...l', '.l.l.gg.l.l.', '..l..ll..l..', '.l..l..l..l.', '..ll....ll..'],
    palette: { l: 0xd8e8c8, g: 0x4a7a3a },
  },
  boot: {
    grid: ['..oooo......', '..obbo......', '..obbo......', '..obbo......', '..obbo......', '..obbbooo...', '.obbbbbbboo.', 'obbbbbbbbbbo', 'oSSSSSSSSSSo', '.oooooooooo.'],
    palette: { o: O, b: 0x6b4a2a, S: 0x2a2018 },
  },
  tire: { grid: tireGrid(14), palette: { o: O, t: 0x2a2a2e, T: 0x4a4a50 } },
}

// Where the line catches, relative to the sprite's top-left.
export const JUNK_SNAG: Record<string, [number, number]> = { can: [1, 3], tangledLine: [0, 3], boot: [3, 1], tire: [0, 7] }

export function junkBitmap(id: string): Bitmap {
  const { grid, palette } = JUNK_ART[id]
  return refine(paint(grid, palette), O)
}
