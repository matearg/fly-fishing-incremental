// Title menu as a pure state machine; TitleScene only draws it and maps input.
import type { SoundSettings } from '../../audio/settings'
import type { SoundId } from '../../audio/sounds'

export type MenuPage = 'attract' | 'main' | 'settings' | 'confirmNew'
export interface MenuState { page: MenuPage; index: number }
// canFullscreen: false where the browser has no Fullscreen API (iPhone Safari).
export interface MenuCtx { hasSave: boolean; fullscreen: boolean; canFullscreen: boolean; sound: SoundSettings }
export type MenuKey = 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'any'
export type MenuAction = 'continue' | 'newGame' | 'toggleFullscreen' | 'soundMute' | 'soundDown' | 'soundUp'
export interface MenuItem { id: string; label: string }

export const CONFIRM_PROMPT = ['THIS ERASES YOUR PROGRESS.', 'ARE YOU SURE?']

export function menuItems(page: MenuPage, ctx: MenuCtx): MenuItem[] {
  switch (page) {
    case 'attract': return []
    case 'main': return [
      ...(ctx.hasSave ? [{ id: 'continue', label: 'CONTINUE' }] : []),
      { id: 'newGame', label: 'NEW GAME' },
      { id: 'settings', label: 'SETTINGS' },
    ]
    case 'settings': return [
      ...(ctx.canFullscreen ? [{ id: 'fullscreen', label: `FULLSCREEN: ${ctx.fullscreen ? 'ON' : 'OFF'}` }] : []),
      // A text fallback: TitleScene draws this row as icon, bar and percent.
      { id: 'sound', label: ctx.sound.muted ? 'SOUND OFF' : `SOUND ${ctx.sound.level * 10}%` },
      { id: 'back', label: 'BACK' },
    ]
    case 'confirmNew': return [{ id: 'no', label: 'NO' }, { id: 'yes', label: 'YES' }]
  }
}

const MAIN = { page: 'main', index: 0 } as const

export function menuInput(m: MenuState, key: MenuKey, ctx: MenuCtx): { next: MenuState; action?: MenuAction } {
  if (m.page === 'attract') return { next: { ...MAIN } }
  const items = menuItems(m.page, ctx)
  const n = items.length
  if (key === 'up') return { next: { ...m, index: (m.index - 1 + n) % n } }
  if (key === 'down') return { next: { ...m, index: (m.index + 1) % n } }
  if (key === 'back') return { next: m.page === 'main' ? m : { ...MAIN } }
  if (key === 'left' || key === 'right') return items[m.index]?.id === 'sound' ? { next: m, action: key === 'left' ? 'soundDown' : 'soundUp' } : { next: m }
  if (key !== 'select') return { next: m }
  switch (items[m.index]?.id) {
    case 'continue': return { next: m, action: 'continue' }
    case 'newGame': return ctx.hasSave ? { next: { page: 'confirmNew', index: 0 } } : { next: m, action: 'newGame' }
    case 'settings': return { next: { page: 'settings', index: 0 } }
    case 'fullscreen': return { next: m, action: 'toggleFullscreen' }
    case 'sound': return { next: m, action: 'soundMute' }
    case 'yes': return { next: m, action: 'newGame' }
    default: return { next: { ...MAIN } } // back, no
  }
}

// The blip for an input, from the state before it and what menuInput made of it.
export function menuCue(m: MenuState, key: MenuKey, r: { next: MenuState; action?: MenuAction }): SoundId | null {
  if (m.page === 'attract') return 'select'
  switch (key) {
    case 'up': case 'down': return r.next.index !== m.index ? 'move' : null
    case 'left': case 'right': return r.action ? 'move' : null
    case 'back': return r.next.page !== m.page ? 'back' : null
    case 'any': return null
  }
  // Only BACK and NO select their way back to main without an action.
  return m.page !== 'main' && r.next.page === 'main' && !r.action ? 'back' : 'select'
}
