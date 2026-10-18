// Code-drawn pixel art: grids of chars + a palette, baked to RGBA buffers.
// Pure (no DOM) so it runs in tests; scenes upload the result as textures.

export type Grid = string[] // one char per pixel, '.' = transparent
export interface Bitmap { w: number; h: number; data: Uint8ClampedArray }
export interface Mask { w: number; h: number; on: Uint8Array }

export function blank(w: number, h: number): Bitmap {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) }
}

function put(b: Bitmap, x: number, y: number, rgb: number, a = 255): void {
  const i = (y * b.w + x) * 4
  b.data[i] = rgb >> 16; b.data[i + 1] = (rgb >> 8) & 0xff; b.data[i + 2] = rgb & 0xff; b.data[i + 3] = a
}

export function paint(grid: Grid, palette: Record<string, number>): Bitmap {
  const w = grid[0]?.length ?? 0
  const b = blank(w, grid.length)
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`ragged grid: row ${y} is ${row.length} wide, expected ${w}`)
    for (const [x, ch] of [...row].entries()) {
      if (ch === '.') continue
      if (!(ch in palette)) throw new Error(`no palette entry for '${ch}'`)
      put(b, x, y, palette[ch])
    }
  })
  return b
}

// Copies opaque pixels; translucent ones (shadows) only land on empty pixels.
export function blit(dst: Bitmap, src: Bitmap, dx: number, dy: number): void {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const tx = x + dx, ty = y + dy
    if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) continue
    const s = (y * src.w + x) * 4, d = (ty * dst.w + tx) * 4
    const a = src.data[s + 3]
    if (!a || (a < 255 && dst.data[d + 3])) continue
    dst.data.set(src.data.subarray(s, s + 4), d)
  }
}

export function scaleMask(m: Mask, k: number): Mask {
  const out: Mask = { w: m.w * k, h: m.h * k, on: new Uint8Array(m.w * k * m.h * k) }
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.on[y * out.w + x] = m.on[((y / k) | 0) * m.w + ((x / k) | 0)]
  return out
}

export interface TextStyle { top: number; bottom: number; outline: number; outlineW: number; shadow?: number }

const SHADOW_OFFSET = 2
const SHADOW_ALPHA = 89 // ≈35%
export const mix = (a: number, b: number, t: number) =>
  [16, 8, 0].reduce((c, sh) => c | (Math.round(((a >> sh) & 0xff) + (((b >> sh) & 0xff) - ((a >> sh) & 0xff)) * t) << sh), 0)

// Ink gets a 4-step vertical gradient, then a square outline ring, then an optional drop shadow.
export function stylize(mask: Mask, style: TextStyle): Bitmap {
  const o = style.outlineW, extra = style.shadow === undefined ? 0 : SHADOW_OFFSET
  const b = blank(mask.w + o * 2 + extra, mask.h + o * 2 + extra)
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.on[y * mask.w + x] === 1
  let y0 = mask.h, y1 = 0
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) if (ink(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const solid = new Uint8Array(b.w * b.h)
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const mx = x - o, my = y - o
    if (ink(mx, my)) {
      const band = Math.min(3, Math.floor(((my - y0) / Math.max(1, y1 - y0)) * 4))
      put(b, x, y, mix(style.top, style.bottom, band / 3))
      solid[y * b.w + x] = 1
      continue
    }
    near: for (let dy = -o; dy <= o; dy++) for (let dx = -o; dx <= o; dx++) if (ink(mx + dx, my + dy)) {
      put(b, x, y, style.outline)
      solid[y * b.w + x] = 1
      break near
    }
  }
  if (style.shadow !== undefined) for (let y = b.h - 1; y >= extra; y--) for (let x = b.w - 1; x >= extra; x--)
    if (!solid[y * b.w + x] && solid[(y - extra) * b.w + x - extra]) put(b, x, y, style.shadow, SHADOW_ALPHA)
  return b
}
