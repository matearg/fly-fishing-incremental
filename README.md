# Fly Fishing Incremental

A browser incremental game about fly fishing. Cast, reel, sell your catch, tie better flies, and hire help until the river fishes itself. Then start a New Season and do it all faster.

Built with TypeScript, Phaser 4 and Vite. 2D pixel art, side view.

## How to play

- **Cast:** click the water (or press `Space`). Wait for a bite, then reel it in.
- **Sell:** catches go into the basket. **Sell all** sells everything, junk included (junk is worth nothing or less), so open a stack and trash the junk first.
- **Bonuses:** your first catch of each species pays a bounty, and a streak of the same species is worth more with each fish.
- **Tie flies:** the pattern sets how deep the fly sinks (dry = surface, nymph = mid-water, streamer = deep); deeper water holds rarer fish. Materials improve the odds, size, wear, or depth. Each fly wears out after a few catches.
- **Power-ups:** the chum bucket draws rare fish for a minute. Now and then a hatch comes on, and dry flies get quick bites.
- **Gear:** rods pay more for some tiers of fish; waders make the shop cheaper.
- **Automate:** hire anglers, a tying bench, a junk sorter, a fish buyer, and more: bulk trash, catch and release, a Taxidermist who mounts legendary trophies, and a Guide for your anglers.
- **Travel:** creek → river → big river → mountain lake → great lake, each with better fish. The species log tracks what you've caught.
- **New Season:** reset your run for Fishing Licenses, which buy permanent head starts and unlock new species.

Progress only happens while the game is open; there's no offline progress. The game autosaves to your browser's `localStorage`. `Esc` opens the menu. On a phone, play with it held sideways.

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
  game/    rules and balance, no Phaser: data tables, state, saving
    fishing/   casting, bites, catches, flies
    progress/  money, unlocks, helpers, New Season
    util/      random numbers, number formatting
  scene/   Phaser scenes
    fishing/   fishing scene and its animation timing
    title/     title screen, menu, river backdrop
  art/     pixel art drawn in code: pixel tools, font, logo, icons, place looks
    scenery/   procedural skylines, water, banks, props
    sprites/   anglers, fish, flies, insects, junk, plaques
  audio/   synthesized sounds and music, volume settings
  ui/      HTML/CSS side panel over the canvas
  main.ts     wires the loop, autosave, audio, and layout together
  session.ts  which screen is up, and when a game is saved
  layout.ts   desktop or phone (sideways/upright) layout
  preview.ts  dev-only art and sound review page (/preview.html)
docs/      the game's design spec
```

Balance numbers live in `src/game/data.ts`.
