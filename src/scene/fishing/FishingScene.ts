import Phaser from 'phaser'
import { JUNK, LOCATIONS, SPECIES, TIMING, TROPHY, type LocationId } from '../../game/data'
import { placeSpecies } from '../../game/fishing/catch'
import { reachDepth } from '../../game/fishing/flies'
import { hashString, lcg } from '../../game/util/rand'
import type { Angler, GameState, Pending } from '../../game/state'
import { BODY_X, BODY_Y, FEET_Y, figureBitmaps, guideBitmap, ROD_TIP, type Pose } from '../../art/sprites/figures'
import { PLAQUE_STYLE, plaqueBitmap } from '../../art/sprites/plaque'
import { BOUNTY_STYLE, logCardBitmap } from '../../art/sprites/logcard'
import { bountyOf } from '../../game/progress/log'
import { formatNumber } from '../../game/util/format'
import { notePlaques, plaqueFrame, resumePlaques, type PlaqueQueue } from './plaque'
import { figureSpots } from './spots'
import { fishMouth, fishSideBitmaps, TIER_SCHOOL } from '../../art/sprites/fish'
import { JUNK_SNAG, junkBitmap } from '../../art/sprites/junk'
import { placeLook, type PlaceLook } from '../../art/places'
import { BANK_SURFACE, bakeSideBank } from '../../art/scenery/bank'
import { bakeHorizon } from '../../art/scenery/skyline'
import { bakeSideWater } from '../../art/scenery/water'
import { iconBitmap, SCENE_ICONS } from '../../art/icons'
import { FINE } from '../../art/pixels'
import { approach, approachTarget, CAST_MS, castLine, castPose, ease, insectPos, letterWave, NOTICE_SHARE, releaseOffscreen, sameCatch, schoolKey, SINK_MS, trackCatch, type Pt, type Track } from './choreo'
import { bannerLetters, CHUM_STYLE, CHUM_TEXT, HATCH_STYLE, HATCH_TEXT } from '../../art/banner'
import { insectBitmaps } from '../../art/sprites/insects'
import { LINE_FLY_EYE, lineFlyBitmap } from '../../art/sprites/flies'
import { addBitmap, addText, fineImage, TEXT_WHITE, TEXT_YELLOW } from '../textures'
import { anglerCues, comboCue, cueFrame, hatchCue, type CueFrame } from '../../audio/cues'
import { HELPER_GAIN, type SoundId } from '../../audio/sounds'
import { FISHING_ANCHOR, FISHING_KEEP, VIEW_H, VIEW_W, viewScroll } from '../view'

const WATER_Y = 110 // waterline; the place's horizon fills the sky above it
const GROUND_Y = WATER_Y - 8 // the row the anglers stand on
// Middle of a depth band; the place's water splits into maxDepth + 1 bands.
const depthY = (depth: number, maxDepth: number) => WATER_Y + ((depth + 0.5) / (maxDepth + 1)) * (VIEW_H - WATER_Y)
const WRAP = 30 // off-screen margin so fish leave fully before wrapping
// Draw order, back to front.
// The helper stands a step behind the player: it, its line and its fly draw under the player.
const Z = { horizon: 0, water: 1, ripples: 2, fish: 3, junk: 4, bank: 5, helper: 5.5, figures: 6, line: 7, insects: 7.6, hud: 8 }
const INSECTS = 16

export interface SceneHooks { getState: () => GameState; onWaterClick: () => void; onMenu: () => void; play: (id: SoundId, scale?: number, pitch?: number) => void }

