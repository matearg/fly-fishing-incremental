import { describe, it, expect } from 'vitest'
import { BODY_X, FEET_Y, FIGURE_POSES, figureBitmaps, ROD_TIP, type FigureKind, type Pose } from './figures'

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
      const b = figureBitmaps(k)[p], [x, y] = ROD_TIP[p]
      expect(x >= 0 && y >= 0 && x < b.w && y < b.h, `${k} ${p}`).toBe(true)
      expect(alpha(b, x, y), `${k} ${p}`).toBe(255)
    }
  })
  it('the feet stand on the sprite bottom row', () => {
    const b = figureBitmaps('angler').idle
    expect(FEET_Y).toBe(b.h - 1)
    expect([...Array(b.w).keys()].some(x => alpha(b, x, FEET_Y) === 255)).toBe(true)
  })
  it('the back-cast rod tip is behind the head', () => {
    expect(ROD_TIP.back[0]).toBeLessThan(BODY_X + 6)
  })
  it('the helper looks different from the player', () => {
    expect(figureBitmaps('helper').idle.data).not.toEqual(figureBitmaps('angler').idle.data)
  })
  it('an unknown style falls back to default', () => {
    expect(figureBitmaps('angler', 'nope').idle.data).toEqual(figureBitmaps('angler').idle.data)
  })
})
