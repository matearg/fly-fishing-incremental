import Phaser from 'phaser'
import type { Bitmap } from '../art/pixels'

export function addBitmap(scene: Phaser.Scene, key: string, bmp: Bitmap): void {
  if (scene.textures.exists(key)) return
  const tex = scene.textures.createCanvas(key, bmp.w, bmp.h)!
  tex.putData(new ImageData(new Uint8ClampedArray(bmp.data), bmp.w, bmp.h), 0, 0).refresh()
}
