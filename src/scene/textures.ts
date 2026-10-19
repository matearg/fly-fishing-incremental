import Phaser from 'phaser'
import { SMALL, textMask } from '../art/font'
import { FINE, stylize, type Bitmap, type TextStyle } from '../art/pixels'

export const TEXT_WHITE: TextStyle = { top: 0xffffff, bottom: 0xffffff, outline: 0x000000, outlineW: 1 }
export const TEXT_YELLOW: TextStyle = { top: 0xffe45c, bottom: 0xffb02e, outline: 0x2a0a3d, outlineW: 1 }
export const TEXT_GREY: TextStyle = { top: 0x5a6a78, bottom: 0x4a5866, outline: 0x000000, outlineW: 1 }

export function addBitmap(scene: Phaser.Scene, key: string, bmp: Bitmap): void {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, bmp.w, bmp.h)!
  tex.putData(new ImageData(new Uint8ClampedArray(bmp.data), bmp.w, bmp.h), 0, 0).refresh()
}

// World art is baked at FINE× and shown at 1/FINE, so one world unit holds FINE art pixels.
export function fineImage(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setScale(1 / FINE)
}

/** Bakes `label` in the pixel font once per style and returns its texture key. */
export function addText(scene: Phaser.Scene, label: string, style: TextStyle): string {
  const key = `txt:${style.top.toString(16)}:${label}`
  if (!scene.textures.exists(key)) addBitmap(scene, key, stylize(textMask(label, SMALL), style))
  return key
}
