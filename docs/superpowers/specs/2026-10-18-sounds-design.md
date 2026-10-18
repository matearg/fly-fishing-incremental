# Sounds: design

Piece 6 of the visual overhaul, agreed with the user on 2026-10-18. Branch `feat/sounds`, cut from `develop` at `c2a5e77`, with piece 5 merged.

## Why

The game is silent. Casting, a bite, and a catch only register if you're looking. Sound makes the fishing loop feel alive, and it confirms clicks and purchases in the panel.

## Goals (the user's words, then the agreed details)

The user asked for three groups, in this order: **cast, reel in, catch** first, then **clicking on options**, then **buying things**. The sounds must **match the pixel style**, which means retro, chiptune-like synth sounds rather than recorded ones. The **water has sounds too**: the fly landing, the fly coming out, and a continuous moving-water sound.

### 1. Fishing sounds (agreed list; the user said "all ok")

| Moment | When it fires | Sound |
|---|---|---|
| Water ambience | the whole time the fishing scene is up | soft, continuous running water, low enough to sit in the background; a little different per place (babbling creek, calmer lakes) |
| Cast | the back cast and the forward cast (`castPose` turning `back`, then `cast`) | a short whoosh on each |
| Fly lands | at `CAST_MS`, when the fly touches the water | a small "plip" splash |
| Bite | `waiting → bite` | a quick splash/blip, so you notice it without looking |
| Reel in | the whole `reeling` phase (`TIMING.reelMs`, 800 ms) | a clicking reel ratchet, ticking throughout |
| Fly comes out | `reeling` ends and the catch lands | a splash as the fly (with the fish or junk) leaves the water |
| Catch | the same moment, after the splash | a short, happy chiptune jingle; bigger for rare and legendary fish |

**Helpers** make the same sounds, but quieter, so the player's stand out.

### 2. Clicking options (agreed)