// stray: a hooked fish from another place, removed once it lands
interface Swimmer { img: Phaser.GameObjects.Image; id: string; frames: [string, string]; x0: number; y: number; speed: number; phase: number; w: number; stray?: boolean }
interface Chosen { sw: Swimmer; pending: Pending; from: [number, number] | null; right: boolean; lastPhase: Angler['phase'] }
interface Place { id: LocationId; look: PlaceLook; maxDepth: number; waterLeft: number; playerX: number; helperX: number; guideX: number; playerFlyX: number; helperFlyX: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

export class FishingScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics
  private helperLine!: Phaser.GameObjects.Graphics
  private ripples!: Phaser.GameObjects.Graphics
  private biteText!: Phaser.GameObjects.Image
  private placeText!: Phaser.GameObjects.Image
  private comboText!: Phaser.GameObjects.Image
  private comboName!: Phaser.GameObjects.Image
  private helperText!: Phaser.GameObjects.Image
  private menuButton!: Phaser.GameObjects.Image
  private player!: Phaser.GameObjects.Image
  private helper!: Phaser.GameObjects.Image
  private guide!: Phaser.GameObjects.Image
  private plaque!: { board: Phaser.GameObjects.Image; name: Phaser.GameObjects.Image; bonus: Phaser.GameObjects.Image }
  private plaques: PlaqueQueue | null = null
  private plaquesStale = true // set by a wake or a state swap: trophies already mounted never pop up, unseen ones replay
  // The tied fly at the end of each visible line: player, helper.
  private flies!: [Phaser.GameObjects.Image, Phaser.GameObjects.Image]
  private junk!: Phaser.GameObjects.Image
  private statics: Phaser.GameObjects.GameObject[] = []
  private fish: Swimmer[] = []
  private place: Place | null = null
  private school = ''
  private tracks: [Track, Track] = [{ pending: null, waitMs: 0, castMs: 0, lastMs: 0 }, { pending: null, waitMs: 0, castMs: 0, lastMs: 0 }]
  private chosen: Chosen | null = null
  private rippleDots: { x0: number; y: number; len: number; speed: number }[] = []
  // True until the first update after create/wake: a key that switched scenes must not also cast or leave.
  private settling = true
  // Last frame's player and visible helper, for the sounds of what changed since. Reset when the state object is swapped.
  private cues: [CueFrame | null, CueFrame | null] = [null, null]
  private cueState: GameState | null = null
  private prevCombo: number | null = null // like prevHatchMs: no tick for a streak a loaded save already had
  private prevHatchMs: number | null = null // null right after a wake or a state swap: no hatch buzz for an effect already on
  // Power-up titles, one image per letter with its x from the title's left edge; and the hatch insects.
  private banners!: { chum: { img: Phaser.GameObjects.Image; dx: number }[]; hatch: { img: Phaser.GameObjects.Image; dx: number }[] }
  private insects: Phaser.GameObjects.Image[] = []

  constructor(private hooks: SceneHooks) {
    super('fishing')
  }

