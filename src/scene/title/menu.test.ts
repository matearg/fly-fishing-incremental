import { describe, it, expect } from 'vitest'
import { menuCue, menuInput, menuItems, type MenuCtx, type MenuKey, type MenuState } from './menu'
import { DEFAULT_MUSIC, DEFAULT_SOUND } from '../../audio/settings'

const save: MenuCtx = { hasSave: true, fullscreen: false, canFullscreen: true, sound: DEFAULT_SOUND, music: DEFAULT_MUSIC }
const noSave: MenuCtx = { hasSave: false, fullscreen: false, canFullscreen: true, sound: DEFAULT_SOUND, music: DEFAULT_MUSIC }
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
  it('settings without the Fullscreen API: SOUND and BACK', () => {
    expect(ids('settings', { ...save, canFullscreen: false })).toEqual(['sound', 'music', 'back'])
    expect(menuInput(at('settings', 2), 'select', { ...save, canFullscreen: false })).toEqual({ next: at('main', 0) })
  })
  it('back from settings → main; back on main does nothing', () => {
    expect(menuInput(at('settings', 1), 'back', save)).toEqual({ next: at('main', 0) })
    expect(menuInput(at('settings', 3), 'select', save)).toEqual({ next: at('main', 0) })
    expect(menuInput(at('main', 1), 'back', save)).toEqual({ next: at('main', 1) })
  })
  it('settings has the sound row between FULLSCREEN and BACK', () => {
    expect(ids('settings', save)).toEqual(['fullscreen', 'sound', 'music', 'back'])
    expect(menuItems('settings', save)[1].label).toBe('SOUND 70%')
    expect(menuItems('settings', { ...save, sound: { level: 7, muted: true } })[1].label).toBe('SOUND OFF')
  })
  it('sound row: select mutes, left/right change the volume, all staying put', () => {
    expect(menuInput(at('settings', 1), 'select', save)).toEqual({ next: at('settings', 1), action: 'soundMute' })
    expect(menuInput(at('settings', 1), 'left', save)).toEqual({ next: at('settings', 1), action: 'soundDown' })
    expect(menuInput(at('settings', 1), 'right', save)).toEqual({ next: at('settings', 1), action: 'soundUp' })
  })
  it('settings has the music row right below the sound row', () => {
    expect(menuItems('settings', save)[2].label).toBe('MUSIC 50%')
    expect(menuItems('settings', { ...save, music: { level: 5, muted: true } })[2].label).toBe('MUSIC OFF')
  })
  it('music row: select mutes, left/right change the music volume, all staying put', () => {
    expect(menuInput(at('settings', 2), 'select', save)).toEqual({ next: at('settings', 2), action: 'musicMute' })
    expect(menuInput(at('settings', 2), 'left', save)).toEqual({ next: at('settings', 2), action: 'musicDown' })
    expect(menuInput(at('settings', 2), 'right', save)).toEqual({ next: at('settings', 2), action: 'musicUp' })
    expect(menuCue(at('settings', 2), 'right', menuInput(at('settings', 2), 'right', save))).toBe('move')
    expect(menuCue(at('settings', 2), 'select', menuInput(at('settings', 2), 'select', save))).toBe('select')
  })
  it('left/right elsewhere do nothing', () => {
    expect(menuInput(at('settings', 0), 'left', save)).toEqual({ next: at('settings', 0) })
  })
})

describe('menuCue', () => {
  const cue = (m: MenuState, k: MenuKey) => menuCue(m, k, menuInput(m, k, save))
  it('blips on press start and on moves', () => {
    expect(cue(at('attract'), 'any')).toBe('select')
    expect(cue(at('main', 0), 'down')).toBe('move')
    expect(cue(at('settings', 1), 'right')).toBe('move')
    expect(cue(at('settings', 0), 'left')).toBeNull()
  })
  it('plays back only when the page changes', () => {
    expect(cue(at('settings', 0), 'back')).toBe('back')
    expect(cue(at('main', 0), 'back')).toBeNull()
  })
  it('selecting BACK or NO sounds like back; other picks select', () => {
    expect(cue(at('settings', 3), 'select')).toBe('back')
    expect(cue(at('confirmNew', 0), 'select')).toBe('back')
    expect(cue(at('main', 1), 'select')).toBe('select')
  })
})
