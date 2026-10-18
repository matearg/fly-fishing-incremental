import { textMask } from './font'
import type { Grid, Mask } from './pixels'

// Settings row icons, approved on the brainstorm mockup.
export const SPEAKER: Grid = [
  '....#......',
  '...##....#.',
  '#####..#..#',
  '#####...#.#',
  '#####...#.#',
  '#####...#.#',
  '#####..#..#',
  '...##....#.',
  '....#......',
]

// For the future music row; not drawn in game yet.
export const NOTES: Grid = [
  '...######',
  '...######',
  '...#....#',
  '...#....#',
  '...#....#',
  '.###..###',
  '####.####',
  '####.####',
  '.##...##.',
]

export const BAR_SEGMENT: Grid = Array(7).fill('###')

// Muted: a top-left to bottom-right slash, with the pixel below it cleared so the line reads against the icon.
export function soundIconMask(grid: Grid, muted: boolean): Mask {
  const m = textMask('i', { i: grid })
  if (muted) {
    for (let x = 0; x < m.w; x++) {
      const y = Math.round(x * (m.h - 1) / (m.w - 1))
      m.on[y * m.w + x] = 1
      if (y + 1 < m.h) m.on[(y + 1) * m.w + x] = 0
    }
  }
  return m
}
