import Phaser from 'phaser'
import { LOCATIONS, SPECIES, TIERS, type Tier } from '../game/data'
import { flyStats } from '../game/flies'
import type { GameState } from '../game/state'
import { paint } from '../art/pixels'
import { addBitmap } from './textures'

export const VIEW_W = 480
export const VIEW_H = 270
const WATER_X = 90
const WATER_Y = 70
const BANK_Y = 58

const TIER_COLOR: Record<Tier, number> = { common: 0x9aa7a0, uncommon: 0x6fbf73, rare: 0x4f8fe0, legendary: 0xf2c14e }
const TIER_COUNT: Record<Tier, number> = { common: 3, uncommon: 2, rare: 1, legendary: 1 }

export interface SceneHooks { getState: () => GameState; onWaterClick: () => void; onMenu: () => void }

const MENU_BUTTON = ['oooooooooooo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'oooooooooooo']

export class FishingScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private biteText!: Phaser.GameObjects.Text
  private placeText!: Phaser.GameObjects.Text

  constructor(private hooks: SceneHooks) {
    super('fishing')
  }

  create(): void {
    this.g = this.add.graphics()
    const font = { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }
    this.biteText = this.add.text(0, 0, '!', { ...font, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5, 1)
    this.placeText = this.add.text(VIEW_W - 22, 6, '', font).setOrigin(1, 0)
    addBitmap(this, 'menu-button', paint(MENU_BUTTON, { o: 0x10161c, b: 0x24323f, w: 0xe8edf2 }))
    this.add.image(VIEW_W - 4, 4, 'menu-button').setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.hooks.onMenu())
    // A click on the menu button is not a cast.
    this.input.on('pointerdown', (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) this.hooks.onWaterClick() })
    this.input.keyboard?.on('keydown-ESC', () => this.hooks.onMenu())
    this.cameras.main.fadeIn(300)
    this.events.on('wake', () => this.cameras.main.fadeIn(300))
    // Keyboard access to the main action.
    // Space on a focused panel button belongs to that button, not the line.
    this.input.keyboard?.on('keydown-SPACE', () => { if (!document.activeElement?.closest('#ui')) this.hooks.onWaterClick() })
  }

  update(time: number): void {
    const s = this.hooks.getState()
    const loc = LOCATIONS.find(l => l.id === s.location)!
    const bands = loc.maxDepth + 1
    const bandH = (VIEW_H - WATER_Y) / bands
    const bandMid = (d: number) => WATER_Y + bandH * (d + 0.5)
    const g = this.g
    g.clear()

    g.fillStyle(0x87b5d9).fillRect(0, 0, VIEW_W, WATER_Y)
    for (let d = 0; d < bands; d++) {
      const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x3a7ca5), Phaser.Display.Color.ValueToColor(0x0b2540), bands, d)
      g.fillStyle(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b)).fillRect(WATER_X, WATER_Y + d * bandH, VIEW_W - WATER_X, Math.ceil(bandH))
    }
    g.fillStyle(0x5b8c3a).fillRect(0, BANK_Y, WATER_X, 6)
    g.fillStyle(0x6b4f2e).fillRect(0, BANK_Y + 6, WATER_X, VIEW_H - BANK_Y - 6)

    // Ambient fish, only species catchable here.
    const here = SPECIES.filter(sp => sp.location === s.location && (!sp.licenseCost || s.licenseSpecies.includes(sp.id)))
    here.forEach((sp, i) => {
      for (let k = 0; k < TIER_COUNT[sp.tier]; k++) {
        const seed = i * 97 + k * 151
        const speed = 0.01 + (TIERS.indexOf(sp.tier) + 1) * 0.004
        const x = WATER_X + ((time * speed + seed * 7) % (VIEW_W - WATER_X))
        const y = bandMid(sp.depth) + ((seed % 9) - 4) * (bandH / 14)
        g.fillStyle(TIER_COLOR[sp.tier]).fillRect(Math.floor(x), Math.floor(y), sp.tier === 'legendary' ? 14 : 10, 4)
      }
    })

    // Anglers along the bank; the player first, in a distinct color.
    const spacing = Math.min(14, (WATER_X - 12) / s.anglers.length)
    this.biteText.setVisible(false)
    s.anglers.forEach((a, i) => {
      const ax = 6 + i * spacing
      g.fillStyle(i === 0 ? 0xd9534f : 0xe8d8b0).fillRect(ax, BANK_Y - 14, 6, 14)
      if (a.phase === 'idle' || !a.fly) return
      const depth = Math.min(flyStats(s, a.fly).maxDepth, loc.maxDepth)
      const fx = WATER_X + 20 + ((i * 53) % (VIEW_W - WATER_X - 40))
      const fy = bandMid(depth) + Math.sin(time / 300 + i) * 2 + (a.phase === 'bite' ? Math.sin(time / 40) * 2 : 0)
      g.lineStyle(1, 0xf0f0f0, 0.8).lineBetween(ax + 6, BANK_Y - 20, fx, fy)
      g.fillStyle(0xffe066).fillRect(fx - 1, fy - 1, 3, 3)
      if (i === 0 && a.phase === 'bite') this.biteText.setPosition(ax + 3, BANK_Y - 18).setVisible(true)
    })
    this.placeText.setText(loc.name)
  }
}
