import { describe, expect, it } from 'vitest'
import { FISHING_KEEP, TITLE_KEEP, viewScroll, viewSize } from './view'

describe('viewSize', () => {
  it('is the whole world at 16:9', () => {
    expect(viewSize(1600, 900, FISHING_KEEP)).toEqual({ w: 480, h: 270, clamped: false })
  })
  it('cuts width when the cell is narrower than 16:9', () => {
    expect(viewSize(1026, 618, FISHING_KEEP)).toEqual({ w: 448, h: 270, clamped: false })
  })
  it('cuts height when the cell is wider than 16:9', () => {
    expect(viewSize(2000, 900, FISHING_KEEP)).toEqual({ w: 480, h: 216, clamped: false })
  })
  it('stops at the keep height and reports clamped', () => {
    expect(viewSize(3000, 900, FISHING_KEEP)).toEqual({ w: 480, h: 212, clamped: true })
  })
  it('stops at the keep width and reports clamped', () => {
    expect(viewSize(300, 900, FISHING_KEEP)).toEqual({ w: 300, h: 270, clamped: true })
  })
})

describe('viewScroll', () => {
  it('cuts sky first', () => {
    expect(viewScroll(480, 230, FISHING_KEEP, [0, 1])).toEqual([0, 40])
  })
  it('caps the sky cut, the rest comes off the bottom', () => {
    expect(viewScroll(480, 212, FISHING_KEEP, [0, 1])).toEqual([0, 50])
  })
  it('keeps the fisher side', () => {
    expect(viewScroll(448, 270, FISHING_KEEP, [0, 1])).toEqual([0, 0])
  })
  it('centers the title but keeps the logo top', () => {
    expect(viewScroll(400, 250, TITLE_KEEP, [0.5, 0.5])).toEqual([40, 2])
  })
})
