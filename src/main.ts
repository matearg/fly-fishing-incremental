import Phaser from 'phaser'
import { FishingScene, VIEW_H, VIEW_W } from './scene/fishing/FishingScene'
import { TitleScene } from './scene/title/TitleScene'
import { castPlayer, reelPlayer, tick } from './game/fishing/sim'
import { localStore, SAVE_KEY } from './game/save'
import type { GameState } from './game/state'
import { Session } from './session'
import { mountPanel } from './ui/panel'
import './ui/style.css'

const session = new Session(localStore)

function act(fn: (s: GameState) => unknown): void {
  fn(session.state)
  panel.render()
}

const panel = mountPanel(document.getElementById('ui')!, () => session.state, act, s => { session.replace(s); panel.render() })
setInterval(() => panel.render(), 250)

// The title takes the whole window; panels show only in game. The canvas must re-fit either way.
function titleMode(on: boolean): void {
  document.body.classList.toggle('title-mode', on)
  game.scale.getParentBounds() // refresh() alone reuses the cached parent size
  game.scale.refresh()
}

const title = new TitleScene({
  session,
  enterGame: kind => {
    if (kind === 'new') session.startNewGame()
    else session.continueGame()
    titleMode(false)
    panel.render()
    game.scene.switch('title', 'fishing')
  },
  // Document fullscreen, not the canvas, so the side panel stays visible in game.
  toggleFullscreen: () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}),
  isFullscreen: () => !!document.fullscreenElement,
})

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    title,
    new FishingScene({
      getState: () => session.state,
      onWaterClick: () => act(s => castPlayer(s, Math.random) || reelPlayer(s)),
      onMenu: () => {
        session.toMenu()
        titleMode(true)
        game.scene.switch('fishing', 'title')
      },
    }),
  ],
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
    title.refreshMenu() // Continue may have appeared or gone
  }
})
// Adopt saves written by another tab (e.g. its final save when the player switches back here).
addEventListener('storage', e => {
  if (e.key !== SAVE_KEY) return
  session.adopt(e.newValue)
  panel.render()
  title.refreshMenu()
})
// The browser's own Esc/F11 can leave fullscreen too.
document.addEventListener('fullscreenchange', () => title.refreshMenu())
addEventListener('pagehide', () => { if (!document.hidden) session.save() })
setInterval(() => { if (!document.hidden) session.save() }, 5_000)
