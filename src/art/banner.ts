import { SMALL, textMask } from './font'
import { scaleMask, stylize, type Bitmap, type TextStyle } from './pixels'

// Power-up titles: one image per letter so the scene can wave each on its own.
export const CHUM_TEXT = 'CHUM FRENZY!'
export const HATCH_TEXT = 'HATCH! USE DRY FLIES'
export const CHUM_STYLE: TextStyle = { top: 0xffd27a, bottom: 0xe0401a, outline: 0x2a0a10, outlineW: 1, shadow: 0x000000 }
export const HATCH_STYLE: TextStyle = { top: 0xf4f070, bottom: 0x4cb84a, outline: 0x0e2a12, outlineW: 1, shadow: 0x000000 }

export function bannerLetters(text: string, style: TextStyle): (Bitmap | null)[] {
  return [...text].map(ch => ch === ' ' ? null : stylize(scaleMask(textMask(ch, SMALL), 2), style))
}
