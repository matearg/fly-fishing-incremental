// Fine bitmaps addressed in world units: one world unit holds FINE×FINE art pixels.
import { blank, FINE, type Bitmap } from '../pixels'

export const fineBlank = (w: number, h: number): Bitmap => blank(w * FINE, h * FINE)

export function setPx(b: Bitmap, px: number, py: number, c: number): void {
  if (px < 0 || py < 0 || px >= b.w || py >= b.h) return
  const i = (py * b.w + px) * 4, d = b.data
  d[i] = c >> 16; d[i + 1] = (c >> 8) & 0xff; d[i + 2] = c & 0xff; d[i + 3] = 255
}

export function getPx(b: Bitmap, px: number, py: number): number {
  const i = (Math.max(0, Math.min(b.h - 1, py)) * b.w + Math.max(0, Math.min(b.w - 1, px))) * 4
  return (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]
}

// Paints the world rect [x0,x1)×[y0,y1); fn gets the fine pixel and its world centre, null keeps the pixel.
export function fill(b: Bitmap, x0: number, y0: number, x1: number, y1: number, fn: (px: number, py: number, x: number, y: number) => number | null): void {
  for (let py = Math.max(0, Math.floor(y0 * FINE)); py < Math.min(b.h, Math.ceil(y1 * FINE)); py++)
    for (let px = Math.max(0, Math.floor(x0 * FINE)); px < Math.min(b.w, Math.ceil(x1 * FINE)); px++) {
      const c = fn(px, py, (px + 0.5) / FINE, (py + 0.5) / FINE)
      if (c !== null) setPx(b, px, py, c)
    }
}

// A round stone lit from the upper left, at (nx, ny) in its unit circle: null outside, stone[0] past `rim`,
// else stone[1] / [2] / [3] by how much the point faces the light (above `hi`, above `lo`, below).
export function litStone(nx: number, ny: number, stone: readonly number[], rim: number, hi: number, lo: number, slope: number): number | null {
  const r = nx * nx + ny * ny
  if (r > 1) return null
  const l = -(nx + ny) * slope
  return r > rim ? stone[0] : l > hi ? stone[1] : l > lo ? stone[2] : stone[3]
}
