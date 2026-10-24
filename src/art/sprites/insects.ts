import { paint, type Bitmap, type Grid } from '../pixels'
import { refine } from '../refine'

// A hatching mayfly seen from the side, wings up and wings down.
const UP: Grid = ['w...w', '.w.w.', '.bbbt']
const DOWN: Grid = ['.....', '.bbbt', 'w.w..']
const PALETTE = { w: 0xe8eef4, b: 0x4a3420, t: 0x8a6a40 }

export function insectBitmaps(): [Bitmap, Bitmap] {
  return [refine(paint(UP, PALETTE)), refine(paint(DOWN, PALETTE))]
}
