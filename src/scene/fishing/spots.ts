import type { PlaceLook } from '../../art/places'
import { BODY_X, ROD_TIP } from '../../art/sprites/figures'
import { VIEW_W } from '../view'

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
