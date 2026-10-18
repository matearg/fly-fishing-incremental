// Title menu as a pure state machine; TitleScene only draws it and maps input.

export type MenuPage = 'attract' | 'main' | 'settings' | 'confirmNew'
export interface MenuState { page: MenuPage; index: number }
// canFullscreen: false where the browser has no Fullscreen API (iPhone Safari).
export interface MenuCtx { hasSave: boolean; fullscreen: boolean; canFullscreen: boolean }
export type MenuKey = 'up' | 'down' | 'select' | 'back' | 'any'
export type MenuAction = 'continue' | 'newGame' | 'toggleFullscreen'
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
  if (key !== 'select') return { next: m }
  switch (items[m.index]?.id) {
    case 'continue': return { next: m, action: 'continue' }
    case 'newGame': return ctx.hasSave ? { next: { page: 'confirmNew', index: 0 } } : { next: m, action: 'newGame' }
    case 'settings': return { next: { page: 'settings', index: 0 } }
    case 'fullscreen': return { next: m, action: 'toggleFullscreen' }
    case 'yes': return { next: m, action: 'newGame' }
    default: return { next: { ...MAIN } } // back, no
  }
}
