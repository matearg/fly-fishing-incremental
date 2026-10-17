import { BIG, SMALL, textMask } from './font'
import { blank, blit, scaleMask, stylize, type Bitmap, type TextStyle } from './pixels'

const WORD: TextStyle = { top: 0xffe45c, bottom: 0xff5a1f, outline: 0x2a0a3d, outlineW: 3, shadow: 0x000000 }
const TAG_TEXT: TextStyle = { top: 0xffffff, bottom: 0xffffff, outline: 0x2a0a3d, outlineW: 1 }
const TAG_BG = 0xd42a7a
const TAG_BORDER = 0x2a0a3d

// "FLY" huge over "FISHING", with an "INCREMENTAL" tag underneath (title mockup option B).
export function bakeLogo(): Bitmap {
  const fly = stylize(scaleMask(textMask('FLY', BIG, 2), 3), WORD)
  const fishing = stylize(scaleMask(textMask('FISHING', BIG, 2), 2), WORD)
  const text = stylize(textMask('INCREMENTAL', SMALL), TAG_TEXT)
  const tag = blank(text.w + 6, text.h + 4)
  for (let y = 0; y < tag.h; y++) for (let x = 0; x < tag.w; x++) {
    const edge = x === 0 || y === 0 || x === tag.w - 1 || y === tag.h - 1
    const c = edge ? TAG_BORDER : TAG_BG, i = (y * tag.w + x) * 4
    tag.data.set([c >> 16, (c >> 8) & 0xff, c & 0xff, 255], i)
  }
  blit(tag, text, 3, 2)

  const w = Math.max(fly.w, fishing.w, tag.w)
  const fishingY = fly.h - 4 // tuck slightly under FLY's shadow, arcade-style
  const tagY = fishingY + fishing.h + 1
  const out = blank(w, tagY + tag.h)
  const cx = (b: Bitmap) => Math.floor((w - b.w) / 2)
  blit(out, fishing, cx(fishing), fishingY)
  blit(out, fly, cx(fly), 0) // FLY on top
  blit(out, tag, cx(tag), tagY)
  return out
}
