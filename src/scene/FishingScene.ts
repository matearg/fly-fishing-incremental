import Phaser from 'phaser'
import { JUNK, LOCATIONS, TIMING, type LocationId } from '../game/data'
import { flyStats } from '../game/flies'
import { hashString, lcg } from '../game/rand'
import type { Angler, GameState, Pending } from '../game/state'
import { FEET_Y, figureBitmaps, ROD_TIP, type FigureKind, type Pose } from '../art/figures'
import { fishMouth, fishSideBitmaps, TIER_SCHOOL } from '../art/fish'
import { JUNK_SNAG, junkBitmap } from '../art/junk'
import { BANK_SURFACE, bakeHorizon, bakeSideBank, placeLook, type PlaceLook } from '../art/places'
import { blank, mix, paint } from '../art/pixels'
import { approach, approachTarget, CAST_MS, NOTICE_SHARE, sameCatch, schoolKey, schoolSpecies, trackCatch, type Track } from './choreo'
import { addBitmap } from './textures'

export const VIEW_W = 480
export const VIEW_H = 270
const WATER_Y = 110 // waterline; the place's horizon fills the sky above it
const GROUND_Y = WATER_Y - 8 // the row the anglers stand on
const SINK_MS = 500 // the fly sinking to its depth after the cast
const WRAP = 30 // off-screen margin so fish leave fully before wrapping
// Draw order, back to front.
const Z = { horizon: 0, water: 1, ripples: 2, fish: 3, junk: 4, bank: 5, figures: 6, line: 7, hud: 8 }

export interface SceneHooks { getState: () => GameState; onWaterClick: () => void; onMenu: () => void }

