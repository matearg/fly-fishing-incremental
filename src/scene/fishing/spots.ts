import type { PlaceLook } from '../../art/places'
import { BODY_X, ROD_TIP } from '../../art/sprites/figures'
import type { Layout } from '../../layout'
import { FISHING_KEEP, VIEW_W, type Rect } from '../view'

export const BODY_W = 14 // a figure's body width, in world units

// Where each figure's body starts: the player at the water's edge (or out on the dock),
// the helper a step behind, the Guide a body behind the helper.
export function figureSpots(look: PlaceLook): { playerX: number; helperX: number; guideX: number } {
  const playerX = look.dock ? look.shoreX + 70 : look.shoreX - 34, helperX = playerX - 24
  return { playerX, helperX, guideX: helperX - BODY_W - 2 }
}

// Where the player's and helper's flies land.
export function flyXs(look: PlaceLook): { playerFlyX: number; helperFlyX: number } {
  const tipX = figureSpots(look).playerX - BODY_X + ROD_TIP.idle[0]
  return { playerFlyX: Math.min(VIEW_W - 40, tipX + 140), helperFlyX: tipX + 110 } // far enough that its line clears the bank face at depth
}

// Guide-to-fly span (205) + a fish's body past the fly (32) + 2; the same at every place since both come from playerX.
export const UPRIGHT_KEEP_W = 239

/** What the fishing camera must keep in view: upright phones crop to the Guide, the figures and the fly. */
export function fishingKeep(look: PlaceLook, layout: Layout): Rect {
  if (layout !== 'upright') return FISHING_KEEP
  const x0 = Math.max(0, figureSpots(look).guideX - 2)
  return { x0, y0: FISHING_KEEP.y0, x1: x0 + UPRIGHT_KEEP_W, y1: FISHING_KEEP.y1 }
}
