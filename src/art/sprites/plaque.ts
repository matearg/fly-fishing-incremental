// The Taxidermist's trophy: the species' side sprite mounted on a wooden shield.
import { blit, FINE, paint, type Bitmap, type Grid, type TextStyle } from '../pixels'
import { refine } from '../refine'
import { fishSideBitmaps } from './fish'

const W = 40, H = 24, TAPER = 6 // world units; the bottom TAPER rows narrow to a point
const OUTLINE = 0x2a1a0c

// o outline, w wood, W lit wood, d grain, b brass pins
function boardGrid(): Grid {
  return Array.from({ length: H }, (_, y) => {
    const inset = y === 0 ? 2 : y === 1 ? 1 : y >= H - TAPER ? Math.round(((y - (H - TAPER) + 1) / TAPER) * (W / 2 - 3)) : 0
    return [...Array(W).keys()].map(x => {
      if (x < inset || x >= W - inset) return '.'
      const edge = x === inset || x === W - inset - 1 || y === 0 || y === H - 1 || (y >= H - TAPER && (x === inset + 1 || x === W - inset - 2)) || (y === 1 && (x === 1 || x === W - 2))
      if (edge) return 'o'
      if ((x === 4 || x === W - 5) && y === 3) return 'b'
      if (y < 3 || x < inset + 3) return 'W'
      return (y + (x >> 3)) % 5 === 0 ? 'd' : 'w'
    }).join('')
  })
}

const BOARD = refine(paint(boardGrid(), { o: OUTLINE, w: 0x8a5a2e, W: 0xb07a40, d: 0x6a4222, b: 0xe0c060 }), OUTLINE)

export function plaqueBitmap(speciesId: string): Bitmap {
  const b = { w: BOARD.w, h: BOARD.h, data: BOARD.data.slice() }, fish = fishSideBitmaps(speciesId)[0]
  blit(b, fish, (b.w - fish.w) >> 1, ((H - TAPER / 2) * FINE - fish.h) >> 1)
  return b
}

export const PLAQUE_STYLE: TextStyle = { top: 0xfff0b0, bottom: 0xe0a83a, outline: 0x2a1a08, outlineW: 1, shadow: 0x000000 }
