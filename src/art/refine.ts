// Turns a grid-sized sprite into a FINE× one that reads as drawn at the finer size, not blown up:
// the outline thins to one fine pixel and the fill gets a lit top-left rim and a shaded bottom-right rim.
import { FINE, mix, upscale, type Bitmap } from './pixels'

const NONE = -1 // transparent or out of bounds

function colorAt(b: Bitmap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return NONE
  const i = (y * b.w + x) * 4
  return b.data[i + 3] ? (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2] : NONE
}

function setRgb(b: Bitmap, x: number, y: number, c: number): void {
  const i = (y * b.w + x) * 4
  b.data[i] = c >> 16; b.data[i + 1] = (c >> 8) & 0xff; b.data[i + 2] = c & 0xff
}

// Assumes FINE = 2: each fine sub-pixel touches exactly one horizontal and one vertical side of its source cell.
export function refine(src: Bitmap, outline?: number): Bitmap {
  const out = upscale(src, FINE)
  if (outline !== undefined) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      if (colorAt(src, x, y) !== outline) continue
      const n = (dx: number, dy: number) => colorAt(src, x + dx, y + dy)
      const inside = (c: number) => c !== NONE && c !== outline
      const ring = [n(-1, 0), n(1, 0), n(0, -1), n(0, 1)].includes(NONE)
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const hx = sx ? 1 : -1, vy = sy ? 1 : -1
        const h = n(hx, 0), v = n(0, vy)
        let c: number = outline
        if (ring) {
          if (h !== NONE && v !== NONE) {
            if (inside(h)) c = h
            else if (inside(v)) c = v
            else if (inside(n(hx, vy))) c = n(hx, vy)
          }
        } else if (!sy && inside(v)) c = v
        else if (!sx && inside(h)) c = h
        if (c !== outline) setRgb(out, x * FINE + sx, y * FINE + sy, c)
      }
    }
  }
  const edge = (c: number) => c === NONE || c === outline
  const before = { ...out, data: out.data.slice() } // shading reads the thinned image, not its own output
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const c = colorAt(before, x, y)
    if (edge(c)) continue
    if (edge(colorAt(before, x + 1, y)) || edge(colorAt(before, x, y + 1))) setRgb(out, x, y, mix(c, 0x000000, 0.2))
    else if (edge(colorAt(before, x - 1, y)) || edge(colorAt(before, x, y - 1))) setRgb(out, x, y, mix(c, 0xffffff, 0.15))
  }
  return out
}
