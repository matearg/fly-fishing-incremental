import { SPECIES } from '../game/data'
import { iconBitmap, type Icon } from '../art/icons'
import type { Bitmap } from '../art/pixels'
import { fishSideBitmaps } from '../art/sprites/fish'
import { JUNK_ART, junkBitmap } from '../art/sprites/junk'

// Bitmaps become data URLs once, so the panel's HTML strings can carry <img> tags through patch/morph.
const urls = new Map<string, { src: string; w: number; h: number }>()

export function img(key: string, make: () => Bitmap, scale = 2): string {
  let u = urls.get(key)
  if (!u) {
    const b = make(), c = document.createElement('canvas')
    c.width = b.w; c.height = b.h
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(b.data), b.w, b.h), 0, 0)
    u = { src: c.toDataURL(), w: b.w, h: b.h }
    urls.set(key, u)
  }
  return `<img class="ico" src="${u.src}" alt="" width="${u.w * scale}" height="${u.h * scale}">`
}

export const icon = (set: string, id: string, i: Icon, scale = 2) => img(`${set}:${id}`, () => iconBitmap(i), scale)

// An id from an old save with no art renders without an image instead of throwing.
export function catchImg(kind: 'fish' | 'junk', defId: string): string {
  if (kind === 'fish') return SPECIES.some(s => s.id === defId) ? img(`fish:${defId}`, () => fishSideBitmaps(defId)[0], 1) : ''
  return defId in JUNK_ART ? img(`junk:${defId}`, () => junkBitmap(defId), 1) : ''
}
