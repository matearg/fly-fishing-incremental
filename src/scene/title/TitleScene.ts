import Phaser from 'phaser'
import { bakeLogo } from '../../art/logo'
import { iconBitmap, SCENE_ICONS } from '../../art/icons'
import type { Session } from '../../session'
import { BAR_SEGMENT, NOTES, SPEAKER, soundIconMask } from '../../art/soundIcons'
import { stylize, type Grid } from '../../art/pixels'
import { setLevel, toggleMute, type SoundSettings } from '../../audio/settings'
import type { SoundId } from '../../audio/sounds'
import { CONFIRM_PROMPT, menuCue, menuInput, menuItems, type MenuKey, type MenuState } from './menu'
import { RiverBackdrop } from './RiverBackdrop'
import { addBitmap, addText, TEXT_GREY, TEXT_WHITE, TEXT_YELLOW } from '../textures'
import { TITLE_ANCHOR, TITLE_KEEP, VIEW_H, VIEW_W, viewScroll } from '../view'

export interface TitleHooks {
  session: Session
  enterGame(kind: 'continue' | 'new'): void
  toggleFullscreen(): void
  isFullscreen(): boolean
  canFullscreen(): boolean
  play(id: SoundId): void
  sound(): SoundSettings
  setSound(s: SoundSettings): void
  music(): SoundSettings
  setMusic(s: SoundSettings): void
}

const LOGO_Y = 24
const LOGO_Y_MENU = 6
const MENU_Y = 128
const LINE_H = 14
// Sound row, in pixels: icon, gap, 10 segments 1 px apart, gap, percent.
const ROW_GAP = 6
const SEG_STEP = BAR_SEGMENT[0].length + 1
const BAR_W = 10 * SEG_STEP - 1

const KEYS: Record<string, MenuKey> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'select', Space: 'select', Escape: 'back',
}

