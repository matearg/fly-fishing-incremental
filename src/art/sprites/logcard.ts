// The species log's card: the species' side sprite on a tilted paper card with a punched hole.
import { blit, paint, type Bitmap, type Grid, type TextStyle } from '../pixels'
import { refine } from '../refine'
import { fishSideBitmaps } from './fish'

const W = 26, H = 17, SHEAR = 4 // world units; each SHEAR rows down shift the card a pixel left, which tilts it
const SLANT = Math.floor((H - 1) / SHEAR)
const OUTLINE = 0x3a2c1c

// o outline, p paper, P lit paper, l ruled line, r margin line, h punched hole
function cardGrid(): Grid {
  return Array.from({ length: H }, (_, y) => {
    const left = SLANT - Math.floor(y / SHEAR)
    return [...Array(W + SLANT).keys()].map(gx => {
      const x = gx - left
      if (x < 0 || x >= W) return '.'
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return 'o'
      if ((x === 3 || x === 4) && (y === 3 || y === 4)) return 'h'
      if (y === 1 || x === 1) return 'P'
      if (x === 7) return 'r'
      return y > 6 && y % 3 === 0 ? 'l' : 'p'
    }).join('')
  })
}

const CARD = refine(paint(cardGrid(), { o: OUTLINE, p: 0xe8dcbc, P: 0xfaf2da, l: 0xc4b48e, r: 0xd88a78, h: 0x5a4a36 }), OUTLINE)

export function logCardBitmap(speciesId: string): Bitmap {
  const b = { w: CARD.w, h: CARD.h, data: CARD.data.slice() }, fish = fishSideBitmaps(speciesId)[0]
  blit(b, fish, (b.w - fish.w) >> 1, (b.h - fish.h) >> 1)
  return b
}

export const BOUNTY_STYLE: TextStyle = { top: 0xc8f5a0, bottom: 0x5cb84a, outline: 0x10280a, outlineW: 1, shadow: 0x000000 }
