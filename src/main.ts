import Phaser from 'phaser'
import { FishingScene, VIEW_H, VIEW_W } from './scene/FishingScene'
import { castPlayer, reelPlayer, tick } from './game/sim'
import { loadFromStorage, saveToStorage } from './game/save'
import type { GameState } from './game/state'
import './ui/style.css'

let state: GameState = loadFromStorage()

function act(fn: (s: GameState) => unknown): void {
  fn(state)
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: new FishingScene({
    getState: () => state,
    onWaterClick: () => act(s => castPlayer(s, Math.random) || reelPlayer(s)),
  }),
})

// Dev-only fast-forward: ?speed=20 runs 20 clamped sub-ticks per frame.
const speed = import.meta.env.DEV ? Math.max(1, Math.floor(Number(new URLSearchParams(location.search).get('speed') ?? 1)) || 1) : 1

let last: number | null = null
function frame(now: number): void {
  if (last !== null) for (let i = 0; i < speed; i++) tick(state, now - last, Math.random)
  last = now
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// No catch-up: pause while hidden and restart the clock on return.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveToStorage(state)
    last = null
  }
})
addEventListener('pagehide', () => saveToStorage(state))
setInterval(() => saveToStorage(state), 5_000)
