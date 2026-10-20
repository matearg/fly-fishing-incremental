# Piece 4: New helpers (Taxidermist and Guide)

Part of the shop upgrades roadmap (`docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`), first piece of shop-upgrades v2. Agreed with the user on 2026-10-19.

## Why

Two late-ish hires that reward what the player already does. The Taxidermist turns a season's first legendary of each species into a moment: a plaque pops up, and every sale after that pays a little more. The Guide is the first thing that makes hired anglers *better* rather than just *more*: they find rarer fish. With the Guide, hired anglers land more legendaries, which feeds the Taxidermist, so the two hires pair up.

## Goals

1. **Taxidermist**: a one-off helper. Once hired, the first legendary of each species landed this season is mounted as a trophy. Each trophy adds a permanent +% to the sale value of every fish sold for the rest of the season, and trophies stack.
2. **A pop-up on each mount**: the fish on a plaque, on screen for a few seconds.
3. **Guide**: a one-off helper. Once hired, every hired angler's cast gets an extra odds bonus, so their catches lean toward rarer fish.
4. **The Guide stands on the bank** once hired: a new figure with a hat and a landing net.

## Non-goals

- **No trophies menu or trophy wall** (user's decision: "later we can work on some trophies menu"). The pop-up is the only trophy visual in this piece.
- **No retroactive trophies** (user's decision): legendaries landed before the Taxidermist is hired don't count.
- **The Guide doesn't fish and isn't animated** (user's decision): no rod, no line, no idle animation. It just stands there with its net.
- **The Guide doesn't touch the player's odds** (user's decision): it only helps hired anglers.
- Neither hire levels up (user's decision for the Guide; the Taxidermist was pitched as one-off). Both are bought once, like the Fish buyer.
- Nothing carries over New Season: both hires and all trophies reset with the rest of the season's state (`newGame(carry)` already does this for any field not in `Carry`).

## Anti-goals

- **A mount must never cost the player the fish.** The legendary still goes to the basket and sells as normal (user's decision: "money and bonus").
- **No phantom pop-ups.** Loading a save, Continue, New Season, or adopting a save from another tab must not show a pop-up for trophies that were already there.
- **The Guide must not cover the player, the helper or either line**, on any place.

## Taxidermist

### User's decisions

- One-off hire in the Helpers list.
- Mounts the first legendary **of each species** landed after hiring it, **by the player or by any hired angler**.
- The fish is kept and sold as normal; the trophy is on top.
- Each trophy adds a +% to **every fish sold** for the rest of the season, stacking per trophy.
- A cool pop-up with the fish on a plaque when it's mounted.

### My calls

- **Rules.** New state: `taxidermist: boolean` and `trophies: string[]` (species ids, mount order). In `sim.ts` `land()`, after the catch goes to the basket: if `state.taxidermist`, the catch is a fish, its species' tier is `legendary`, and its id is not in `trophies`, push it. The mount happens on landing, not on sale. The sorter only drops junk, so it never stops a mount.
- **Bonus.** `TROPHY = { pctEach: 0.1 }` in `data.ts` as a starting guess; the final number is set by pacing (below). It applies in `saleValue` in `economy.ts`, the one place the panel and every sale already go through: each fish is worth `value × (1 + releaseBonus if withBonus) × (1 + trophies.length × pctEach)`. Fish only, never junk, like the release bonus. It applies to the Fish buyer's sales too ("every fish you sell"). The release bonus math (`releaseBonusOf`) still uses the raw catch value.
- **Basket display** (my call). Basket rows keep showing the raw catch value. The Sell all total already comes from `saleValue`, so it includes the trophies. Next to the existing release "+X%" tag, a separate trophy tag (e.g. "Trophies +20%") shows while any trophy is mounted, so the player can see why the total is higher than the rows.
- **Max five trophies a season**: Limay King, Glacier Trout, Andes Tiger (license), El Cuero, Nahuelito (license). The count comes from `SPECIES` (legendary tier), not a hard-coded 5.
- **Panel row.** Label "Taxidermist". Description: "Mounts your first legendary of each species: +10% on every fish sold", with the % taken from `TROPHY`. Once owned it keeps the description (roadmap rule) and adds the count, e.g. "Trophies: 2 of 5", where 5 is the number of legendary species in `SPECIES`.
- **Pop-up.** Drawn in `FishingScene` (canvas, not the HTML panel), centred in the visible crop (the camera scrolls to fit the window, so it's placed against the crop like the power-up titles, not fixed world coordinates), below those titles: a wooden plaque (a shield-shaped board) with the species' side sprite mounted on it, the species name under it, and a small "+10% SALES" line. The plaque is world art: a grid run through `refine` and shown with `fineImage`, and the fish is the already-refined `fishSideBitmaps` frame. The two text lines are chunky text at scale 1 (`addText`), like the HUD and power-up titles. It slides or drops in, holds for about 4 s, then fades. It doesn't pause the game and isn't clickable. If two mounts land close together, the second waits for the first to finish (a queue in the scene). The scene finds new mounts by comparing `trophies.length` with the last frame it saw, and resets that memory when the state object changes, the same way it already handles `cueState` and `prevHatchMs`, and also on the scene's `wake` (where `cues` and `prevHatchMs` are already cleared). That rules out phantom pop-ups on load, Continue, New Season and adopted saves.
- **Sound.** A new synthesized `trophy` sound (a short fanfare) plays when the pop-up starts. It lives in `audio/sounds.ts` like the other sounds.
- **Art review stop.** The plaque, the pop-up layout (shown with every legendary), the Taxidermist's panel icon and the `trophy` sound go on `/preview.html` for the user's review before the scene and panel work.

## Guide

### User's decisions

- One-off hire in the Helpers list.
- Hired anglers land **rarer fish more often**. The player's own odds don't change.
- **On screen as a figure** like the anglers: wearing a **hat** and holding a **landing net**, no rod, **no animation**.
- It appears **as soon as it's bought**, whether or not any angler is hired.

### My calls

- **Rules.** New state: `guide: boolean`. `GUIDE = { oddsBonus: 0.3 }` in `data.ts` as a starting guess (about a mid-game material), with the final number set by pacing. In `rollCatch`, a hired angler's cast with the Guide hired uses `flyStats(...).oddsBonus + GUIDE.oddsBonus`. It stacks with the fly's own bonus the same way materials do, so legendaries gain the most. `sim.ts` already knows who's casting (`a.auto`), so it passes that through, the same way the chum flag goes in for the player only. Guided catches still roll through the normal `speciesWeight`, so depth and licenses limit them as usual.
- **Panel row.** Label "Guide". Description: "Your hired anglers find rarer fish: odds +30%", with the number taken from `GUIDE`. It keeps the description once owned.
- **Figure.** A new `FigureKind` `'guide'` in `art/sprites/figures.ts`, sharing `BODY` but with its own colours (shirt/vest and hat distinct from the red player and the blue helper) and its own single pose: a landing net (hoop and mesh on a short handle) in place of the rod. One bitmap, no pose changes. Like the other figures it's a grid run through `refine` (the rodless `poseGrid(pose, false)` body already exists), shown with `fineImage`, with anchors in grid units. The net can be part of the grid, or drawn fine after refining the way `figureBitmaps` now draws the rod; the builder picks, and the review stop judges. It draws just under the helper (`Z.helper - 0.1`), so if the net pokes forward it goes behind the helper's legs, not over them.
- **Where it stands.** Behind the helper spot, on the bank, facing the water. The side-view bank is narrow. With today's spacing (`playerX = shoreX - 34`, `helperX = playerX - 24`), the Guide's body (14 wide) at `helperX - 16` starts at `shoreX - 74`. That fits the Creek (76) and Big River (80) but sits 4 px off canvas on the River and Mountain Lake (70). The camera always shows world x 0 (`FISHING_KEEP` starts at 0, anchored left), so on-canvas is enough. My call: raise the River's and Mountain Lake's `shoreX` from 70 to 76 in `places.ts`. That redraws those two side banks (the slope and the prop slots both follow `shoreX`), so the review stop shows both banks redrawn, props included. If a tall prop (River poplars) ends up right behind the Guide and looks cluttered, nudging that place's prop list is fine. At the Great Lake the Guide stands on the dock behind the helper, on the same ground row, since the dock has room. The Guide stands where it is whether or not the helper figure is shown.
- **Lines over the Guide are fine** (my call). The player's and helper's back-casts sweep about 34 px behind their rods, through the Guide's spot. "Not covering the lines" means draw order: the Guide draws at `Z.helper`, below both lines (`Z.helper + 0.1` and `Z.line`), so a back-cast passes in front of it and is never hidden. The Guide's body must not overlap the helper's or the player's body.
- **Sound.** None of its own; hiring it plays the usual buy cue.
- **Art review stop.** The Guide figure at every place (with and without the helper, on the redrawn River and Mountain Lake banks), and its panel icon, go on `/preview.html` for the user's review before the scene work.

## Saves

- New fields `taxidermist`, `guide` (both `false`) and `trophies` (`[]`) get defaults in `newGame()`. `SAVE_VERSION` stays 1; `sanitize` fills them in for old saves.
- `sanitize` keeps only `trophies` ids that are legendary species in `SPECIES`, with duplicates dropped. A `trophies` that isn't an array loads as a fresh game, as the other array fields already do.

## Pacing

- The bot buys both hires through the same `buyHelper` options as the other one-off helpers (add `'taxidermist'` and `'guide'` to the list in `pacing.test.ts`).
- Starting prices: Taxidermist $25K (around when Big River, the first place with a legendary, opens at $12K), Guide $8K. Retune these, `TROPHY.pctEach` and `GUIDE.oddsBonus` until `pacing.test.ts` is green (season 1 within 30–60 sim-min, no >8 min purchase gap, no >10× income jump). Then record the results in the roadmap the same way earlier pieces did (season 1 length, max gap, worst jump, and how much the two hires move season 1).
- If the bonuses have to shrink a lot to keep pacing green, say so in the roadmap rather than silently making them meaningless.

## Tests

- Mount rule: only after hiring; only legendaries; once per species; counts for hired anglers' catches; the fish still goes to the basket.
- `saleValue` with trophies, with and without the release bonus; junk unaffected; the buyer's sale pays it.
- Guide: raises the odds for an auto angler's roll and leaves the player's roll unchanged (fixed `rand` sequences from `util/testutil.ts`).
- Saves: defaults in `newGame`, `sanitize` filters bad trophy ids, New Season clears all three fields.
- Art: the guide figure and the plaque bake without `paint` errors and keep the figure grid's anchors (`BODY_X`, `FEET_Y`) at `FINE`× size, in the style of `figures.test.ts`. A layout check that the Guide's body is fully on canvas and clear of the helper's body at every place, if the spot math is pulled into a pure function.
- Scene pop-up timing, if it has logic worth testing (queueing, the state-swap reset), goes in a pure module like `fishing/choreo.ts` with tests; the drawing itself has no harness.

## Left to the builder

- The exact plaque, net, vest and hat looks, and the pop-up's motion. All of it goes through the review stop.
- The `trophy` sound's notes.
- Final prices and bonus sizes, within the pacing rules above.
- How the `auto`/guide flag reaches `rollCatch` (a parameter, like `chum`, is the expected shape).
