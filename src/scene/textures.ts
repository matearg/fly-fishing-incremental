import Phaser from 'phaser'
import { SMALL, textMask } from '../art/font'
import { stylize, type Bitmap, type TextStyle } from '../art/pixels'

export const TEXT_WHITE: TextStyle = { top: 0xffffff, bottom: 0xffffff, outline: 0x000000, outlineW: 1 }
export const TEXT_YELLOW: TextStyle = { top: 0xffe45c, bottom: 0xffb02e, outline: 0x2a0a3d, outlineW: 1 }

export function addBitmap(scene: Phaser.Scene, key: string, bmp: Bitmap): void {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, bmp.w, bmp.h)!
  tex.putData(new ImageData(new Uint8ClampedArray(bmp.data), bmp.w, bmp.h), 0, 0).refresh()
}

/** Bakes `label` in the pixel font once per style and returns its texture key. */
export function addText(scene: Phaser.Scene, label: string, style: TextStyle): string {
  const key = `txt:${style.top.toString(16)}:${label}`
  if (!scene.textures.exists(key)) addBitmap(scene, key, stylize(textMask(label, SMALL), style))
  return key
}
