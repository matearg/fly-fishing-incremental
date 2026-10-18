// The world is always 480×270; the game is sized to a crop of it matching its cell's aspect,
// and each scene scrolls its camera to choose which part shows.
export const VIEW_W = 480
export const VIEW_H = 270

/** A world-space rectangle a scene must keep in view. */
export interface Rect { x0: number; y0: number; x1: number; y1: number }

// Left bank, both figures, the Great Lake landing spot, the back-cast loop, the deepest band.
export const FISHING_KEEP: Rect = { x0: 0, y0: 50, x1: 300, y1: 262 }
export const FISHING_ANCHOR: [number, number] = [0, 1]
// Logo, menu and PRESS START.
export const TITLE_KEEP: Rect = { x0: 140, y0: 2, x1: 340, y1: 236 }
export const TITLE_ANCHOR: [number, number] = [0.5, 0.5]

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** The game size for a cell: the world cropped to the cell's aspect, never smaller than `keep`. */
export function viewSize(cellW: number, cellH: number, keep: Rect): { w: number; h: number; clamped: boolean } {
  const aspect = cellW / cellH
  let w = VIEW_W, h = VIEW_H
  if (aspect > VIEW_W / VIEW_H) h = Math.round(VIEW_W / aspect)
  else w = Math.round(VIEW_H * aspect)
  const kw = keep.x1 - keep.x0, kh = keep.y1 - keep.y0
  const clamped = w < kw || h < kh
  return { w: Math.max(w, kw), h: Math.max(h, kh), clamped }
}

/** Camera scroll for a `w`×`h` view: as close to `anchor` (0..1 per axis) as `keep` allows. */
export function viewScroll(w: number, h: number, keep: Rect, anchor: [number, number]): [number, number] {
  const axis = (world: number, size: number, min: number, max: number, a: number) =>
    clamp(clamp(a * (world - size), max - size, min), 0, world - size)
  return [axis(VIEW_W, w, keep.x0, keep.x1, anchor[0]), axis(VIEW_H, h, keep.y0, keep.y1, anchor[1])]
}
