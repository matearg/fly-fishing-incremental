import { describe, it, expect } from 'vitest'
import { BODY_W, figureSpots, fishingKeep, flyXs, UPRIGHT_KEEP_W } from './spots'
import { FISHING_KEEP, VIEW_W } from '../view'
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

describe('fishingKeep', () => {
  it('is the usual keep off upright phones', () => {
    for (const l of LOCATIONS) {
      const look = placeLook(l.id)
      expect(fishingKeep(look, 'desktop'), l.id).toEqual(FISHING_KEEP)
      expect(fishingKeep(look, 'sideways'), l.id).toEqual(FISHING_KEEP)
    }
  })
  it('upright, a fixed-width band from the Guide past the player\'s fly, inside the world', () => {
    for (const l of LOCATIONS) {
      const look = placeLook(l.id), k = fishingKeep(look, 'upright')
      expect(k.x1 - k.x0, l.id).toBe(UPRIGHT_KEEP_W)
      expect(k.x0, l.id).toBeGreaterThanOrEqual(0)
      expect(k.x1, l.id).toBeLessThanOrEqual(VIEW_W)
      expect([k.y0, k.y1], l.id).toEqual([FISHING_KEEP.y0, FISHING_KEEP.y1])
      expect(k.x0, l.id).toBeLessThanOrEqual(figureSpots(look).guideX)
      expect(flyXs(look).playerFlyX + 32, l.id).toBeLessThanOrEqual(k.x1) // the fly and a fish's body beside it
    }
  })
  it('flyXs keeps the scene\'s fly spots', () => {
    expect(flyXs(placeLook('creek'))).toEqual({ playerFlyX: 207, helperFlyX: 177 })
  })
})