  create(): void {
    this.g = this.add.graphics().setDepth(Z.line)
    this.helperLine = this.add.graphics().setDepth(Z.helper + 0.1)
    this.ripples = this.add.graphics().setDepth(Z.ripples)
    this.biteText = this.add.image(0, 0, addText(this, '!', TEXT_YELLOW)).setOrigin(0.5, 1).setDepth(Z.hud)
    this.placeText = this.add.image(VIEW_W - 22, 6, addText(this, ' ', TEXT_WHITE)).setOrigin(1, 0).setDepth(Z.hud).setScrollFactor(0)
    this.comboText = this.add.image(VIEW_W - 22, 0, addText(this, ' ', TEXT_YELLOW)).setOrigin(1, 0).setDepth(Z.hud).setScrollFactor(0)
    this.comboName = this.add.image(VIEW_W - 22, 0, addText(this, ' ', TEXT_WHITE)).setOrigin(1, 0).setDepth(Z.hud).setScrollFactor(0)
    this.helperText = this.add.image(6, 6, addText(this, ' ', TEXT_WHITE)).setOrigin(0).setDepth(Z.hud).setScrollFactor(0)
    const helperBmps = figureBitmaps('helper')
    for (const pose of Object.keys(helperBmps) as Pose[]) addBitmap(this, `fig:helper:${pose}`, helperBmps[pose])
    this.helper = fineImage(this, 0, 0, 'fig:helper:idle').setOrigin(0).setDepth(Z.helper)
    // Over the helper so its net shows, but under the helper's line.
    addBitmap(this, 'fig:guide', guideBitmap())
    this.guide = fineImage(this, 0, 0, 'fig:guide').setOrigin(0).setDepth(Z.helper + 0.05).setVisible(false)
    const hud = (img: Phaser.GameObjects.Image) => img.setOrigin(0.5, 0).setDepth(Z.hud).setScrollFactor(0).setVisible(false)
    this.plaque = {
      board: hud(fineImage(this, 0, 0, 'fig:guide')),
      name: hud(this.add.image(0, 0, addText(this, ' ', PLAQUE_STYLE))),
      bonus: hud(this.add.image(0, 0, addText(this, ' ', PLAQUE_STYLE))),
    }
    this.player = fineImage(this, 0, 0, this.playerFig('plainRod', 'plainWaders', 'idle')).setOrigin(0).setDepth(Z.figures)
    this.flies = [Z.line + 0.5, Z.helper + 0.2].map(z => fineImage(this, 0, 0, this.lineFly('basicDry')).setOrigin(0).setDepth(z).setVisible(false)) as [Phaser.GameObjects.Image, Phaser.GameObjects.Image]
    for (const j of JUNK) addBitmap(this, `junk:${j.id}`, junkBitmap(j.id))
    this.junk = fineImage(this, 0, 0, `junk:${JUNK[0].id}`).setOrigin(0).setDepth(Z.junk).setVisible(false)
    addBitmap(this, 'menu-button', iconBitmap(SCENE_ICONS.menuButton))
    this.menuButton = this.add.image(VIEW_W - 4, 4, 'menu-button').setOrigin(1, 0).setDepth(Z.hud).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.settling) this.hooks.onMenu() })
    // A click on the menu button is not a cast.
    this.input.on('pointerdown', (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => { if (!over.length && !this.settling) this.hooks.onWaterClick() })
    this.input.keyboard?.on('keydown-ESC', () => { if (!this.settling) this.hooks.onMenu() })
    const banner = (key: string, text: string, style: typeof CHUM_STYLE) => {
      let x = 0
      return bannerLetters(text, style).flatMap((b, i) => {
        if (!b) { x += 8; return [] }
        addBitmap(this, `banner:${key}:${i}`, b)
        const out = { img: this.add.image(0, 0, `banner:${key}:${i}`).setOrigin(0).setDepth(Z.hud).setScrollFactor(0).setVisible(false), dx: x }
        x += b.w
        return [out]
      })
    }
    this.banners = { chum: banner('chum', CHUM_TEXT, CHUM_STYLE), hatch: banner('hatch', HATCH_TEXT, HATCH_STYLE) }
    insectBitmaps().forEach((b, k) => addBitmap(this, `insect:${k}`, b))
    this.insects = Array.from({ length: INSECTS }, () => fineImage(this, 0, 0, 'insect:0').setOrigin(0.5).setDepth(Z.insects).setVisible(false))
    this.cameras.main.setOrigin(0).setZoom(FINE).fadeIn(300)
    this.events.on('wake', () => { this.settling = true; this.cues = [null, null]; this.prevHatchMs = null; this.prevCombo = null; this.plaquesStale = true; this.cameras.main.fadeIn(300) })
    // Keyboard access to the main action.
    // Space on a focused panel button belongs to that button, not the line.
    this.input.keyboard?.on('keydown-SPACE', () => { if (!this.settling && !document.activeElement?.closest('#ui')) this.hooks.onWaterClick() })
  }

  // Horizon, water, bank and figure spots for the place; rebuilt on travel.
  private buildPlace(id: LocationId): Place {
    for (const o of this.statics) o.destroy()
    const look = placeLook(id), maxDepth = LOCATIONS.find(l => l.id === id)!.maxDepth
    if (!this.textures.exists(`water:${id}`)) {
      const horizon = bakeHorizon(look, VIEW_W, WATER_Y, hashString(id))
      const clear = depthY(maxDepth, maxDepth) - WATER_Y + 8 // the bed stays below the deepest fish
      addBitmap(this, `horizon:${id}`, horizon)
      addBitmap(this, `water:${id}`, bakeSideWater(look, horizon, VIEW_W, VIEW_H - WATER_Y, clear, hashString(id)))
      addBitmap(this, `sidebank:${id}`, bakeSideBank(look, VIEW_H - GROUND_Y + BANK_SURFACE, WATER_Y - GROUND_Y + BANK_SURFACE, hashString(id)))
    }
    this.statics = [
      fineImage(this, 0, 0, `horizon:${id}`).setOrigin(0).setDepth(Z.horizon),
      fineImage(this, 0, WATER_Y, `water:${id}`).setOrigin(0).setDepth(Z.water),
      fineImage(this, 0, GROUND_Y - BANK_SURFACE, `sidebank:${id}`).setOrigin(0).setDepth(Z.bank),
    ]
    const rand = lcg(hashString(id) + 7)
    this.rippleDots = Array.from({ length: 34 }, () => ({ x0: rand() * VIEW_W, y: WATER_Y + Math.floor(rand() * 8), len: 2 + Math.floor(rand() * 5), speed: 6 + rand() * 10 }))
    // The player stands at the water's edge (or out on the dock), the helper a step behind.
    const { playerX, helperX, guideX } = figureSpots(look)
    const tipX = playerX - BODY_X + ROD_TIP.idle[0]
    return {
      id, look, maxDepth, waterLeft: look.shoreX - 10, playerX, helperX, guideX,
      playerFlyX: Math.min(VIEW_W - 40, tipX + 140), helperFlyX: tipX + 110, // far enough that its line clears the bank face at depth
    }
  }

  private buildSchool(s: GameState, place: Place): void {
    for (const f of this.fish) f.img.destroy()
    this.fish = []
    this.chosen = null
    const rand = lcg(hashString(s.location) + 13)
    const band = (VIEW_H - WATER_Y) / (place.maxDepth + 1)
    for (const sp of placeSpecies(s.location, s.licenseSpecies)) for (let k = 0; k < TIER_SCHOOL[sp.tier]; k++) {
      const against = rand() < 0.3
      this.addSwimmer(sp.id, rand() * VIEW_W, depthY(sp.depth, place.maxDepth) + (rand() - 0.5) * band * 0.5, (8 + rand() * 12) * (against ? -1 : 1), rand() * 6)
    }
  }

  // centerY: the swimmer's middle row; it lives until the next school rebuild.
  private addSwimmer(id: string, x0: number, centerY: number, speed: number, phase: number): Swimmer {
    const frames: [string, string] = [`fish-side:${id}:0`, `fish-side:${id}:1`]
    if (!this.textures.exists(frames[0])) {
      const [a, b] = fishSideBitmaps(id)
      addBitmap(this, frames[0], a); addBitmap(this, frames[1], b)
    }
    const src = this.textures.get(frames[0]).getSourceImage(), w = src.width / FINE, h = src.height / FINE
    const img = fineImage(this, 0, 0, frames[0]).setOrigin(0).setDepth(Z.fish).setFlipX(speed < 0)
    const sw = { img, id, frames, x0, y: centerY - h / 2, speed, phase, w }
    this.fish.push(sw)
    return sw
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
    return [landX, depthY(reachDepth(s, a.fly!), place.maxDepth)]
  }

  // The line from the rod tip to the angler's fly (its last point), or null while no line is out.
  private linePos(s: GameState, a: Angler, tr: Track, tip: Pt, backTip: Pt, landX: number, place: Place, t: number): Pt[] | null {
    const fly = this.flyPos(s, a, tr, tip, backTip, landX, place, t)
    return fly && (a.phase === 'waiting' && castLine(tr.castMs - a.timerMs, tip, [landX, WATER_Y], backTip) || [tip, fly])
  }

  // Where the angler's fly is, or null while no line is out.
  private flyPos(s: GameState, a: Angler, tr: Track, tip: Pt, backTip: Pt, landX: number, place: Place, t: number): Pt | null {
    if (a.phase === 'idle' || !a.fly) return null
    const flyY = depthY(reachDepth(s, a.fly), place.maxDepth)
    if (a.phase === 'bite') return [landX, flyY + Math.sin(t * 25) * 2] // the tug
    if (a.phase === 'reeling') {
      const k = 1 - a.timerMs / TIMING.reelMs
      return [lerp(landX, Math.max(tip[0], place.waterLeft + 6), k), lerp(flyY, WATER_Y + 2, k)]
    }
    const since = tr.castMs - a.timerMs
    if (since < CAST_MS) return castLine(since, tip, [landX, WATER_Y], backTip)!.at(-1)!
    if (since < CAST_MS + SINK_MS) return [landX, lerp(WATER_Y, flyY, (since - CAST_MS) / SINK_MS)]
    return [landX, flyY + Math.sin(t * 3.3) * 1.5] // bobbing
  }

  private pose(a: Angler | undefined, tr: Track): Pose {
    if (a?.phase === 'reeling') return 'reel'
    return (a?.phase === 'waiting' && castPose(tr.castMs - a.timerMs)) || 'idle'
  }

  // The cast's loop as a polyline; a settled line is straight, fainter below the surface. The tied fly sits on its end.
  private drawLine(g: Phaser.GameObjects.Graphics, pts: Pt[] | null, fly: Phaser.GameObjects.Image, patternId: string | undefined): void {
    fly.setVisible(!!pts)
    if (!pts) return
    g.lineStyle(1 / FINE, 0xf0f0f0, 0.8)
    const [tip, end] = [pts[0], pts[pts.length - 1]]
    if (pts.length > 2) for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
    else if (end[1] <= WATER_Y) g.lineBetween(tip[0], tip[1], end[0], end[1])
    else {
      const cross = lerp(tip[0], end[0], (WATER_Y - tip[1]) / (end[1] - tip[1]))
      g.lineBetween(tip[0], tip[1], cross, WATER_Y)
      g.lineStyle(1 / FINE, 0xf0f0f0, 0.45).lineBetween(cross, WATER_Y, end[0], end[1])
    }
    const id = patternId ?? 'basicDry', [ex, ey] = LINE_FLY_EYE[id] ?? LINE_FLY_EYE.basicDry
    fly.setTexture(this.lineFly(id)).setPosition(Math.round(end[0]) - ex, Math.round(end[1]) - ey)
  }

  // The player wears their gear; each rod and waders combination is baked on first use.
  private playerFig(rod: string, waders: string, pose: Pose): string {
    const key = (p: Pose) => `fig:angler:${rod}:${waders}:${p}`
    if (!this.textures.exists(key(pose))) {
      const bmps = figureBitmaps('angler', { rod, waders })
      for (const p of Object.keys(bmps) as Pose[]) addBitmap(this, key(p), bmps[p])
    }
    return key(pose)
  }

  // An unknown pattern (an old save) gets the Basic Dry's art under its own key.
  private lineFly(patternId: string): string {
    const key = `linefly:${patternId}`
    if (!this.textures.exists(key)) addBitmap(this, key, lineFlyBitmap(patternId))
    return key
  }

  // Top-left for a sprite whose `point` (in unflipped sprite pixels) should sit on `at`.
  private anchor(at: [number, number], point: [number, number], w: number, right: boolean): [number, number] {
    return [at[0] - (right ? point[0] : w - 1 - point[0]), at[1] - point[1]]
  }

  private release(t: number, offscreen: boolean): void {
    const c = this.chosen
    if (!c) return
    this.chosen = null
    if (c.sw.stray) { c.sw.img.destroy(); this.fish = this.fish.filter(f => f !== c.sw); return }
    const x = offscreen ? VIEW_W + WRAP - 1 : c.sw.img.x
    c.sw.x0 = x - t * c.sw.speed
    c.sw.img.setFlipX(c.sw.speed < 0)
  }

  update(time: number): void {
    this.settling = false
    // The HUD is pinned to the corners of whatever crop is showing.
    const w = this.scale.width / FINE
    this.cameras.main.setScroll(...viewScroll(w, this.scale.height / FINE, FISHING_KEEP, FISHING_ANCHOR))
    this.menuButton.x = w - 4
    this.placeText.x = this.comboText.x = this.comboName.x = w - 22
    const s = this.hooks.getState()
    const t = time / 1000
    if (this.place?.id !== s.location) { this.place = this.buildPlace(s.location); this.school = '' }
    const place = this.place
    if (this.school !== schoolKey(s)) { this.school = schoolKey(s); this.buildSchool(s, place) }

    this.ripples.clear().fillStyle(place.look.ripple)
    for (const r of this.rippleDots) this.ripples.fillRect(Math.floor(this.wrapX(r.x0 + t * r.speed, place)), r.y, r.len, 1 / FINE)

    for (const f of this.fish) {
      if (f === this.chosen?.sw) continue
      const [x, y] = this.schoolPos(f, t, place)
      f.img.setPosition(Math.round(x), Math.round(y)).setTexture(f.frames[Math.floor(t * 8 + f.phase) % 2]) // ≈4 Hz tail
    }

    const figY = GROUND_Y - FEET_Y
    const p = s.anglers[0], h = s.anglers[1]
    const ptr = trackCatch(this.tracks[0], p), htr = trackCatch(this.tracks[1], h)
    // An adopted save, Continue or New Season swaps the state: comparing across it would play phantom splashes.
    if (s !== this.cueState) { this.cues = [null, null]; this.prevHatchMs = null; this.prevCombo = null; this.plaquesStale = true; this.cueState = s }
    if (this.prevHatchMs !== null) for (const id of hatchCue(this.prevHatchMs, s.hatchMs)) this.hooks.play(id)
    this.prevHatchMs = s.hatchMs
    const pitch = this.prevCombo === null ? null : comboCue(this.prevCombo, s.combo.count)
    if (pitch !== null) this.hooks.play('combo', 1, pitch)
    this.prevCombo = s.combo.count
    this.drawPowerups(s, time, place, w)
    this.drawPlaque(s, time, w)
    const frames = [cueFrame(p, ptr), cueFrame(h, htr)] as const
    for (const id of anglerCues(this.cues[0], frames[0])) this.hooks.play(id)
    for (const id of anglerCues(this.cues[1], frames[1])) this.hooks.play(id, HELPER_GAIN)
    this.cues = [frames[0], frames[1]]
    this.g.clear()
    this.helperLine.clear()

    // Helper figure: one stands in for anglers[1]; the rest work out of sight. Its catches are never drawn.
    this.helper.setVisible(!!h)
    if (h) {
      const pose = this.pose(h, htr)
      const hx = place.helperX - BODY_X // sprite left; helperX is where the body starts
      this.helper.setTexture(`fig:helper:${pose}`).setPosition(hx, figY)
      const tip: [number, number] = [hx + ROD_TIP[pose][0], figY + ROD_TIP[pose][1]]
      const backTip: Pt = [hx + ROD_TIP.back[0], figY + ROD_TIP.back[1]]
      this.drawLine(this.helperLine, this.linePos(s, h, htr, tip, backTip, place.helperFlyX, place, t + 1.7), this.flies[1], h.fly?.patternId)
    } else this.flies[1].setVisible(false)

    this.guide.setVisible(s.guide).setPosition(place.guideX - BODY_X, figY)

    const pose = this.pose(p, ptr)
    const px = place.playerX - BODY_X
    this.player.setTexture(this.playerFig(s.rod, s.wearing, pose)).setPosition(px, figY)
    const tip: [number, number] = [px + ROD_TIP[pose][0], figY + ROD_TIP[pose][1]]
    const backTip: Pt = [px + ROD_TIP.back[0], figY + ROD_TIP.back[1]]
    const line = this.linePos(s, p, ptr, tip, backTip, place.playerFlyX, place, t), fly = line && line[line.length - 1]
    this.drawLine(this.g, line, this.flies[0], p.fly?.patternId)
    this.biteText.setVisible(p.phase === 'bite').setPosition(place.playerX + 7, figY + BODY_Y - 2)

    // The catch picked at cast swims (or drifts) to the fly, bites, and is reeled in.
    const pending = p.phase === 'idle' ? null : p.pending
    if (this.chosen && !sameCatch(this.chosen.pending, pending)) this.release(t, releaseOffscreen(this.chosen.lastPhase))
    if (pending?.kind === 'fish' && !this.chosen) {
      // A fish hooked at another place (travel during a bite) has no school here; it gets a sprite of its own.
      const sw = this.fish.find(f => f.id === pending.defId) ?? (p.phase !== 'waiting' && fly ? Object.assign(this.addSwimmer(pending.defId, fly[0], fly[1], -10, 0), { stray: true }) : undefined)
      if (sw) this.chosen = { sw, pending, from: null, right: sw.speed > 0, lastPhase: p.phase }
    }
    const aim = fly && approachTarget(p.phase, fly, this.restPos(s, p, place.playerFlyX, place))
    if (this.chosen && aim) this.moveChosen(this.chosen, p, ptr, aim, t, place)
    this.moveJunk(pending, p, ptr, aim)

    const helpers = s.anglers.length - 1
    this.helperText.setVisible(helpers > 0).setTexture(addText(this, `HELPERS: ${helpers}`, TEXT_WHITE))
    this.placeText.setTexture(addText(this, LOCATIONS.find(l => l.id === s.location)!.name.toUpperCase(), TEXT_WHITE))
    // The combo counter, under the place name while a streak of 2 or more runs.
    const streak = s.combo.count >= 2 && s.combo.defId !== null
    this.comboText.setVisible(streak).setY(this.placeText.y + this.placeText.height + 3)
    this.comboName.setVisible(streak).setY(this.comboText.y + this.comboText.height + 1)
    if (streak) {
      this.comboText.setTexture(addText(this, `×${s.combo.count}`, TEXT_YELLOW))
      this.comboName.setTexture(addText(this, SPECIES.find(d => d.id === s.combo.defId)!.name.toUpperCase(), TEXT_WHITE))
    }
  }

  // Waving titles pinned to the top of the crop (chum above hatch when both are on), and insects over the water in a hatch.
  private drawPowerups(s: GameState, time: number, place: Place, w: number): void {
    const titles = [[this.banners.chum, s.chumMs > 0], [this.banners.hatch, s.hatchMs > 0]] as const
    let y = 24
    for (const [letters, on] of titles) {
      const last = letters[letters.length - 1], x0 = Math.round((w - last.dx - last.img.width) / 2)
      letters.forEach((l, i) => l.img.setVisible(on).setPosition(x0 + l.dx, y + letterWave(i, time)))
      if (on) y += 20
    }
    const area = { x0: place.waterLeft, y0: WATER_Y - 34, x1: VIEW_W - 4, y1: WATER_Y - 4 }
    this.insects.forEach((img, i) => {
      img.setVisible(s.hatchMs > 0)
      if (s.hatchMs > 0) img.setPosition(...insectPos(i, time, area)).setTexture(`insect:${Math.floor(time / 83 + i) % 2}`) // ≈12 Hz wings
    })
  }

  // The pop-up for a new log entry or trophy, centred under the power-up titles.
  private drawPlaque(s: GameState, time: number, w: number): void {
    if (this.plaquesStale) { this.plaques = resumePlaques(this.plaques, s); this.plaquesStale = false }
    notePlaques(this.plaques!, s)
    const f = plaqueFrame(this.plaques!, time), { board, name, bonus } = this.plaque
    for (const img of [board, name, bonus]) img.setVisible(!!f)
    if (!f) return
    if (f.started) {
      const { kind, id } = f.popup, log = kind === 'log', key = `${log ? 'logcard' : 'plaque'}:${id}`
      if (!this.textures.exists(key)) addBitmap(this, key, log ? logCardBitmap(id) : plaqueBitmap(id))
      board.setTexture(key)
      const spName = SPECIES.find(d => d.id === id)!.name.toUpperCase()
      name.setTexture(addText(this, log ? `NEW SPECIES: ${spName}` : spName, PLAQUE_STYLE))
      bonus.setTexture(log ? addText(this, `+$${formatNumber(bountyOf(id))}`, BOUNTY_STYLE) : addText(this, `+${Math.round(TROPHY.pctEach * 100)}% SALES`, PLAQUE_STYLE))
      this.hooks.play(log ? 'logged' : 'trophy')
    }
    const y = 28 + 20 * [s.chumMs, s.hatchMs].filter(ms => ms > 0).length + f.dy, x = Math.round(w / 2)
    board.setPosition(x, Math.round(y)).setAlpha(f.alpha)
    name.setPosition(x, Math.round(y) + board.displayHeight + 2).setAlpha(f.alpha)
    bonus.setPosition(x, name.y + name.height + 2).setAlpha(f.alpha)
  }

  // The same-species swimmer nearest the fly, preferring ones inside the camera's view so the catch never swims in from off-screen.
  private nearest(id: string, fly: [number, number], t: number, place: Place): Swimmer | undefined {
    const view = this.cameras.main.worldView
    let best: Swimmer | undefined, bestD = Infinity
    for (const f of this.fish) {
      if (f.id !== id || f.stray) continue
      const [x, y] = this.schoolPos(f, t, place)
      const seen = x >= Math.max(view.x, place.waterLeft) && x + f.w <= view.right
      const d = Math.hypot(x + f.w / 2 - fly[0], y - fly[1]) + (seen ? 0 : 1e6)
      if (d < bestD) { best = f; bestD = d }
    }
    return best
  }

  private moveChosen(c: Chosen, p: Angler, tr: Track, fly: [number, number], t: number, place: Place): void {
    const a = p.phase === 'waiting' ? approach(p.timerMs, tr.waitMs) : { stage: 'swim' as const, k: 1 }
    // Cruising, the catch is just one of the school; which swimmer goes for the fly is settled when the approach starts.
    if (!c.from && a.stage !== 'cruise' && p.phase === 'waiting' && !c.sw.stray) c.sw = this.nearest(c.sw.id, fly, t, place) ?? c.sw
    const { sw } = c, mouth = fishMouth(sw.id)
    c.lastPhase = p.phase
    sw.img.setTexture(sw.frames[Math.floor(t * 8 + sw.phase) % 2])
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
