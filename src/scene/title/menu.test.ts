import { describe, it, expect } from 'vitest'
import { menuInput, menuItems, type MenuCtx, type MenuState } from './menu'

const save: MenuCtx = { hasSave: true, fullscreen: false, canFullscreen: true }
const noSave: MenuCtx = { hasSave: false, fullscreen: false, canFullscreen: true }
const at = (page: MenuState['page'], index = 0): MenuState => ({ page, index })
const ids = (page: MenuState['page'], ctx: MenuCtx) => menuItems(page, ctx).map(i => i.id)

describe('menu', () => {
  it('attract: any key opens main at index 0', () => {
    expect(menuInput(at('attract'), 'any', save)).toEqual({ next: at('main', 0) })
  })
  it('main without save has no CONTINUE; with save CONTINUE is first', () => {
    expect(ids('main', noSave)).toEqual(['newGame', 'settings'])
    expect(menuItems('main', save).map(i => i.label)).toEqual(['CONTINUE', 'NEW GAME', 'SETTINGS'])
  })
  it('up/down wrap around', () => {
    expect(menuInput(at('main', 0), 'up', save).next).toEqual(at('main', 2))
    expect(menuInput(at('main', 2), 'down', save).next).toEqual(at('main', 0))
  })
  it('select CONTINUE → action continue', () => {
    expect(menuInput(at('main', 0), 'select', save).action).toBe('continue')
  })
  it('select NEW GAME with save → confirmNew at NO, no action', () => {
    expect(menuInput(at('main', 1), 'select', save)).toEqual({ next: at('confirmNew', 0) })
    expect(menuItems('confirmNew', save).map(i => i.label)).toEqual(['NO', 'YES'])
  })
  it('select NEW GAME without save → action newGame', () => {
    expect(menuInput(at('main', 0), 'select', noSave).action).toBe('newGame')
  })
  it('confirmNew: YES → newGame; NO or back → main', () => {
    expect(menuInput(at('confirmNew', 1), 'select', save).action).toBe('newGame')
    expect(menuInput(at('confirmNew', 0), 'select', save)).toEqual({ next: at('main', 0) })
    expect(menuInput(at('confirmNew', 1), 'back', save)).toEqual({ next: at('main', 0) })
  })
  it('settings: FULLSCREEN toggles and stays; label follows ctx', () => {
    expect(menuInput(at('settings', 0), 'select', save)).toEqual({ next: at('settings', 0), action: 'toggleFullscreen' })
    expect(menuItems('settings', save)[0].label).toBe('FULLSCREEN: OFF')
    expect(menuItems('settings', { ...save, fullscreen: true })[0].label).toBe('FULLSCREEN: ON')
  })
  it('settings without the Fullscreen API: only BACK', () => {
    expect(ids('settings', { ...save, canFullscreen: false })).toEqual(['back'])
    expect(menuInput(at('settings', 0), 'select', { ...save, canFullscreen: false })).toEqual({ next: at('main', 0) })
  })
  it('back from settings → main; back on main does nothing', () => {
    expect(menuInput(at('settings', 1), 'back', save)).toEqual({ next: at('main', 0) })
    expect(menuInput(at('settings', 1), 'select', save)).toEqual({ next: at('main', 0) })
    expect(menuInput(at('main', 1), 'back', save)).toEqual({ next: at('main', 1) })
  })
})
