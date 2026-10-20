import type { PlaceLook } from '../../art/places'

export const BODY_W = 14 // a figure's body width, in world units

// Where each figure's body starts: the player at the water's edge (or out on the dock),
// the helper a step behind, the Guide a body behind the helper.
export function figureSpots(look: PlaceLook): { playerX: number; helperX: number; guideX: number } {
  const playerX = look.dock ? look.shoreX + 70 : look.shoreX - 34, helperX = playerX - 24
  return { playerX, helperX, guideX: helperX - BODY_W - 2 }
}
