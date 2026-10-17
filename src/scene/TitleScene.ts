import Phaser from 'phaser'
import { SMALL, textMask } from '../art/font'
import { bakeLogo } from '../art/logo'
import { paint, stylize } from '../art/pixels'
import type { Session } from '../session'
import { CONFIRM_PROMPT, menuInput, menuItems, type MenuKey, type MenuState } from './menu'
import { addBitmap } from './textures'
import { VIEW_H, VIEW_W } from './FishingScene'

export interface TitleHooks {
  session: Session
  enterGame(kind: 'continue' | 'new'): void
  toggleFullscreen(): void
  isFullscreen(): boolean
}

const LOGO_Y = 24
const LOGO_Y_MENU = 6
const MENU_Y = 128
const LINE_H = 14
const WHITE = { top: 0xffffff, bottom: 0xffffff, outline: 0x000000, outlineW: 1 }
const YELLOW = { top: 0xffe45c, bottom: 0xffb02e, outline: 0x2a0a3d, outlineW: 1 }
// shortcut: placeholder cursor until the fish sprites land (Task 4)
const CURSOR = ['.oooo..', 'obbbbo.', 'obebbbo', '.oooo..']

const KEYS: Record<string, MenuKey> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Enter: 'select', Space: 'select', Escape: 'back',
}

export class TitleScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Image
  private press!: Phaser.GameObjects.Image
  private items!: Phaser.GameObjects.Container
  private menu: MenuState = { page: 'attract', index: 0 }
  private busy = false

  constructor(private hooks: TitleHooks) {
    super('title')
  }

  create(): void {
    addBitmap(this, 'logo', bakeLogo())
    addBitmap(this, 'cursor', paint(CURSOR, { o: 0x2a0a3d, b: 0xff8a3a, e: 0x10222b }))
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x2a7499).setOrigin(0) // placeholder water until the river backdrop
    this.logo = this.add.image(VIEW_W / 2, LOGO_Y, 'logo').setOrigin(0.5, 0)
    this.press = this.add.image(VIEW_W / 2, VIEW_H - 40, this.text('PRESS START', false)).setOrigin(0.5)
    this.items = this.add.container(0, 0)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.key(KEYS[e.code] ?? 'any'))
    this.input.on('pointerdown', () => { if (this.menu.page === 'attract') this.key('any') })
    // Coming back from the game lands on the main menu, not the attract screen.
    this.events.on('wake', () => {
      this.busy = false
      this.menu = { page: 'main', index: 0 }
      this.logo.y = LOGO_Y_MENU
      this.cameras.main.fadeIn(300)
      this.refreshMenu()
    })
  }

  update(time: number): void {
    const base = this.menu.page === 'attract' ? LOGO_Y : LOGO_Y_MENU
    if (!this.tweens.isTweening(this.logo)) this.logo.y = base + Math.round(Math.sin(time / 500) * 2)
    this.press.setVisible(this.menu.page === 'attract' && Math.floor(time / 625) % 2 === 0)
  }

  refreshMenu(): void {
    this.items.removeAll(true)
    const ctx = this.ctx()
    let y = MENU_Y
    if (this.menu.page === 'confirmNew') for (const line of CONFIRM_PROMPT) {
      this.items.add(this.add.image(VIEW_W / 2, y, this.text(line, false)).setOrigin(0.5))
      y += LINE_H
    }
    if (this.menu.page === 'confirmNew') y += LINE_H / 2
    menuItems(this.menu.page, ctx).forEach((item, i) => {
      const sel = i === this.menu.index
      const img = this.add.image(VIEW_W / 2, y, this.text(item.label, sel)).setOrigin(0.5).setInteractive({ useHandCursor: true })
      img.on('pointerover', () => { if (!this.busy && this.menu.index !== i) { this.menu.index = i; this.refreshMenu() } })
      img.on('pointerdown', () => { this.menu.index = i; this.key('select') })
      this.items.add(img)
      if (sel) this.items.add(this.add.image(img.x - img.width / 2 - 6, y, 'cursor').setOrigin(1, 0.5))
      y += LINE_H
    })
  }

  private ctx() {
    return { hasSave: this.hooks.session.hasSave(), fullscreen: this.hooks.isFullscreen() }
  }

  private key(k: MenuKey): void {
    if (this.busy) return
    const wasAttract = this.menu.page === 'attract'
    const { next, action } = menuInput(this.menu, k, this.ctx())
    this.menu = next
    if (wasAttract) this.tweens.add({ targets: this.logo, y: LOGO_Y_MENU, duration: 250, ease: 'Quad.easeOut' })
    if (action === 'toggleFullscreen') this.hooks.toggleFullscreen()
    if (action === 'continue' || action === 'newGame') {
      this.busy = true // a second Enter during the fade must not enter twice
      this.cameras.main.fadeOut(300)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.hooks.enterGame(action === 'continue' ? 'continue' : 'new'))
    }
    this.refreshMenu()
  }

  private text(label: string, selected: boolean): string {
    const key = `txt:${selected ? 'sel' : 'n'}:${label}`
    addBitmap(this, key, stylize(textMask(label, SMALL), selected ? YELLOW : WHITE))
    return key
  }
}
