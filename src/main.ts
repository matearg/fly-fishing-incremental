import Phaser from 'phaser'
import { FishingScene, VIEW_H, VIEW_W } from './scene/FishingScene'
import { castPlayer, reelPlayer, tick } from './game/sim'
import { localStore, SAVE_KEY } from './game/save'
import type { GameState } from './game/state'
import { Session } from './session'
import { mountPanel } from './ui/panel'
import './ui/style.css'

const session = new Session(localStore)
session.continueGame()

function act(fn: (s: GameState) => unknown): void {
  fn(session.state)
  panel.render()
}

const panel = mountPanel(document.getElementById('ui')!, () => session.state, act, s => { session.replace(s); panel.render() })
setInterval(() => panel.render(), 250)

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: new FishingScene({
    getState: () => session.state,
    onWaterClick: () => act(s => castPlayer(s, Math.random) || reelPlayer(s)),
  }),
})

// Dev-only fast-forward: ?speed=20 runs 20 clamped sub-ticks per frame.
const speed = import.meta.env.DEV ? Math.max(1, Math.floor(Number(new URLSearchParams(location.search).get('speed') ?? 1)) || 1) : 1

let last: number | null = null
function frame(now: number): void {
  // Paused off the game; restarting the clock on return means no catch-up.
  if (session.mode !== 'game') last = null
  else {
    if (last !== null) for (let i = 0; i < speed; i++) tick(session.state, now - last, Math.random)
    last = now
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// No catch-up: pause while hidden and restart the clock on return.
// A hidden tab's state never changes, so it never autosaves; on return it reloads the save,
// which another tab may have advanced meanwhile.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    session.save()
    last = null
  } else {
    session.adopt(localStore.read())
    panel.render()
  }
})
// Adopt saves written by another tab (e.g. its final save when the player switches back here).
addEventListener('storage', e => {
  if (e.key !== SAVE_KEY) return
  session.adopt(e.newValue)
  panel.render()
})
addEventListener('pagehide', () => { if (!document.hidden) session.save() })
setInterval(() => { if (!document.hidden) session.save() }, 5_000)
