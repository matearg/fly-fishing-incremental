import Phaser from 'phaser'
import { SMALL, textMask } from '../art/font'
import { bakeLogo } from '../art/logo'
import { stylize } from '../art/pixels'
import type { Session } from '../session'
import { addBitmap } from './textures'
import { VIEW_H, VIEW_W } from './FishingScene'

export interface TitleHooks { session: Session; enterGame(kind: 'continue' | 'new'): void }

const LOGO_Y = 24

export class TitleScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Image
  private press!: Phaser.GameObjects.Image

  constructor(private hooks: TitleHooks) {
    super('title')
  }

  create(): void {
    addBitmap(this, 'logo', bakeLogo())
    addBitmap(this, 'press-start', stylize(textMask('PRESS START', SMALL), { top: 0xffffff, bottom: 0xffffff, outline: 0x000000, outlineW: 1 }))
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x2a7499).setOrigin(0) // placeholder water until the river backdrop
    this.logo = this.add.image(VIEW_W / 2, LOGO_Y, 'logo').setOrigin(0.5, 0)
    this.press = this.add.image(VIEW_W / 2, VIEW_H - 40, 'press-start').setOrigin(0.5)
    this.input.keyboard?.on('keydown', () => this.hooks.enterGame('continue'))
    this.input.on('pointerdown', () => this.hooks.enterGame('continue'))
  }

  update(time: number): void {
    this.logo.y = LOGO_Y + Math.round(Math.sin(time / 500) * 2)
    this.press.setVisible(Math.floor(time / 625) % 2 === 0)
  }
}
