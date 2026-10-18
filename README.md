# Fly Fishing Incremental

A browser incremental game about fly fishing. Cast, reel, sell your catch, tie better flies, and hire help until the river fishes itself. Then start a New Season and do it all faster.

Built with TypeScript, Phaser 4 and Vite. 2D pixel art, side view.

## How to play

- **Cast:** click the water (or press `Space`). Wait for a bite, then reel it in.
- **Sell:** catches go into the basket. **Sell all** sells everything, junk included (junk is worth nothing or less), so drag junk to the trash first.
- **Tie flies:** the pattern sets how deep the fly sinks (dry = surface, nymph = mid-water, streamer = deep); deeper water holds rarer fish. Materials improve the odds, size, wear, or depth. Each fly wears out after a few catches.
- **Automate:** hire anglers, a tying bench, a junk sorter, and a fish buyer.
- **Travel:** creek → river → big river → mountain lake → great lake, each with better fish.
- **New Season:** reset your run for Fishing Licenses, which buy permanent head starts and unlock new species.

Progress only happens while the game is open; there's no offline progress. The game autosaves to your browser's `localStorage`. `Esc` opens the menu.

## Running locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # type-check and build to dist/
```

`dist/` uses relative paths, so it can be served from any static host or subfolder.

## Project layout

```
src/
  game/    rules and balance: data tables, economy, catches, flies, helpers, prestige, saving (no Phaser)
  scene/   Phaser scenes: title screen, menu, fishing scene, river backdrop
  art/     pixel art drawn in code: fish, logo, font, place looks
  ui/      HTML/CSS side panel over the canvas
  session.ts  ties the game state, saving, and scenes together
docs/      design specs and the roadmap
```

Balance numbers live in `src/game/data.ts`.
