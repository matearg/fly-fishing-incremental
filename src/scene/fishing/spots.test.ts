import { describe, it, expect } from 'vitest'
import { BODY_W, figureSpots, flyXs } from './spots'
import { LOCATIONS } from '../../game/data'
import { placeLook } from '../../art/places'

describe('figure spots', () => {
  it('the Guide stands fully on canvas and clear of the helper at every place', () => {
    for (const l of LOCATIONS) {
      const { helperX, guideX } = figureSpots(placeLook(l.id))
      expect(guideX, l.id).toBeGreaterThanOrEqual(0)
      expect(guideX + BODY_W, l.id).toBeLessThanOrEqual(helperX)
    }
  })
  it('the helper stands a step behind the player', () => {
    for (const l of LOCATIONS) {
      const { playerX, helperX } = figureSpots(placeLook(l.id))
      expect(playerX - helperX, l.id).toBe(24)
    }
  })
  it('at the Great Lake all three stand on the dock', () => {
    const look = placeLook('greatLake')
    expect(figureSpots(look).guideX).toBeGreaterThanOrEqual(look.shoreX - 20) // past the bank's shoulder, on the deck
  })
})

describe('flyXs', () => {
  it('keeps the scene\'s fly spots', () => {
    expect(flyXs(placeLook('creek'))).toEqual({ playerFlyX: 207, helperFlyX: 177 })
  })
})