export class TitleScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Image
  private press!: Phaser.GameObjects.Image
  private items!: Phaser.GameObjects.Container
  private menu: MenuState = { page: 'attract', index: 0 }
  private busy = false
  private river?: RiverBackdrop

  constructor(private hooks: TitleHooks) {
    super('title')
  }

  create(): void {
    addBitmap(this, 'logo', bakeLogo())
    addBitmap(this, 'cursor', iconBitmap(SCENE_ICONS.cursor))
    this.buildRiver()
    this.logo = this.add.image(VIEW_W / 2, LOGO_Y, 'logo').setOrigin(0.5, 0).setDepth(10)
    this.press = this.add.image(VIEW_W / 2, VIEW_H - 40, this.text('PRESS START', false)).setOrigin(0.5).setDepth(10)
    this.items = this.add.container(0, 0).setDepth(10)
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.key(KEYS[e.code] ?? 'any'))
    this.input.on('pointerdown', () => { if (this.menu.page === 'attract') this.key('any') })
    // Coming back from the game lands on the main menu, not the attract screen.
    this.events.on('wake', () => {
      this.busy = false
      this.menu = { page: 'main', index: 0 }
      this.logo.y = LOGO_Y_MENU
      this.buildRiver() // the player may have moved to another place
      this.cameras.main.fadeIn(300)
      this.refreshMenu()
    })
  }

  update(time: number): void {
    this.cameras.main.setScroll(...viewScroll(this.scale.width, this.scale.height, TITLE_KEEP, TITLE_ANCHOR))
    this.river?.update(time)
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
      if (item.id === 'sound') this.volumeRow(y, i, sel, SPEAKER, this.hooks.sound(), s => this.hooks.setSound(s))
      else if (item.id === 'music') this.volumeRow(y, i, sel, NOTES, this.hooks.music(), s => this.hooks.setMusic(s))
      else {
        const img = this.add.image(VIEW_W / 2, y, this.text(item.label, sel)).setOrigin(0.5)
        this.hover(img, i).on('pointerdown', () => { this.menu.index = i; this.key('select') })
        this.items.add(img)
        if (sel) this.items.add(this.add.image(img.x - img.width / 2 - 6, y, 'cursor').setOrigin(1, 0.5))
      }
      y += LINE_H
    })
  }

  // Hovering an item moves the highlight there, with the same blip as the arrow keys.
  private hover(obj: Phaser.GameObjects.Image, i: number): Phaser.GameObjects.Image {
    return obj.setInteractive({ useHandCursor: true }).on('pointerover', () => {
      if (this.busy || this.menu.index === i) return
      this.menu.index = i
      this.hooks.play('move')
      this.refreshMenu()
    })
  }

  // [icon] [10-step bar] [percent | OFF]. Clicking the icon or percent toggles mute; a segment sets that level.
  private volumeRow(y: number, i: number, sel: boolean, grid: Grid, s: SoundSettings, set: (s: SoundSettings) => void): void {
    const style = sel ? TEXT_YELLOW : TEXT_WHITE, styleName = sel ? 'yellow' : 'white'
    const iconKey = `snd:${grid.join('/')}:${s.muted}:${styleName}`
    addBitmap(this, iconKey, stylize(soundIconMask(grid, s.muted), style))
    const label = this.text(s.muted ? 'OFF' : `${s.level * 10}%`, sel)
    // Images carry a 1 px outline on each side; lay out by their ink.
    const iconW = grid[0].length, labelW = this.textures.get(label).getSourceImage().width - 2
    let x = Math.round(VIEW_W / 2 - (iconW + ROW_GAP + BAR_W + ROW_GAP + labelW) / 2)
    const select = () => { this.menu.index = i; this.key('select') }
    const icon = this.add.image(x - 1, y, iconKey).setOrigin(0, 0.5)
    this.hover(icon, i).on('pointerdown', select)
    this.items.add(icon)
    if (sel) this.items.add(this.add.image(x - 6, y, 'cursor').setOrigin(1, 0.5))
    x += iconW + ROW_GAP
    for (let j = 0; j < 10; j++) {
      const on = j < s.level && !s.muted
      const segKey = `snd:seg:${on ? styleName : 'grey'}`
      addBitmap(this, segKey, stylize(soundIconMask(BAR_SEGMENT, false), on ? style : TEXT_GREY))
      const seg = this.add.image(x + j * SEG_STEP - 1, y, segKey).setOrigin(0, 0.5)
      this.hover(seg, i).on('pointerdown', () => {
        if (this.busy) return
        this.menu.index = i
        set(setLevel(s, j + 1))
        this.hooks.play('move')
        this.refreshMenu()
      })
      this.items.add(seg)
    }
    x += BAR_W + ROW_GAP
    const text = this.add.image(x - 1, y, label).setOrigin(0, 0.5)
    this.hover(text, i).on('pointerdown', select)
    this.items.add(text)
  }

  private buildRiver(): void {
    this.river?.destroy()
    const s = this.hooks.session.state
    this.river = new RiverBackdrop(this, s.location, s.licenseSpecies)
  }

  private ctx() {
    return { hasSave: this.hooks.session.hasSave(), fullscreen: this.hooks.isFullscreen(), canFullscreen: this.hooks.canFullscreen(), sound: this.hooks.sound(), music: this.hooks.music() }
  }

  private key(k: MenuKey): void {
    if (this.busy) return
    const prev = this.menu, wasAttract = prev.page === 'attract'
    const r = menuInput(prev, k, this.ctx()), { next, action } = r
    this.menu = next
    if (wasAttract) this.tweens.add({ targets: this.logo, y: LOGO_Y_MENU, duration: 250, ease: 'Quad.easeOut' })
    if (action === 'toggleFullscreen') this.hooks.toggleFullscreen()
    const s = this.hooks.sound(), mu = this.hooks.music()
    if (action === 'soundMute') this.hooks.setSound(toggleMute(s))
    if (action === 'soundDown' || action === 'soundUp') this.hooks.setSound(setLevel(s, s.level + (action === 'soundUp' ? 1 : -1)))
    if (action === 'musicMute') this.hooks.setMusic(toggleMute(mu))
    if (action === 'musicDown' || action === 'musicUp') this.hooks.setMusic(setLevel(mu, mu.level + (action === 'musicUp' ? 1 : -1)))
    // After the volume change, so it's heard at the new level.
    const cue = menuCue(prev, k, r)
    if (cue) this.hooks.play(cue)
    if (action === 'continue' || action === 'newGame') {
      this.busy = true // a second Enter during the fade must not enter twice
      this.cameras.main.fadeOut(300)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.hooks.enterGame(action === 'continue' ? 'continue' : 'new'))
    }
    this.refreshMenu()
  }

  private text(label: string, selected: boolean): string {
    return addText(this, label, selected ? TEXT_YELLOW : TEXT_WHITE)
  }
}