- **Title menu:** a soft blip when the highlight moves to another item, a firmer "select" blip when you pick one, and a lower blip on Back.
- **Side panel buttons** (tie, recipe pickers, travel, basket open/close, trash, …): the same "select" blip.
- **Clicking a disabled button** (can't afford it): a short, low "nope" buzz.

### 3. Buying things (agreed)

- **Purchase:** a coin "cha-ching" for anything bought with money, meaning the panel actions `hire`, `unlockPattern`, `unlockMaterial`, `unlockLocation`, `licenseUpgrade`, and `licenseSpecies`.
- **Can't afford it:** the same "nope" buzz as above. Today these buttons are disabled when you can't pay.
- **Selling the catch (`sell`):** a lighter coin sound, since money is coming in.
- **New Season (`season`):** one bigger fanfare.

### 4. Sound setting (user's design, approved on the mockup)

- In the title **Settings** page, one new row between FULLSCREEN and BACK: **[speaker icon] [10-step bar] [percent]**, e.g. `🔈 ▮▮▮▮▮▮▮▯▯▯ 70%`. The user asked for a bar with a percentage that can also be toggled. The label is an **icon** in the pixel style, not text.
- **Speaker icon:** a speaker with two sound-wave arcs. Approved grid (11×9, from the mockup):
  ```
  ....#......
  ...##....#.
  #####..#..#
  #####...#.#
  #####...#.#
  #####...#.#
  #####..#..#
  ...##....#.
  ....#......
  ```
- **Muted:** a diagonal line, top-left to bottom-right, is drawn across the icon in the icon's color, with a 1 px background-colored edge just below it so it reads. The bar turns grey, and the percent becomes **OFF**. The volume is kept, so unmuting brings back the same level.
- **Controls:**
  - **Keyboard:** up/down moves between rows as today. Left/right changes the volume by 10%. Enter on the row toggles mute.
  - **Mouse:** clicking the icon toggles mute. Clicking a bar segment sets the volume to that step.
- The row is highlighted (yellow) like every other menu item.
- **Settings stays on the title only.** The user is fine leaving the game to change the volume, so the side panel gets no sound control.
- **Later, not now:** background music will get its **own row** of the same kind, with an icon of **two beamed eighth notes** (approved grid, 9×9, below). Its row is not built in this piece. Keep the row reusable enough that adding the music row later is a copy, not a rewrite.
  ```
  ...######
  ...######
  ...#....#
  ...#....#
  ...#....#
  .###..###
  ####.####
  ####.####
  .##...##.
  ```

## Non-goals

- No background music, and no music row yet.
- No sound files or downloaded packs. Every sound is generated in code.
- No change to rules, timing, or pacing. `src/game/` gets no audio code, and `pacing.test.ts` stays as it is.
- No volume control in the side panel or the fishing HUD.
- No separate volumes per sound group.

## Anti-goals (would be a failure even if it works)

- Sounds that get tiring. The ambience must stay soft, and repeated sounds (reel, blips) must stay short.
- A wall of noise once helpers multiply.
- Sound playing while the game is paused in a hidden tab.
- A volume setting that resets on reload, on New Game, or on New Season.

## Constraints

- Phaser 4.2.1, TypeScript, Vite, Vitest. `src/game/` stays pure, with no Phaser, DOM, or audio.
- All art is drawn in code (`src/art/`, pixel grids baked by `paint`). The two icons follow the same path, along with the slash and the styling the title text already uses (`stylize`, the `TEXT_WHITE`/`TEXT_YELLOW` look).
- **House rule:** new art goes through a user review stop on `/preview.html` before the build continues. The icons were already approved on the brainstorm mockup. Show them on `/preview.html` anyway, in on and muted versions, at the game's own scale and colors.
- Browsers block audio until the first user gesture. Audio must start on the first click or keypress (the title's "press start" is the natural one), with no error before that.
- The volume setting comes from `localStorage`, which is a trust boundary. A missing, corrupt, or out-of-range value falls back to the default and never throws.

## Calls I made (the user heard the first two; the rest are mine, flagged in the hand-off)

- **Synthesized in code with Web Audio**, chiptune style (square and triangle tones, a noise channel for water and whooshes). The user confirmed the pixel-matching retro style.
- Audio starts on the first user gesture.
- **Only the one visible helper makes sounds.** Helpers working out of sight stay silent, as they are invisible. This keeps the noise down as helpers multiply.
- **Junk** catches get a flat, dull "clunk" instead of the happy jingle.
- **Automatic actions are silent:** the bench tying on its own and the buyer auto-selling every 5 s make no sound. Only things the player does, plus fishing events, make sounds.
- **Water ambience on the title too,** quieter, since the title shows a river.
- **Pause:** all sound stops when the tab is hidden (the game pauses then too) and comes back on return.
- **Volume persistence:** stored under its own `localStorage` key, outside `GameState` and the save, so New Game, New Season, and save adoption from another tab never touch it. The default is 70%, unmuted.
- **One master volume:** the slider scales every sound effect. Ambience and effects share it.
- **Volume feedback:** changing the volume plays a short blip at the new level. Changing the volume while muted unmutes.
- **Volume floor:** the lowest bar step is 10%. Silence is what mute is for, so left at 10% stays at 10%.
- **Hover counts as a move:** on the title, hovering an item moves the highlight (`pointerover` in `TitleScene`), so it plays the same "move" blip as the arrow keys.
- **New Season takes two clicks:** the first opens the confirm prompt and plays the select blip; the second starts the season and plays the fanfare.
- **Junk the sorter throws away** still gets the splash and the clunk, since you still see it come out of the water.
- **Helper sound timing:** a helper's bite lasts a single tick, and reeling → land → next cast can happen within one or two ticks (`sim.ts`). So the helper's sounds come from its cast-timing record (`Track`) and from changes in its catch, not from comparing phases frame to frame, which would miss or bunch them.
- **Player bite blip** plays once per bite, with no repeat while it waits for your click.
- **Dev `?speed=20`:** sounds fire once per change seen between rendered frames, not once per sub-tick, so fast-forward can't flood the speakers.
- **Sound review stop:** `/preview.html` gets a sounds section with a button per sound (including each place's ambience and each tier's jingle). The user approves sounds there before they get wired into the scenes, the same way art is approved.

## Left to the builder

- **Synth recipes:** the exact waveforms, pitches, envelopes, and lengths. Iterate them at the sound review stop.
- **Code layout.** Suggestion: a pure module describing each sound as data (testable in Node), and a thin Web Audio player, mirroring `src/art/pixels.ts` + `src/scene/textures.ts`. Whether to use Phaser's sound manager or a plain `AudioContext` is your call. Phaser's `noAudio` may be the cleanest if you go plain.
- **How scenes trigger sounds.** `FishingScene` already tracks the player's `lastPhase` and cast timing (`Track`, `castPose`); transitions are the natural trigger. A pure "which sounds fire between these two frames" function is the testable seam. Panel sounds hook in where `act()` and the panel's click dispatch already live.
- **The "nope" on disabled buttons.** Disabled `<button>`s don't fire `click`. Catch it another way (e.g. `pointerdown` on the panel container, or switching to `aria-disabled`, keeping screen-reader semantics). If it can't be done cleanly, drop the buzz and say so. It's the least important sound.
- **Menu state.** `src/scene/title/menu.ts` needs `left`/`right` keys and the volume row, with tests in its existing style. `TitleScene` maps the arrow keys and the icon/bar clicks.
- **Roadmap:** add piece 6 to `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md` and keep it updated.
