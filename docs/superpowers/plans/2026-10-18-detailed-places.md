# Detailed Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the whole world at half-size pixels, and give every place realistic skylines, water, ground, bank cuts and props, in both the fishing scene and the title backdrop.

**Architecture:** The 480×270 world and all its coordinates stay. The canvas renders at `FINE = 2` times the resolution, with the camera zoomed ×`FINE` from its top-left. Art is baked at `FINE`× resolution and displayed at `1/FINE` scale. Chunky text stays at scale 1. Sprites become fine through one shared filter, `refine`: upscale, thin outline, rim shading. Scenery is drawn by new procedural generators in `src/art/scenery/`, built on seeded value noise and Bayer-dithered colour ramps.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest (Node, no DOM in `src/art/`).

**Spec:** `docs/superpowers/specs/2026-10-18-detailed-places-design.md`. The visual reference is option C of the mockup, `.superpowers/brainstorm/87152-1792371879/content/pixel-size-v2.html`. Copy its noise, ramp and shading ideas, with rounder mountains.

## Global Constraints

- `FINE = 2` art pixels per world unit. World constants (`VIEW_W` 480, `VIEW_H` 270, `WATER_Y` 110, `GROUND_Y` 102, `shoreX`, figure spots, fly landing spots, depth bands, `FISHING_KEEP`, `TITLE_KEEP`) do not change.
- Sprite anchor constants (`BODY_X`, `BODY_Y`, `FEET_Y`, `ROD_TIP`, `fishMouth`, `LINE_FLY_EYE`, `JUNK_SNAG`) stay in grid units, which equal world units. Fine bitmaps are exactly `FINE`× their grid.
- Logo, menu text, HUD text and menu button stay chunky (scale 1, today's font).
- `src/game/` is untouched. `npm test` (including `pacing.test.ts`) and `npm run build` stay green after every task.
- All art is drawn in code, with no asset files. It is deterministic: seeded from `hashString(placeId)` or the passed seed, never `Math.random`.
- `src/art/` stays pure (no Phaser, no DOM).
- Each place keeps its own palette and character. Grounds: Creek `steppe`, River `cobbles`, Big River `mud`, Mountain Lake `turf`, Great Lake `beach` (+ dock).
- Mountains: rounder than the mockup. No needle spikes.
- New art stops for the user's review on `/preview.html` (and in game) at the end of Tasks 2, 3, 4 and 5. Do not start the next task before approval.
- Commits: one short imperative line (<72 chars), no trailers, no `--amend` (user rule, see the `mateo-commit` skill).

## Review Focus

1. **Input under camera zoom.** Clicking water casts. Clicking the menu button opens the menu and does not cast. Esc and Space still work. Checked in Task 1, step 4.
2. **Window sizes.** No seams or 1-px gaps between the horizon, water and bank images, and no blurry or jittering sprites at half-unit positions. Bars appear only at clamped sizes. Check at 1280×720, 1280×1000 (10 px bars top and bottom expected), 2560×900 (side bars expected) and 800×900. Checked in Task 1, step 4 and Task 4, step 6.
3. **Fish visible at the deepest band.** Over the bed and weeds at Mountain Lake and Great Lake, with the darkest species. Test `bedTop never rises above clear` in Task 3, plus a browser check.
4. **No hitch when travelling.** Baking a place's fine side view (horizon + water + bank) takes under 150 ms in the browser. `preview.ts` logs per-place bake times. Checked in Task 4, step 6.
5. **Basket images.** At half scale on a devicePixelRatio 1 screen, the fish and junk in the basket must not look muddy. Check in Task 2, step 9, and report it at review stop A.

---

### Task 1: Render at FINE resolution

**Files:**
- Modify: `src/art/pixels.ts` (add `FINE`)
- Modify: `src/main.ts:42-52` (`fit`), `src/main.ts:83-90` (game config size)
- Modify: `src/scene/fishing/FishingScene.ts` (`create`, `update`, `drawLine`)
- Modify: `src/scene/title/TitleScene.ts:74` and its `create`
- Modify: `src/scene/title/RiverBackdrop.ts` (`update` ripples)

**Interfaces:**
- Produces: `export const FINE = 2` in `src/art/pixels.ts`. Scenes read the visible world size as `this.scale.width / FINE` and `this.scale.height / FINE`.

- [ ] **Step 1:** Add `export const FINE = 2 // art pixels per world unit` to `src/art/pixels.ts`.
- [ ] **Step 2:** In `main.ts`, the config is `width: VIEW_W * FINE, height: VIEW_H * FINE`, and `fit()` calls `game.scale.setGameSize(w * FINE, h * FINE)`. `viewSize` stays in world units.
- [ ] **Step 3:** In both scenes' `create`, call `this.cameras.main.setOrigin(0).setZoom(FINE)`. Every `this.scale.width` and `this.scale.height` passed to `viewScroll`, or used to pin the HUD, becomes `/ FINE`. In `FishingScene.drawLine`, both `lineStyle(1, …)` become `lineStyle(1 / FINE, …)`. The ripple `fillRect(…, 1)` in `FishingScene.update` and `RiverBackdrop.update` gets height `1 / FINE`.
- [ ] **Step 4: Verify in the browser** (`npm run dev`, the `mateo-test` skill). The title and fishing look as before, except the line and ripples are thinner and the text is still chunky. Check Review Focus 1 and 2 at the four window sizes: same crop as before, and bars only at 1280×1000 and 2560×900. If half-unit positions blur, set `roundPixels: true` in the game config.
- [ ] **Step 5:** Run `npm test && npm run build`. Expected: all pass.
- [ ] **Step 6: Commit:** `git add -A src && git commit -m "render the world at twice the resolution"`

---

### Task 2: Fine sprites (figures, fish, flies, junk) — review stop A

**Files:**
- Modify: `src/art/pixels.ts` (add `upscale`), `src/art/pixels.test.ts`
- Create: `src/art/refine.ts`, `src/art/refine.test.ts`
- Modify: `src/art/sprites/figures.ts`, `fish.ts`, `flies.ts`, `junk.ts` and their tests
- Modify: `src/scene/textures.ts` (add `fineImage`)
- Modify: `src/scene/fishing/FishingScene.ts`, `src/scene/title/RiverBackdrop.ts`, `src/ui/icons.ts:26-27`, `src/preview.ts`

**Interfaces:**
- Consumes: `FINE` (Task 1).
- Produces:
  - `upscale(b: Bitmap, k: number): Bitmap`: nearest-neighbour.
  - `refine(b: Bitmap, outline?: number): Bitmap`: `FINE`× size, alpha identical per source pixel.
  - `fineImage(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image`: `scene.add.image(x, y, key).setScale(1 / FINE)`.
  - `figureBitmaps`, `fishBitmaps`, `fishSideBitmaps`, `lineFlyBitmap` and `junkBitmap` keep their signatures and now return fine bitmaps.

**`refine` rule** (the tests pin it):
1. Upscale ×`FINE`.
2. If `outline` is given, thin it. For each source cell of colour `outline`, let T be the 4-neighbour directions that are transparent or out of bounds, and I the directions holding an opaque non-outline colour. Each fine sub-pixel has two "outer sides": the horizontal and vertical directions it touches.
   - If T is non-empty (the outer ring): a sub-pixel takes the colour of an I-neighbour on one of its outer sides when no outer side is in T. A sub-pixel whose outer sides are both outline cells takes the colour of its diagonal source neighbour, if that neighbour is non-outline opaque. Otherwise it stays outline.
   - If T is empty (an inner line): a sub-pixel whose up or left outer side is in I takes that neighbour's colour. So inner lines keep their bottom or right fine pixel.
3. Rim shading. A non-outline fine pixel whose right or lower fine neighbour is transparent or outline is darkened (`mix(c, 0x000000, 0.2)`). Otherwise, one whose left or upper fine neighbour is transparent or outline is lightened (`mix(c, 0xffffff, 0.15)`).

- [ ] **Step 1: Write the failing tests** in `src/art/refine.test.ts`. Use `paint` grids with palette `{ o: 0x101010, c: 0x808080, h: 0xa06030, s: 0xe0c0a0 }`.
  - `upscale copies each pixel into a k×k block`. A 2×1 bitmap upscaled ×2 is 4×2, and pixels (0,0), (1,1) equal source (0,0).
  - `refine doubles the size and keeps alpha per source pixel`. For the 7×7 ring grid (`ooooooo`, then 5 rows of `occccco`, then `ooooooo`), `out.w === 14`, and `alpha(out, x, y) === alpha(src, x >> 1, y >> 1)` for every pixel.
  - `the outer outline is one fine pixel thick`. On that ring, `rgb(out, x, 0) === o` for x in 1..12, and `rgb(out, 7, 1) !== o`.
  - `an inner outline line is one fine pixel thick`. Grid `['ooo','oho','ooo','oso','ooo']`: `rgb(out, 2, 4) !== o` and `rgb(out, 2, 5) === o`.
  - `without an outline colour nothing becomes outline`. A grid of only `c` refined with no outline has no pixel equal to `o`, and every pixel is opaque.
  - `rim shading darkens the right edge and lightens the left`. On the ring, the luma at (12,7) is below the luma at (7,7), and the luma at (2,7) is above it.
- [ ] **Step 2:** Run `npx vitest run src/art/refine.test.ts`. Expected: FAIL (no module).
- [ ] **Step 3:** Implement `upscale` in `pixels.ts` and `refine` in `src/art/refine.ts` per the rule.
- [ ] **Step 4:** Run `npx vitest run src/art/refine.test.ts`. Expected: PASS.
- [ ] **Step 5: Update the sprite tests to fine coordinates (failing first):**
  - figures: the rod tip is opaque at `(ROD_TIP[p][0] * FINE, ROD_TIP[p][1] * FINE)`, and `FEET_Y * FINE + FINE - 1 === b.h - 1`.
  - fish: the mouth is opaque at `fishMouth(id) * FINE`, and the size-growth tests are unchanged.
  - flies: the eye is opaque at `LINE_FLY_EYE * FINE`, and the size test is `[d.w * FINE, d.h * FINE]`.
  - junk: the snag is opaque at `JUNK_SNAG * FINE`.
  - Add a figures test: `the rod is one fine pixel thick`. In `idle`, the pixel at the rod midpoint ×FINE is opaque and its right fine neighbour is transparent.

  Run `npx vitest run src/art/sprites`. Expected: FAIL.
- [ ] **Step 6: Make the sprites fine:**
  - `fishBitmaps` and `fishSideBitmaps`: `refine(paint(...), OUTLINE)`.
  - `junkBitmap`: `refine(paint(...), O)`.
  - `lineFlyBitmap`: `refine(paint(...))`.
  - `figureBitmaps`: `refine(paint(poseGrid(pose, false), pal), pal.o)`, then draw the rod at fine resolution: 1 fine px wide along the padded polyline `POSES[pose].rod.map(pad)` scaled by `FINE` (grid point p maps to fine p×FINE), colour `k` for the first 6 fine px and `r` after, ending exactly on `ROD_TIP×FINE`. `poseGrid(pose, withRod = true)` keeps `FIGURE_POSES` unchanged.

  Run `npx vitest run src/art`. Expected: PASS.
- [ ] **Step 7: Show them at half scale.**
  - FishingScene: figures, fish, flies and junk are created with `fineImage`. In `addSwimmer`, `w` and `h` are the source size `/ FINE`.
  - RiverBackdrop: fish and drift use `fineImage`, and the drift bitmap is `refine(paint(...))`.
  - `icons.ts` `catchImg` passes scale `1 / FINE`.
  - `preview.ts`: sprite sections show at half their current scale. The place composites are built at fine size, with today's chunky place bitmaps run through `upscale(b, FINE)`, until Tasks 3–5 replace them.
- [ ] **Step 8:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 9: Browser check.** Cast, bite, reel and junk all still line up: the fly sits on the line end, the fish mouth meets the fly, and junk snags. The basket icons are the same size (Review Focus 5, at DPR 1).
- [ ] **Step 10: Commit:** `git commit -m "redraw sprites at half-size pixels"`
- [ ] **Step 11: Review stop A.** Show the user the figures, fish, flies and junk on `/preview.html` and in game. Wait for approval. Apply any changes they ask for in the grids or the `refine` constants.

---

### Task 3: Scenery toolkit, skylines and water — review stop B

**Files:**
- Create: `src/art/scenery/noise.ts`, `noise.test.ts`
- Create: `src/art/scenery/raster.ts`, `raster.test.ts`
- Create: `src/art/scenery/skyline.ts`, `skyline.test.ts` (`bakeHorizon` moves here from `places.ts`, with its test)
- Create: `src/art/scenery/water.ts`, `water.test.ts`
- Modify: `src/art/places.ts` (remove `bakeHorizon`, add `haze?: number` to `HorizonLayer`), `src/art/places.test.ts`
- Modify: `src/scene/fishing/FishingScene.ts` (`buildPlace`), `src/preview.ts` (`sideView`)

**Interfaces:**
- Consumes: `FINE`, `mix`, `Bitmap`, `blank`.
- Produces:
  - `noise.ts`:
    - `hash2(i: number, j: number): number` in [0,1).
    - `noise1(x: number, seed: number): number` and `noise2(x: number, y: number, seed: number): number`: smooth value noise in [0,1].
    - `fbm(x: number, seed: number, octaves = 4): number` in [0,1].
    - `ridged(x: number, seed: number, octaves = 3): number` in [0,1].
    - `ramp(cols: number[], t: number, px: number, py: number): number`: Bayer 4×4 dithered only in the middle 40% between steps. Returns a member of `cols`. `t ≤ 0` gives `cols[0]` and `t ≥ 1` gives the last.
    - `shade(c: number, k: number): number`: k<0 darkens toward black, k>0 lightens toward white.
  - `raster.ts`:
    - `fineBlank(w: number, h: number): Bitmap`: world size in, `w*FINE × h*FINE` out.
    - `setPx(b, px, py, c)` and `getPx(b, px, py): number`, in fine pixels, clipped and clamped.
    - `fill(b, x0, y0, x1, y1, fn: (px: number, py: number, x: number, y: number) => number | null)`: world-unit rectangle. It calls `fn` with the fine pixel and the world centre `(px + .5) / FINE`, and a `null` return leaves the pixel.
  - `bakeHorizon(look: PlaceLook, w: number, h: number, seed: number): Bitmap`: fine. Its bottom row is the waterline.
  - `bakeSideWater(look: PlaceLook, reflect: Bitmap, w: number, h: number, clear: number, seed: number): Bitmap`: fine. `reflect` is the horizon bitmap, and `clear` is the water-local world y above which no bed is drawn.
  - `bedTop(x: number, h: number, clear: number, seed: number): number`: water-local world y of the bed at x. Always `≥ clear` and `≤ h - 2`.

What to draw (the mockup is the reference):
- **Sky:** `ramp` over 7 steps from `look.sky[0]` to `look.sky[1]`, then 2–4 flat-bottomed clouds that keep clear of y<8, white with a shaded underside.
- **peaks:** ridge = `0.55 * ridged(x * f, seed, 3) + 0.45 * fbm(x * f, seed)`, so it is rounder than the mockup. Faces are lit when the ridge rises to the right (sun from the left), shaded otherwise. Snow sits above an altitude snowline wobbling ±6, reaching further down where diagonal gully noise is high. Rock texture uses gully streaks and speckle, with a 1-fine-px dark ridge outline. The layer fades toward `sky[1]` by `haze` (default: far layers 0.4, near 0.1).
- **hills:** rolling, grass speckle, the far side shaded.
- **bardas:** flat-topped, ochre bands following `colors` with a wavy offset, darker vertical gullies.
- **trees:** individual crowns as in the mockup's `crown()`: lit left, shaded right, leafy noise edge. `width` and `cover` keep today's meaning, and narrow trees are pointed (poplars).
- **Water:** a `ramp` from `look.water` to `look.deep` with depth. Mirror the bottom 24 world rows of `reflect`, wobbling, mixed in at 60% and fading. Add surface glint dashes, light shafts fading with depth, sparse specks, weeds rising from the bed (when `h - clear > 6`), and bed gravel and stones tinted by `look.deep`.

- [ ] **Step 1: Write the failing tests.**
  - noise: `same inputs give the same value`; `values stay in [0,1]` over 1000 samples; `ramp returns only palette colours and exact endpoints`.
  - raster: `fineBlank is FINE× the world size`; `fill covers exactly the fine pixels of a world rect` (fill (1,1)-(2,2) sets exactly fine pixels 2..3 × 2..3).
  - skyline: for every place, `bakeHorizon(look, 480, 110, s)` is 960×220 and fully opaque. Its top-left pixel is `look.sky[0]`, it is identical for the same seed, and it differs for another seed.
  - water: for every place, `bakeSideWater(look, horizon, 480, 160, 148, 1)` is 960×320 and fully opaque, and the bottom row's luma is below the top's. `bedTop never rises above clear`: for x 0..479, `bedTop(x, 160, 148, 1)` is ≥ 148 and ≤ 158.
- [ ] **Step 2:** Run `npx vitest run src/art/scenery`. Expected: FAIL.
- [ ] **Step 3:** Implement `noise.ts` and `raster.ts`.
- [ ] **Step 4:** Implement `skyline.ts` and `water.ts`, then tune each place's `horizon` (`haze`, heights) in `places.ts` so all five read well.
- [ ] **Step 5:** Run `npx vitest run src/art`. Expected: PASS.
- [ ] **Step 6: Wire it into the scene.**
  - In `FishingScene.buildPlace`, the horizon and water are `fineImage`s of `bakeHorizon(look, VIEW_W, WATER_Y, seed)` and `bakeSideWater(look, horizonBmp, VIEW_W, VIEW_H - WATER_Y, clear, seed)`, with `clear = this.depthY(maxDepth, …) - WATER_Y + 8`.
  - The bank stays as is: `fineImage` of `upscale(bakeSideBank(...), FINE)`.
  - In `preview.ts`, `sideView` uses the same calls.
- [ ] **Step 7:** Run `npm test && npm run build`. Expected: PASS. **Browser check:** Review Focus 3 at Mountain Lake and Great Lake, plus the five skylines.
- [ ] **Step 8: Commit:** `git commit -m "draw detailed skylines and water"`
- [ ] **Step 9: Review stop B.** Show the five skylines and waters to the user (mountains rounder than the mockup). Wait for approval.

---

### Task 4: Ground, bank cut, side props and dock — review stop C

**Files:**
- Create: `src/art/scenery/props.ts`, `props.test.ts` (side view)
- Create: `src/art/scenery/bank.ts`, `bank.test.ts` (`bakeSideBank` and `BANK_SURFACE` move here from `places.ts`, with their test)
- Modify: `src/art/places.ts` (new types, `ground` and `props` per place, remove the side-prop grids `COIRON_S`, `lupineS`, `ROCK_S`, `LENGA_S`, `WILLOW_S`, `LOG_S`), `src/art/places.test.ts`
- Modify: `src/scene/fishing/FishingScene.ts`, `src/preview.ts`

**Interfaces:**
- Consumes: Task 3's noise, raster and `shade`.
- Produces, in `places.ts`:
  - `type Ground = 'steppe' | 'cobbles' | 'mud' | 'turf' | 'beach'`
  - `type PropKind = 'lenga' | 'poplar' | 'willow' | 'log' | 'rock' | 'coiron' | 'lupine'`
  - `interface Prop { kind: PropKind; colors: number[]; count: number }`
  - `PlaceLook` gains `ground: Ground`, and `props` becomes `Prop[]`. `decor` stays `Decor[]` until Task 5.
- Produces, in `props.ts`:
  - `PROP_SIZE: Record<PropKind, [number, number]>` (world w, h): lenga [34, 56], poplar [14, 60], willow [30, 40], log [22, 7], rock [10, 6], coiron [7, 6], lupine [3, 10].
  - `sideProp(p: Prop, seed: number): Bitmap`: fine, at most `PROP_SIZE × FINE`, standing on its bottom row.
- Produces, in `bank.ts`:
  - `BANK_SURFACE = 64`: world rows above the walkable ground, room for the tallest prop.
  - `bakeSideBank(look: PlaceLook, h: number, waterY: number, seed: number): Bitmap`: fine. `waterY` is the texture-local world row of the waterline.

What to draw:
- **Props:** trees are a trunk with bark shading plus foliage blob clusters lit from the upper left (the mockup's lenga). The lenga mixes in some autumn red, the poplar is tall and narrow with yellow-green, and the willow has drooping strands. The log has bark grain, an end-grain cut with rings and moss on top. The rock is lit from the upper left, with moss. Coirón is a golden tuft of blades, and the lupine a stem with a flower spike.
- **Ground surface,** the top 3–5 world rows:
  - `steppe`: dry ochre ground with tufts.
  - `cobbles`: rounded shaded stones, loose on top.
  - `mud`: dark wet mud with puddles reflecting the sky colour, and a driftwood edge.
  - `turf`: green grass with blades hanging over the edge.
  - `beach`: fine pebbles.
- **Cut, shared:** under the surface, topsoil (`shade(look.soil, -.35)`) with roots poking out of the face, then 4 strata from `look.soil` with wavy bands and speckle, and shaded stones from `look.edge`. The face has a 1-fine-px dark edge. Rows below `waterY` mix toward `look.deep` by 0.12 + 0.5·depth (at most 0.65).
- **Dock:** planks with grain, seams every 8 world units, shaded posts down into the water, and a darker underside.

- [ ] **Step 1: Write the failing tests.**
  - props: for every kind, `sideProp` is non-empty, fits `PROP_SIZE × FINE`, has an opaque pixel on its bottom row, and is identical for the same seed.
  - bank: for every place, `bakeSideBank(look, 176, 72, 1)` is `(shoreX + (dock ? 110 : 0)) * FINE` wide and `176 * FINE` tall. It is opaque at fine `(4 * FINE, BANK_SURFACE * FINE)` and fully transparent on row 0. Places with props have an opaque pixel above the surface row.
  - places: `every place has a ground and the five grounds are all different`; `every prop kind paints` (replaces the grid test for `props`).
- [ ] **Step 2:** Run `npx vitest run src/art`. Expected: FAIL.
- [ ] **Step 3:** Implement `props.ts`, `bank.ts` and the `places.ts` changes. Each place's `props` keeps today's character: Creek coirón and lupines; River coirón and rocks; Big River willow and log; Mountain Lake lenga, rock and log; Great Lake one green lenga.
- [ ] **Step 4:** Run `npx vitest run src/art`. Expected: PASS.
- [ ] **Step 5: Wire it into the scene.** In `FishingScene.buildPlace`, the bank is a `fineImage` of `bakeSideBank(look, VIEW_H - GROUND_Y + BANK_SURFACE, WATER_Y - GROUND_Y + BANK_SURFACE, seed)` at `(0, GROUND_Y - BANK_SURFACE)`. `preview.ts` uses the same, and logs `performance.now()` bake time per place (horizon + water + bank).
- [ ] **Step 6:** Run `npm test && npm run build`. Expected: PASS. **Browser check:**
  - Review Focus 2: no seams between bank, water and horizon at the four sizes.
  - Review Focus 4: bake times under 150 ms in the preview log.
  - Figures stand on the ground at every place, and on the dock at Great Lake.
  - Trees don't hide the player, the helper or the cast loop.
- [ ] **Step 7: Commit:** `git commit -m "draw per-place ground, bank cuts and props"`
- [ ] **Step 8: Review stop C.** Show the five side views with figures to the user. Wait for approval.

---

### Task 5: Title backdrop — review stop D

**Files:**
- Modify: `src/art/scenery/props.ts` (+ `topProp`), `props.test.ts`
- Create: `src/art/scenery/river.ts`, `river.test.ts` (`bakeBank` moves here from `places.ts`, with its test)
- Modify: `src/art/places.ts` (`decor` becomes `Prop[]`, remove the top-down decor grids except `drift`), `src/art/places.test.ts`
- Modify: `src/scene/title/RiverBackdrop.ts`, `src/preview.ts` (`topDown`)

**Interfaces:**
- Consumes: Task 4's `Prop`, `Ground` and `PROP_SIZE`.
- Produces:
  - `topProp(p: Prop, seed: number): Bitmap`: fine, seen from above, at most `PROP_SIZE[kind][0] × FINE` square.
  - `bakeRiver(look: PlaceLook, w: number, h: number, seed: number): Bitmap`: fine, the water strip `w × look.riverH`.
  - `bakeBank(look: PlaceLook, w: number, h: number, waterSide: 'top' | 'bottom', seed: number): Bitmap`: fine.

What to draw:
- **River:** a `ramp` from `look.water[0]` at both shores to `look.water[last]` at mid-river. Bed stones show through faintly near the shores, plus foam lines along both shores.
- **Banks:** the place's `ground` seen from above, with the same materials as Task 4, lit from the upper left. There is a detailed shoreline on the water side (wet darker band, stones), worn dirt patches, and `decor` props via `topProp`. Great Lake keeps a top-down plank dock on its bank.
- **Glints:** `RiverBackdrop`'s ripple dashes become glints, `1/FINE` tall, twinkling with alpha `0.5 + 0.5·sin(t·2 + i)`.

- [ ] **Step 1: Write the failing tests.**
  - `topProp`: for every kind, non-empty and within size.
  - river: for every place, `bakeRiver(look, 480, look.riverH, 1)` is `960 × riverH*FINE` and fully opaque, and the mid-river row's luma differs from the shore row's.
  - bank: `bakeBank(look, 480, 60, 'bottom', 1)` is 960×120, with the row touching the water fully opaque (replaces `edge strip touches the water side`).
  - places: `every decor kind paints` (for `decor` and `drift`).
- [ ] **Step 2:** Run `npx vitest run src/art`. Expected: FAIL.
- [ ] **Step 3:** Implement `topProp`, `river.ts` and the `places.ts` changes.
- [ ] **Step 4:** Run `npx vitest run src/art`. Expected: PASS.
- [ ] **Step 5: Wire it in.** In `RiverBackdrop`, the banded `Graphics` water is replaced by a `fineImage` of `bakeRiver`, the banks use `fineImage` of the new `bakeBank`, and glints twinkle. `preview.ts` `topDown` uses the same.
- [ ] **Step 6:** Run `npm test && npm run build`. Expected: PASS. **Browser check:** the title for all five places (switch the place in a save), and that the menu and logo are still readable over the backdrop.
- [ ] **Step 7: Commit:** `git commit -m "draw detailed title rivers and banks"`
- [ ] **Step 8: Review stop D.** Show the five title backdrops to the user. Wait for approval.

---

### Task 6: Docs and wrap-up

**Files:**
- Modify: `CLAUDE.md` (the `src/art/` paragraph)
- Modify: `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md`

- [ ] **Step 1: Update `CLAUDE.md`'s art paragraph.**
  - Art is baked at `FINE`× and shown at `1/FINE` with the camera zoomed ×`FINE`. Chunky text stays at scale 1.
  - Sprites go through `refine`.
  - Scenery is procedural in `src/art/scenery/` (noise, raster, skyline, water, bank, props, river).
  - Anchors are in grid units.
  - The canvas is 480×270 world units.
- [ ] **Step 2: Update the roadmap.** Mark piece 8 done, with an "as built" section: decisions from the review stops, anything deferred, and leftovers from Review Focus.
- [ ] **Step 3: Verify.** Run `npm test && npm run build`. Expected: all pass, and `pacing.test.ts` is unchanged and green.
- [ ] **Step 4: Commit:** `git commit -m "docs: close piece 8 on the roadmap"`