const MENU_BUTTON = ['oooooooooooo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'obwwwwwwwwbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo', 'oooooooooooo']

// stray: a hooked fish from another place, removed once it lands
interface Swimmer { img: Phaser.GameObjects.Image; id: string; frames: [string, string]; x0: number; y: number; speed: number; phase: number; w: number; stray?: boolean }
interface Chosen { sw: Swimmer; pending: Pending; from: [number, number] | null; right: boolean }
interface Place { id: LocationId; look: PlaceLook; maxDepth: number; waterLeft: number; playerX: number; helperX: number; playerFlyX: number; helperFlyX: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => k * k * (3 - 2 * k)

export class FishingScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private ripples!: Phaser.GameObjects.Graphics
  private biteText!: Phaser.GameObjects.Text
  private placeText!: Phaser.GameObjects.Text
  private helperText!: Phaser.GameObjects.Text
  private player!: Phaser.GameObjects.Image
  private helper!: Phaser.GameObjects.Image
  private junk!: Phaser.GameObjects.Image
  private statics: Phaser.GameObjects.GameObject[] = []
  private fish: Swimmer[] = []
  private place: Place | null = null
  private school = ''
  private tracks: [Track, Track] = [{ pending: null, waitMs: 0, lastMs: 0 }, { pending: null, waitMs: 0, lastMs: 0 }]
  private chosen: Chosen | null = null
  private rippleDots: { x0: number; y: number; len: number; speed: number }[] = []

  constructor(private hooks: SceneHooks) {
    super('fishing')
  }

  create(): void {
    this.g = this.add.graphics().setDepth(Z.line)
    this.ripples = this.add.graphics().setDepth(Z.ripples)
    const font = { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', stroke: '#10161c', strokeThickness: 3 }
    this.biteText = this.add.text(0, 0, '!', { ...font, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5, 1).setDepth(Z.hud)
    this.placeText = this.add.text(VIEW_W - 22, 6, '', font).setOrigin(1, 0).setDepth(Z.hud)
    this.helperText = this.add.text(6, 6, '', font).setDepth(Z.hud)
    for (const kind of ['angler', 'helper'] as FigureKind[]) {
      const bmps = figureBitmaps(kind)
      for (const pose of Object.keys(bmps) as Pose[]) addBitmap(this, `fig:${kind}:${pose}`, bmps[pose])
    }
    this.helper = this.add.image(0, 0, 'fig:helper:idle').setOrigin(0).setDepth(Z.figures)
    this.player = this.add.image(0, 0, 'fig:angler:idle').setOrigin(0).setDepth(Z.figures)
    for (const j of JUNK) addBitmap(this, `junk:${j.id}`, junkBitmap(j.id))
    this.junk = this.add.image(0, 0, `junk:${JUNK[0].id}`).setOrigin(0).setDepth(Z.junk).setVisible(false)
    addBitmap(this, 'menu-button', paint(MENU_BUTTON, { o: 0x10161c, b: 0x24323f, w: 0xe8edf2 }))
    this.add.image(VIEW_W - 4, 4, 'menu-button').setOrigin(1, 0).setDepth(Z.hud).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.hooks.onMenu())
    // A click on the menu button is not a cast.
    this.input.on('pointerdown', (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length) this.hooks.onWaterClick() })
    this.input.keyboard?.on('keydown-ESC', () => this.hooks.onMenu())
    this.cameras.main.fadeIn(300)
    this.events.on('wake', () => this.cameras.main.fadeIn(300))
    // Keyboard access to the main action.
    // Space on a focused panel button belongs to that button, not the line.
    this.input.keyboard?.on('keydown-SPACE', () => { if (!document.activeElement?.closest('#ui')) this.hooks.onWaterClick() })
  }

  // Horizon, water, bank and figure spots for the place; rebuilt on travel.
  private buildPlace(id: LocationId): Place {
    for (const o of this.statics) o.destroy()
    const look = placeLook(id), maxDepth = LOCATIONS.find(l => l.id === id)!.maxDepth
    addBitmap(this, `horizon:${id}`, bakeHorizon(look, VIEW_W, WATER_Y, hashString(id)))
    const water = blank(VIEW_W, VIEW_H - WATER_Y)
    for (let y = 0; y < water.h; y++) {
      const c = mix(look.water[0], look.deep, y / (water.h - 1)) // darkens smoothly with depth, no bands
      for (let x = 0; x < VIEW_W; x++) water.data.set([c >> 16, (c >> 8) & 0xff, c & 0xff, 255], (y * VIEW_W + x) * 4)
    }
    addBitmap(this, `water:${id}`, water)
    addBitmap(this, `sidebank:${id}`, bakeSideBank(look, VIEW_H - GROUND_Y + BANK_SURFACE, hashString(id)))
    this.statics = [
      this.add.image(0, 0, `horizon:${id}`).setOrigin(0).setDepth(Z.horizon),
      this.add.image(0, WATER_Y, `water:${id}`).setOrigin(0).setDepth(Z.water),
      this.add.image(0, GROUND_Y - BANK_SURFACE, `sidebank:${id}`).setOrigin(0).setDepth(Z.bank),
    ]
    const rand = lcg(hashString(id) + 7)
    this.rippleDots = Array.from({ length: 34 }, () => ({ x0: rand() * VIEW_W, y: WATER_Y + Math.floor(rand() * 8), len: 2 + Math.floor(rand() * 5), speed: 6 + rand() * 10 }))
    // The player stands at the water's edge (or out on the dock), the helper a step behind.
    const playerX = look.dock ? look.shoreX + 70 : look.shoreX - 34
    const tipX = playerX + ROD_TIP.idle[0]
    return {
      id, look, maxDepth, waterLeft: look.shoreX - 10, playerX, helperX: playerX - 24,
      playerFlyX: Math.min(VIEW_W - 40, tipX + 140), helperFlyX: tipX + 50,
    }
  }

  private buildSchool(s: GameState, place: Place): void {
    for (const f of this.fish) f.img.destroy()
    this.fish = []
    this.chosen = null
    const rand = lcg(hashString(s.location) + 13)
    const band = (VIEW_H - WATER_Y) / (place.maxDepth + 1)
    for (const sp of schoolSpecies(s)) for (let k = 0; k < TIER_SCHOOL[sp.tier]; k++) {
      const against = rand() < 0.3
      this.addSwimmer(sp.id, rand() * VIEW_W, this.depthY(sp.depth, place) + (rand() - 0.5) * band * 0.5, (8 + rand() * 12) * (against ? -1 : 1), rand() * 6)
    }
  }

  // centerY: the swimmer's middle row; it lives until the next school rebuild.
  private addSwimmer(id: string, x0: number, centerY: number, speed: number, phase: number): Swimmer {
    const [a, b] = fishSideBitmaps(id)
    const frames: [string, string] = [`fish-side:${id}:0`, `fish-side:${id}:1`]
    addBitmap(this, frames[0], a); addBitmap(this, frames[1], b)
    const img = this.add.image(0, 0, frames[0]).setOrigin(0).setDepth(Z.fish).setFlipX(speed < 0)
    const sw = { img, id, frames, x0, y: centerY - a.h / 2, speed, phase, w: a.w }
    this.fish.push(sw)
    return sw
  }

  private depthY(depth: number, place: Place): number {
    return WATER_Y + ((depth + 0.5) / (place.maxDepth + 1)) * (VIEW_H - WATER_Y)
  }

  private wrapX(x: number, place: Place): number {
    const left = place.waterLeft - WRAP, span = VIEW_W + WRAP - left
    return ((((x - left) % span) + span) % span) + left
  }

  private schoolPos(f: Swimmer, t: number, place: Place): [number, number] {
    return [this.wrapX(f.x0 + t * f.speed, place), f.y + Math.sin(t * 1.3 + f.phase) * 2]
  }

  // Where the fly comes to rest after the cast and sink.
  private restPos(s: GameState, a: Angler, landX: number, place: Place): [number, number] {
    return [landX, this.depthY(Math.min(flyStats(s, a.fly!).maxDepth, place.maxDepth), place)]
  }

  // Where the angler's fly is, or null while no line is out.
  private flyPos(s: GameState, a: Angler, tr: Track, tip: [number, number], landX: number, place: Place, t: number): [number, number] | null {
    if (a.phase === 'idle' || !a.fly) return null
    const depthY = this.depthY(Math.min(flyStats(s, a.fly).maxDepth, place.maxDepth), place)
    if (a.phase === 'bite') return [landX, depthY + Math.sin(t * 25) * 2] // the tug
    if (a.phase === 'reeling') {
      const k = 1 - a.timerMs / TIMING.reelMs
      return [lerp(landX, Math.max(tip[0], place.waterLeft + 6), k), lerp(depthY, WATER_Y + 2, k)]
    }
    const since = tr.waitMs - a.timerMs
    if (since < CAST_MS) {
      const k = since / CAST_MS
      return [lerp(tip[0], landX, k), lerp(tip[1], WATER_Y, k) - Math.sin(k * Math.PI) * 24]
    }
    if (since < CAST_MS + SINK_MS) return [landX, lerp(WATER_Y, depthY, (since - CAST_MS) / SINK_MS)]
    return [landX, depthY + Math.sin(t * 3.3) * 1.5] // bobbing
  }

  private pose(a: Angler | undefined, tr: Track): Pose {
    if (a?.phase === 'reeling') return 'reel'
    return a?.phase === 'waiting' && tr.waitMs - a.timerMs < CAST_MS ? 'cast' : 'idle'
  }

  private drawLine(tip: [number, number], fly: [number, number]): void {
    const entryX = fly[1] > WATER_Y ? fly[0] - 6 : fly[0]
    this.g.lineStyle(1, 0xf0f0f0, 0.8).lineBetween(tip[0], tip[1], entryX, Math.min(fly[1], WATER_Y))
    if (fly[1] > WATER_Y) this.g.lineBetween(entryX, WATER_Y, fly[0], fly[1])
    this.g.fillStyle(0xffe066).fillRect(Math.round(fly[0]) - 1, Math.round(fly[1]) - 1, 2, 2)
  }

  // Top-left for a sprite whose `point` (in unflipped sprite pixels) should sit on `at`.
  private anchor(at: [number, number], point: [number, number], w: number, right: boolean): [number, number] {
    return [at[0] - (right ? point[0] : w - 1 - point[0]), at[1] - point[1]]
  }

  private release(t: number, place: Place, offscreen: boolean): void {
    const c = this.chosen
    if (!c) return
    this.chosen = null
    if (c.sw.stray) { c.sw.img.destroy(); this.fish = this.fish.filter(f => f !== c.sw); return }
    const x = offscreen ? VIEW_W + WRAP - 1 : c.sw.img.x
    c.sw.x0 = x - t * c.sw.speed
    c.sw.img.setFlipX(c.sw.speed < 0)
  }

  update(time: number): void {
    const s = this.hooks.getState()
    const t = time / 1000
    if (this.place?.id !== s.location) { this.place = this.buildPlace(s.location); this.school = '' }
    const place = this.place
    if (this.school !== schoolKey(s)) { this.school = schoolKey(s); this.buildSchool(s, place) }

    this.ripples.clear().fillStyle(place.look.ripple)
    for (const r of this.rippleDots) this.ripples.fillRect(Math.floor(this.wrapX(r.x0 + t * r.speed, place)), r.y, r.len, 1)

    for (const f of this.fish) {
      if (f === this.chosen?.sw) continue
      const [x, y] = this.schoolPos(f, t, place)
      f.img.setPosition(Math.round(x), Math.round(y)).setTexture(f.frames[Math.floor(t * 8 + f.phase) % 2]) // ≈4 Hz tail
    }

    const figY = GROUND_Y - FEET_Y
    const p = s.anglers[0], h = s.anglers[1]
    const ptr = trackCatch(this.tracks[0], p), htr = trackCatch(this.tracks[1], h)
    this.g.clear()

    // Helper figure: one stands in for anglers[1]; the rest work out of sight. Its catches are never drawn.
    this.helper.setVisible(!!h)
    if (h) {
      const pose = this.pose(h, htr)
      this.helper.setTexture(`fig:helper:${pose}`).setPosition(place.helperX, figY)
      const tip: [number, number] = [place.helperX + ROD_TIP[pose][0], figY + ROD_TIP[pose][1]]
      const fly = this.flyPos(s, h, htr, tip, place.helperFlyX, place, t + 1.7)
      if (fly) this.drawLine(tip, fly)
    }

    const pose = this.pose(p, ptr)
    this.player.setTexture(`fig:angler:${pose}`).setPosition(place.playerX, figY)
    const tip: [number, number] = [place.playerX + ROD_TIP[pose][0], figY + ROD_TIP[pose][1]]
    const fly = this.flyPos(s, p, ptr, tip, place.playerFlyX, place, t)
    if (fly) this.drawLine(tip, fly)
    this.biteText.setVisible(p.phase === 'bite').setPosition(place.playerX + 7, figY - 2)

    // The catch picked at cast swims (or drifts) to the fly, bites, and is reeled in.
    const pending = p.phase === 'idle' ? null : p.pending
    if (this.chosen && !sameCatch(this.chosen.pending, pending)) this.release(t, place, p.phase === 'idle')
    if (pending?.kind === 'fish' && !this.chosen) {
      // A fish hooked at another place (travel during a bite) has no school here; it gets a sprite of its own.
      const sw = this.fish.find(f => f.id === pending.defId) ?? (p.phase !== 'waiting' && fly ? Object.assign(this.addSwimmer(pending.defId, fly[0], fly[1], -10, 0), { stray: true }) : undefined)
      if (sw) this.chosen = { sw, pending, from: null, right: sw.speed > 0 }
    }
    const aim = fly && approachTarget(p.phase, fly, this.restPos(s, p, place.playerFlyX, place))
    if (this.chosen && aim) this.moveChosen(this.chosen, p, ptr, aim, t, place)
    this.moveJunk(pending, p, ptr, aim)

    const helpers = s.anglers.length - 1
    this.helperText.setVisible(helpers > 0).setText(`Helpers ${helpers}`)
    this.placeText.setText(LOCATIONS.find(l => l.id === s.location)!.name)
  }

  private moveChosen(c: Chosen, p: Angler, tr: Track, fly: [number, number], t: number, place: Place): void {
    const { sw } = c, mouth = fishMouth(sw.id)
    sw.img.setTexture(sw.frames[Math.floor(t * 8 + sw.phase) % 2])
    const a = p.phase === 'waiting' ? approach(p.timerMs, tr.waitMs) : { stage: 'swim' as const, k: 1 }
    if (a.stage === 'cruise') {
      const [x, y] = this.schoolPos(sw, t, place)
      sw.img.setPosition(Math.round(x), Math.round(y))
      return
    }
    if (!c.from) {
      c.from = this.schoolPos(sw, t, place)
      c.right = c.from[0] + sw.w / 2 < fly[0]
    }
    const target = this.anchor(fly, mouth, sw.w, c.right)
    let x = target[0], y = target[1]
    if (a.stage === 'notice') {
      // Stops, then turns to face the fly halfway through.
      ;[x, y] = [c.from[0], c.from[1] + Math.sin(t * 6) * 0.5]
      sw.img.setFlipX(a.k < 0.5 ? sw.speed < 0 : !c.right)
    } else {
      x = lerp(c.from[0], target[0], ease(a.k)); y = lerp(c.from[1], target[1], ease(a.k))
      sw.img.setFlipX(!c.right)
    }
    sw.img.setPosition(Math.round(x), Math.round(y))
  }

  private moveJunk(pending: Pending | null, p: Angler, tr: Track, fly: [number, number] | null): void {
    if (pending?.kind !== 'junk' || !fly) { this.junk.setVisible(false); return }
    const key = `junk:${pending.defId}`
    const snag = JUNK_SNAG[pending.defId], at = this.anchor(fly, snag, 0, true)
    let x = at[0]
    if (p.phase === 'waiting') {
      const a = approach(p.timerMs, tr.waitMs)
      if (a.stage === 'cruise') { this.junk.setVisible(false); return }
      const q = a.stage === 'notice' ? a.k * NOTICE_SHARE : NOTICE_SHARE + a.k * (1 - NOTICE_SHARE)
      x = lerp(VIEW_W + 4, at[0], q) // drifts in with the current at the fly's depth
    }
    this.junk.setTexture(key).setVisible(true).setPosition(Math.round(x), Math.round(at[1]))
  }
}
