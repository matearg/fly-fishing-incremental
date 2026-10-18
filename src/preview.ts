// Dev-only art review page: draws baked bitmaps at 2× so the user can approve them.
import { LOCATIONS } from './game/data'
import { hashString } from './game/rand'
import { BANK_SURFACE, bakeBank, bakeHorizon, bakeSideBank, placeLook } from './art/places'
import { blank, blit, mix, paint, type Bitmap } from './art/pixels'

const W = 480, H = 270, SCALE = 2
const HORIZON_H = 110 // waterline of the side view
const BANK_ABOVE_WATER = 8

const out = document.getElementById('out')!

function show(row: HTMLElement, b: Bitmap, caption: string): void {
  const c = document.createElement('canvas')
  c.width = b.w; c.height = b.h
  c.style.width = `${b.w * SCALE}px`; c.style.height = `${b.h * SCALE}px`
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

export { section, show, sideView, HORIZON_H, BANK_ABOVE_WATER }
