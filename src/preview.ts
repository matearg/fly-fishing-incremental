// Dev-only art review page: draws baked bitmaps at 2× so the user can approve them.
import { JUNK, LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, SPECIES } from './game/data'
import { hashString } from './game/util/rand'
import { FLY_ICONS, HELPER_ICONS, LICENSE_ICONS, MATERIAL_ICONS, PLACE_ICONS, UI_ICONS, iconBitmap, type Icon } from './art/icons'
import { BANK_SURFACE, bakeBank, bakeHorizon, bakeSideBank, placeLook } from './art/places'
import { blank, blit, mix, paint, type Bitmap } from './art/pixels'
import { FEET_Y, figureBitmaps, type FigureKind, type Pose } from './art/sprites/figures'
import { fishBitmaps, fishSideBitmaps } from './art/sprites/fish'
import { junkBitmap } from './art/sprites/junk'

const W = 480, H = 270, SCALE = 2
const HORIZON_H = 110 // waterline of the side view
const BANK_ABOVE_WATER = 8

const out = document.getElementById('out')!

function show(row: HTMLElement, b: Bitmap, caption: string, scale = SCALE): void {
  const c = document.createElement('canvas')
  c.width = b.w; c.height = b.h
  c.style.width = `${b.w * scale}px`; c.style.height = `${b.h * scale}px`
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(b.data), b.w, b.h), 0, 0)
  const f = document.createElement('figure')
  f.append(c, Object.assign(document.createElement('figcaption'), { textContent: caption }))
  row.append(f)
}

function section(title: string): HTMLElement {
  out.append(Object.assign(document.createElement('h2'), { textContent: title }))
  const row = Object.assign(document.createElement('div'), { className: 'row' })
  out.append(row)
  return row
}

const fillRect = (b: Bitmap, x0: number, y0: number, w: number, h: number, c: number) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) b.data.set([c >> 16, (c >> 8) & 0xff, c & 0xff, 255], (y * b.w + x) * 4)
}

function topDown(id: (typeof LOCATIONS)[number]['id']): Bitmap {
  const look = placeLook(id), rand = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(hashString(id) % 2147483646 + 1)
  const b = blank(W, H)
  const top = Math.round((H - look.riverH) / 2), bottom = top + look.riverH
  const n = look.water.length, half = look.riverH / 2
  look.water.forEach((c, i) => {
    const h = Math.ceil(half / n), off = Math.floor((half / n) * i)
    fillRect(b, 0, top + off, W, h, c); fillRect(b, 0, bottom - off - h, W, h, c)
  })
  const drift = paint(look.drift.grid, look.drift.palette)
  for (let i = 0; i < look.drift.perBank; i++) blit(b, drift, Math.floor(rand() * W), top + 10 + Math.floor(rand() * (look.riverH - 20)))
  blit(b, bakeBank(look, W, top, 'bottom', 11), 0, 0)
  blit(b, bakeBank(look, W, H - bottom, 'top', 23), 0, bottom)
  return b
}

function sideView(id: (typeof LOCATIONS)[number]['id']): Bitmap {
  const look = placeLook(id)
  const b = blank(W, H)
  blit(b, bakeHorizon(look, W, HORIZON_H, hashString(id)), 0, 0)
  for (let y = HORIZON_H; y < H; y++) fillRect(b, 0, y, W, 1, mix(look.water[0], look.deep, (y - HORIZON_H) / (H - HORIZON_H)))
  for (let x = 0; x < W; x += 9) fillRect(b, x + (x % 4), HORIZON_H, 3, 1, look.ripple)
  const surface = HORIZON_H - BANK_ABOVE_WATER
  blit(b, bakeSideBank(look, H - surface + BANK_SURFACE, hashString(id)), 0, surface - BANK_SURFACE)
  return b
}

const places = section('Places — title (top-down) and fishing scene (side view)')
for (const loc of LOCATIONS) {
  show(places, topDown(loc.id), `${loc.name} · title`)
  show(places, sideView(loc.id), `${loc.name} · fishing`)
}

const POSES: Pose[] = ['idle', 'cast', 'reel']
const KINDS: FigureKind[] = ['angler', 'helper']
const sprites = section('Figures — angler and helper, idle / cast / reel (4×)')
for (const k of KINDS) for (const p of POSES) show(sprites, figureBitmaps(k)[p], `${k} · ${p}`, 4)

// Each place's fishing view with the two figures on the bank (on the dock at the Great Lake), one pose per place.
const onBank = section('Figures on each bank')
LOCATIONS.forEach((loc, i) => {
  const look = placeLook(loc.id), b = sideView(loc.id), pose = POSES[i % POSES.length]
  // Player at the water's edge (end of the flat ground, or near the end of the dock), helper a step behind.
  const player = look.dock ? look.shoreX + 70 : look.shoreX - 34, feet = HORIZON_H - BANK_ABOVE_WATER
  blit(b, figureBitmaps('helper')[pose], player - 24, feet - FEET_Y)
  blit(b, figureBitmaps('angler')[pose], player, feet - FEET_Y)
  show(onBank, b, `${loc.name} · ${pose}`)
})

// Fish: side view (both tail frames) and the title's top-down view, grouped by place, on that place's water.
for (const loc of LOCATIONS) {
  const row = section(`Fish — ${loc.name} (4×: side frame 0, side frame 1, top-down)`)
  const water = placeLook(loc.id).water[1]
  for (const sp of SPECIES.filter(s => s.location === loc.id)) {
    const [a, b] = fishSideBitmaps(sp.id), [top] = fishBitmaps(sp.id)
    const card = blank(a.w * 2 + top.w + 8, Math.max(a.h, top.h) + 4)
    fillRect(card, 0, 0, card.w, card.h, water)
    blit(card, a, 2, 2); blit(card, b, a.w + 4, 2); blit(card, top, a.w * 2 + 6, 2)
    show(row, card, `${sp.name} (${sp.tier})`, 4)
  }
}

const junk = section('Junk (4×)')
for (const j of JUNK) {
  const b = junkBitmap(j.id), card = blank(b.w + 4, b.h + 4)
  fillRect(card, 0, 0, card.w, card.h, placeLook('river').water[1])
  blit(card, b, 2, 2)
  show(junk, card, j.name, 4)
}

// Panel icons on the journal paper, at 3×.
const icons = section('Panel icons (on paper, 3×)')
const onPaper = (i: Icon, caption: string) => {
  show(icons, iconBitmap(i), caption, 3)
  ;(icons.lastElementChild!.firstElementChild as HTMLCanvasElement).style.background = '#e8d8b0'
}
for (const p of PATTERNS) onPaper(FLY_ICONS[p.id], p.name)
for (const m of MATERIALS) onPaper(MATERIAL_ICONS[m.id], m.name)
for (const l of LOCATIONS) onPaper(PLACE_ICONS[l.id], l.name)
for (const [k, i] of Object.entries(HELPER_ICONS)) onPaper(i, `helper · ${k}`)
for (const u of LICENSE_UPGRADES) onPaper(LICENSE_ICONS[u.id], u.name)
for (const [k, i] of Object.entries(UI_ICONS)) onPaper(i, `ui · ${k}`)
