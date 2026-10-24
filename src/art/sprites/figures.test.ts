import { describe, it, expect } from 'vitest'
import { BODY_X, BODY_Y, FEET_Y, FIGURE_POSES, figureBitmaps, guideBitmap, ROD_LOOKS, ROD_TIP, WADERS_LOOKS, type FigureKind, type Pose } from './figures'
import { RODS, WADERS } from '../../game/data'
import { FINE } from '../pixels'

const POSES: Pose[] = ['idle', 'back', 'cast', 'reel']
const KINDS: FigureKind[] = ['angler', 'helper']
const alpha = (b: { w: number; data: Uint8ClampedArray }, x: number, y: number) => b.data[(y * b.w + x) * 4 + 3]

describe('figures', () => {
  it('every pose grid is rectangular', () => {
    for (const p of POSES) for (const row of FIGURE_POSES[p]) expect(row.length, p).toBe(FIGURE_POSES[p][0].length)
  })
  it('all poses are the same size for both kinds', () => {
    const sizes = KINDS.flatMap(k => POSES.map(p => { const b = figureBitmaps(k)[p]; return `${b.w}x${b.h}` }))
    expect(new Set(sizes).size).toBe(1)
  })
  it('the rod tip is inside the sprite on an opaque pixel', () => {
    for (const k of KINDS) for (const p of POSES) {
      const b = figureBitmaps(k)[p], [x, y] = ROD_TIP[p].map(v => v * FINE)
      expect(x >= 0 && y >= 0 && x < b.w && y < b.h, `${k} ${p}`).toBe(true)
      expect(alpha(b, x, y), `${k} ${p}`).toBe(255)
    }
  })
  it('the feet stand on the sprite bottom row', () => {
    const b = figureBitmaps('angler').idle
    expect(FEET_Y * FINE + FINE - 1).toBe(b.h - 1)
    expect([...Array(b.w).keys()].some(x => alpha(b, x, b.h - 1) === 255)).toBe(true)
  })
  it('the rod is one fine pixel thick', () => {
    const b = figureBitmaps('angler').idle, [x0, y0] = ROD_TIP.idle, [x1, y1] = [BODY_X + 13, BODY_Y + 15] // idle rod butt
    const x = Math.round((x0 + x1) / 2) * FINE, y = Math.round((y0 + y1) / 2) * FINE
    expect(alpha(b, x, y)).toBe(255)
    expect(alpha(b, x + 1, y)).toBe(0)
  })
  it('a wrapped rod keeps its wraps', () => {
    const b = figureBitmaps('angler', { rod: 'carbonSpey' }).idle, R = ROD_LOOKS.carbonSpey.R
    expect([...Array(b.w * b.h).keys()].some(i => ((b.data[i * 4] << 16) | (b.data[i * 4 + 1] << 8) | b.data[i * 4 + 2]) === R && b.data[i * 4 + 3])).toBe(true)
  })
  it('the back-cast rod tip is behind the head', () => {
    expect(ROD_TIP.back[0]).toBeLessThan(BODY_X + 6)
  })
  it('the helper looks different from the player', () => {
    expect(figureBitmaps('helper').idle.data).not.toEqual(figureBitmaps('angler').idle.data)
  })
  it('rods and waders recolor the angler, and plain or unknown gear draws as before', () => {
    const plain = figureBitmaps('angler').idle.data
    expect(figureBitmaps('angler', { rod: 'plainRod', waders: 'plainWaders' }).idle.data).toEqual(plain)
    expect(figureBitmaps('angler', { rod: 'carbonSpey' }).idle.data).not.toEqual(plain)
    expect(figureBitmaps('angler', { waders: 'canvasWaders' }).idle.data).not.toEqual(plain)
    expect(figureBitmaps('angler', { rod: 'gone', waders: 'gone' }).idle.data).toEqual(plain)
  })
  it('every rod and pair has a look', () => {
    expect(Object.keys(ROD_LOOKS).sort()).toEqual(RODS.map(r => r.id).sort())
    expect(Object.keys(WADERS_LOOKS).sort()).toEqual(WADERS.map(w => w.id).sort())
  })
  it('the guide is the same size as the anglers and stands on the bottom row', () => {
    const g = guideBitmap(), a = figureBitmaps('angler').idle
    expect([g.w, g.h]).toEqual([a.w, a.h])
    expect([...Array(g.w).keys()].some(x => alpha(g, x, g.h - 1) === 255)).toBe(true)
  })
  it('the guide holds no rod', () => {
    const g = guideBitmap(), rods = new Set(Object.values(ROD_LOOKS).flatMap(l => [l.r, l.R]))
    const rgb = (i: number) => (g.data[i * 4] << 16) | (g.data[i * 4 + 1] << 8) | g.data[i * 4 + 2]
    expect([...Array(g.w * g.h).keys()].some(i => g.data[i * 4 + 3] && rods.has(rgb(i)))).toBe(false)
  })
})
