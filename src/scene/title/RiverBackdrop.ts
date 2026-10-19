import Phaser from 'phaser'
import { placeSpecies } from '../../game/fishing/catch'
import type { LocationId } from '../../game/data'
import { hashString, lcg } from '../../game/util/rand'
import { fishBitmaps, TIER_SCHOOL } from '../../art/sprites/fish'
import { bakeBank, placeLook } from '../../art/places'
import { FINE, paint } from '../../art/pixels'
import { addBitmap } from '../textures'
import { VIEW_H, VIEW_W } from '../view'

const WRAP = 30 // off-screen margin so sprites leave fully before wrapping
const wrapX = (x: number) => (((x + WRAP) % (VIEW_W + WRAP * 2)) + VIEW_W + WRAP * 2) % (VIEW_W + WRAP * 2) - WRAP

interface Swimmer { img: Phaser.GameObjects.Image; frames: [string, string]; x0: number; y: number; speed: number; phase: number }
interface Drifter { x0: number; y: number; len: number; speed: number }

// Top-down river for the title: banks, banded water, a school of the place's fish, ripples and the place's drift (foam, leaves, twigs).
export class RiverBackdrop {
  private objs: Phaser.GameObjects.GameObject[] = []
  private fish: Swimmer[] = []
  private drift: { img: Phaser.GameObjects.Image; x0: number; speed: number }[] = []
  private ripples: Drifter[] = []
  private g: Phaser.GameObjects.Graphics
  private rippleColor: number

  constructor(scene: Phaser.Scene, location: LocationId, licensed: string[]) {
    const look = placeLook(location)
    const rand = lcg(hashString(location))
    const top = Math.round((VIEW_H - look.riverH) / 2), bottom = top + look.riverH

    const water = scene.add.graphics()
    const n = look.water.length, half = look.riverH / 2
    look.water.forEach((c, i) => {
      const h = Math.ceil(half / n), off = Math.floor((half / n) * i)
      water.fillStyle(c).fillRect(0, top + off, VIEW_W, h).fillRect(0, bottom - off - h, VIEW_W, h)
    })
    this.objs.push(water)

    for (const sp of placeSpecies(location, licensed)) {
      const [a, b] = fishBitmaps(sp.id)
      const frames: [string, string] = [`fish:${sp.id}:0`, `fish:${sp.id}:1`]
      addBitmap(scene, frames[0], a); addBitmap(scene, frames[1], b)
      for (let k = 0; k < TIER_SCHOOL[sp.tier]; k++) {
        const against = rand() < 0.2
        const img = scene.add.image(0, 0, frames[0]).setFlipX(against)
        this.fish.push({ img, frames, x0: rand() * VIEW_W, y: top + 12 + rand() * (look.riverH - 24), speed: (10 + rand() * 14) * (against ? -1 : 1), phase: rand() * 6 })
        this.objs.push(img)
      }
    }

    const drift = `drift:${location}`
    addBitmap(scene, drift, paint(look.drift.grid, look.drift.palette))
    for (let i = 0; i < look.drift.perBank; i++) {
      const img = scene.add.image(0, top + 10 + rand() * (look.riverH - 20), drift)
      this.drift.push({ img, x0: rand() * VIEW_W, speed: 4 + rand() * 3 })
      this.objs.push(img)
    }

    this.rippleColor = look.ripple
    this.ripples = Array.from({ length: 40 }, () => ({ x0: rand() * VIEW_W, y: top + 3 + Math.floor(rand() * (look.riverH - 6)), len: 2 + Math.floor(rand() * 5), speed: 6 + rand() * 10 }))
    this.g = scene.add.graphics()
    this.objs.push(this.g)

    const above = `bank:${location}:above`, below = `bank:${location}:below`
    addBitmap(scene, above, bakeBank(look, VIEW_W, top, 'bottom', 11))
    addBitmap(scene, below, bakeBank(look, VIEW_W, VIEW_H - bottom, 'top', 23))
    this.objs.push(scene.add.image(0, 0, above).setOrigin(0), scene.add.image(0, bottom, below).setOrigin(0))
  }

  update(timeMs: number): void {
    const t = timeMs / 1000
    for (const f of this.fish) {
      f.img.setPosition(Math.round(wrapX(f.x0 + t * f.speed)), Math.round(f.y + Math.sin(t * 1.3 + f.phase) * 2))
      f.img.setTexture(f.frames[Math.floor(t * 8 + f.phase) % 2]) // ≈4 Hz tail wiggle
    }
    for (const p of this.drift) p.img.setX(Math.round(wrapX(p.x0 + t * p.speed)))
    this.g.clear().fillStyle(this.rippleColor)
    for (const r of this.ripples) this.g.fillRect(Math.floor(wrapX(r.x0 + t * r.speed)), r.y, r.len, 1 / FINE)
  }

  destroy(): void {
    for (const o of this.objs) o.destroy()
  }
}
