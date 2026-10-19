# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Browser incremental fly-fishing game. TypeScript, Phaser 4, Vite, Vitest. Node 22.12+.

## Commands

```sh
npm run dev                            # http://localhost:5173 ; /preview.html = dev-only art review page
npm test                               # vitest run (all tests)
npx vitest run src/game/fishing/sim.test.ts    # one file
npx vitest run -t "pacing bot"         # by test name
PACING_LOG=1 npx vitest run src/game/pacing.test.ts   # print the bot's purchase/earnings timeline
npm run build                          # tsc --noEmit + vite build to dist/ (there is no separate lint step)
```

Dev URL flag: `?speed=20` runs 20 clamped sub-ticks per frame (DEV builds only).

Branches: work happens on `develop`; pushing `master` runs tests + build and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`).

## Architecture

**`src/game/` is pure rules, no Phaser or DOM.** Everything here is unit-tested in Node (there's no `@types/node`; tests declare `process` themselves when needed).
- `GameState` (`state.ts`) is one plain mutable JSON object; `anglers[0]` is the player (`auto: false`), the rest are hired helpers. Functions take `(state, ...)` and mutate it, returning `boolean` for "did it happen" (e.g. `spend`, `unlockPattern`, `castPlayer`).
- `fishing/sim.ts` `tick(state, dtMs, rand)` drives each angler through `idle → waiting → bite → reeling`, plus the bench (fly tying) and buyer timers. `dt` is clamped to `TIMING.maxTickMs`; there is deliberately **no offline/catch-up progress**.
- The catch is picked at cast time and stored in `angler.pending` (tagged with its location; travel re-picks it). The scene relies on this to animate the right fish swimming to the fly.
- All randomness is injected as `rand: () => number`. Tests use `seqRand`/`lcg` from `util/testutil.ts`; art uses `lcg(hashString(id))` for stable layouts.
- Balance numbers live in `data.ts`. `pacing.test.ts` runs a headless bot over the real rules and asserts season length (30–60 sim-min), no >8 min purchase gaps, no >10× income jumps. Rebalancing must keep it green.
- Saves (`save.ts`): `parseSave` rejects anything with the wrong `SAVE_VERSION` or shape; `sanitize` fills new fields from `newGame()` and drops ids no longer in `data.ts`, so renaming/removing content never bricks a save. New `GameState` fields need a default in `newGame()`.
- Prestige ("New Season", `progress/prestige.ts`) rebuilds state with `newGame(carry)`; only `licenses`, `licenseLevels`, `licenseSpecies` carry over. `progress/license.ts` turns levels into effects.

**`src/session.ts`** owns which screen is up (`title` | `game`) and the rule that only a game in progress is ever written to storage. `main.ts` wires everything: the rAF loop calls `tick` only in game mode, autosaves every 5 s and on hide/pagehide/menu, and adopts saves written by other tabs (`storage` + `visibilitychange`).

**`src/scene/`** Phaser scenes read state through hooks (`getState`, `onWaterClick`, …) and never own game rules. Logic worth testing is pulled out into pure modules: `title/menu.ts` (title menu state machine) and `fishing/choreo.ts` (fishing animation timing). `FishingScene`/`TitleScene` themselves have no unit-test harness.

**`src/art/`** All art is drawn in code, no asset files: pixel grids (`string[]` + palette, `'.'` = transparent) baked to RGBA `Bitmap`s by pure functions in `pixels.ts` (`paint` throws on ragged rows or missing palette chars), then uploaded via `addBitmap` (`src/scene/textures.ts`). Fish are a few base shapes recolored per species; each place has its own palette/look (`PLACE_LOOKS`). Canvas is 480×270 with `pixelArt: true`. New art goes through a user review stop (show it on `/preview.html`) before continuing.

**`src/audio/`** Sounds are synthesized, no files. Pure, Node-tested modules hold the data and decisions: `sounds.ts` (each sound as notes, per-place water ambience), `cues.ts` (which sounds fire between two rendered frames, and per panel action), `music.ts` (each place's tune as phrase strings, plus the picker that varies the order so it never loops audibly), `settings.ts` (the sound and music volumes, stored under `flyfishing-sound` and `flyfishing-music`, outside the save). `player.ts` is the only Web Audio code; `main.ts` owns it and passes `play` hooks to the scenes and panel. Phaser's own audio is off. New sounds go through the same review stop on `/preview.html` as art.

**`src/ui/panel.ts`** is the HTML side panel over the canvas, re-rendered every 250 ms and after every action. It builds HTML strings and `patch`/`morph`s them into the DOM in place so a button under the cursor is never replaced mid-click; buttons dispatch via `data-action`/`data-id`.

## Docs and workflow

Design specs and plans live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md` tracks the current work (new shop items, helpers and bonuses): progress, decisions already made with the user, and deferred minors. Read it before starting a new piece, and update it as pieces land. `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md` tracks the visual overhaul: pieces 1–7 are done, and piece 8 (detailed places) is still open there.
