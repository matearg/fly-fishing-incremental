# Fishing Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the box-drawn fishing scene with Patagonia pixel art, where the fish (or junk) you see approach the fly is the catch you land, with one helper figure acting out its fishing.

**Architecture:** The sim picks each angler's catch at cast and stores it on the angler (`pending`); the scene only reads state and choreographs from `phase`, `timerMs` and `pending`. All art stays pure functions in `src/art/` (grids + palettes → `Bitmap`), organised as named styles with a `default` entry so cosmetics can be swapped in later. A dev-only `preview.html` shows baked art for the user's review stops.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-fishing-scene-design.md` (read it first; mockup `docs/superpowers/specs/2026-10-17-fishing-scene-patagonia-mockup.html`).

## Status (2026-10-17)

- Tasks 1–6 are built on branch `fishing-scene` (`c291519..6e2e6b4`). Review stops 1–3 are approved; at stop 3 the user also asked for unique El Cuero and Nahuelito shapes (`75938f2`).
- The final whole-branch review found 0 critical, 2 important and 7 minor issues. Both important ones are fixed (`6e2e6b4`). The minors have their own plan, `plans/2026-10-17-fishing-scene-minors.md`. It is done (`e96f9fc..beec9b0`), and its fresh review found 0 critical and 0 important issues.
- Review stop 4 approved on 2026-10-18; piece 3 is done. Only the merge to `master` is left.

## Global Constraints

- Work on branch `fishing-scene` off `master`; merge to `master` when the roadmap row says done.
- Canvas 480×270, `pixelArt: true`. Style: thick dark outlines, stepped gradients, chunky pixels, matching the title screen.
- All art drawn in code (`string[]` grids + palettes, baked by pure functions in `src/art/`, uploaded with `addBitmap`). No third-party assets.
- No `SAVE_VERSION` bump. Old saves must load.
- No change to `TIMING`, prices, or species values/tiers/depths. Weights only if the pacing test needs a retune after Task 2.
- The scene never mutates game state. Keep `SceneHooks`, the menu button, Esc, and "a click on the menu button is not a cast".
- Commit messages: short, one line, imperative, `type: subject` like the repo history; no trailers.
- **Art review stops are hard stops:** the task ends by asking the user to approve; do not start the next task until they do.
- `npm test` and `npm run build` pass at the end of every task.

## Review Focus

1. **Travel while a line is out:** a Creek fish must never approach or land at the Great Lake; in `bite`/`reeling` the hooked catch stays. Tests in Task 1 (sim) and Task 6 (scene restarts the approach when `pending` changes identity).
2. **The shortest wait (1.5 s):** the approach compresses and still ends exactly at the bite. Test in Task 6 (`approach`).
3. **Old save mid-bite with no stored catch:** loads, lands, and the scene draws the bite without a fish rather than crashing. Test in Task 1 (save); guard in Task 6.
4. **Many helpers (50+):** still one figure and one count label; nothing drawn per helper. Checked in Task 6's manual run with a state of 50 anglers.
5. **Ambient fish set changes** (travel, a licence species bought at season start): the scene rebuilds its schools; the chosen fish always comes from a visible school. Test in Task 6 (`schoolKey`).

---

### Task 1: Pick the catch at cast

**Files:**
- Modify: `src/game/state.ts` (types, `newGame`), `src/game/helpers.ts:22`, `src/game/sim.ts`, `src/game/save.ts` (`sanitize`)
- Test: `src/game/sim.test.ts`, `src/game/save.test.ts`

**Interfaces:**
- Produces: `export type Pending = Omit<CatchItem, 'id'> & { location: LocationId }`; `Angler` gains `pending: Pending | null` (null whenever no catch is picked). Later tasks read `angler.pending`.

- [x] **Step 1: Create the branch** — `git switch -c fishing-scene`.
- [x] **Step 2: Write failing tests** in `src/game/sim.test.ts` (update `autoAngler()` to include `pending: null`):
  - `it('the catch is picked at cast and is what lands')`: `castPlayer(s, r)`; `const p = s.anglers[0].pending!`; `expect(p.location).toBe(s.location)`; run to bite, `reelPlayer`, run `TIMING.reelMs + 100`; `expect(s.basket[0]).toMatchObject({ kind: p.kind, defId: p.defId, value: p.value, size: p.size })`; `expect(s.anglers[0].pending).toBeNull()`.
  - `it('travel while waiting re-picks for the new place')`: unlock `river` (set `s.unlockedLocations.push('river')`), cast at creek, `travel(s, 'river')`, `tick(s, 100, r)`; `expect(s.anglers[0].pending!.location).toBe('river')`; if `kind === 'fish'`, `expect(SPECIES.find(x => x.id === p.defId)!.location).toBe('river')`.
  - `it('travel during a bite keeps the hooked catch')`: cast, run to `bite`, `const p = structuredClone(s.anglers[0].pending)`, travel, `run(s, 1000)`; `expect(s.anglers[0].pending).toEqual(p)`.
  - `it('helpers pick at cast too')`: auto angler with a fly in the box; after one tick in `waiting`, `pending` is non-null.
- [x] **Step 3: Write failing tests** in `src/game/save.test.ts`:
  - `it('an old save mid-bite without pending loads and lands')`: cast, run to bite, serialize, then in the parsed JSON `delete anglers[0].pending`; `parseSave(...)` → `anglers[0].pending` is `null`; `reelPlayer` + run → `basket` has 1 item.
  - `it('drops a pending catch of an unknown species')`: set `pending = { kind: 'fish', defId: 'noSuchFish', value: 1, size: 1, location: 'creek' }` → after `parseSave`, `null`.
- [x] **Step 4: Run** `npx vitest run src/game/sim.test.ts src/game/save.test.ts` — expect the new tests to FAIL.
- [x] **Step 5: Implement.**
  - `startWaiting(state, a, rand)` also sets `a.pending = { ...rollCatch(state, a.fly!, rand), location: state.location }`.
  - `stepAngler` `waiting`: before counting down, if `a.pending?.location !== state.location` re-roll it (this also fills `null` from old saves). Don't touch `bite`/`reeling`.
  - `land`: use `a.pending` (dropping `location`), falling back to `rollCatch` when `null`; then `a.pending = null`. The sorter rule is unchanged.
  - `sanitize`: `a.pending ??= null`; set it to `null` when its `defId` isn't in `SPECIES` (fish) or `JUNK` (junk).
  - `newGame` and `buyHelper` create anglers with `pending: null`.
- [x] **Step 6: Run** `npm test` — all pass, including `pacing.test.ts` (the random sequence shifts; the odds don't).
- [x] **Step 7: Commit** — `git commit -am "feat(sim): pick the catch at cast"`.

---

### Task 2: Patagonian fish

**Files:**
- Modify: `src/game/data.ts` (`SPECIES`), `src/art/fish.ts` (`FISH_COLORS` keys)
- Test: `src/game/data.test.ts`, `src/art/fish.test.ts`, `src/game/save.test.ts`

**Interfaces:**
- Produces: `SPECIES` with 20 entries; ids `smallmouthBass` and `lakeTrout` gone.

- [x] **Step 1: Write failing tests.**
  - `data.test.ts`, `it('species carry the Patagonian names')`: `expect(SPECIES.map(s => [s.id, s.name])).toEqual([...])` with exactly the spec's table, in this order: dace Puyen, brookTrout Brook Trout, creekChub Otuno, brownTrout Brown Trout, grayling Peladilla, rainbowTrout Rainbow Trout, pike Bigmouth Perch, perch Creole Perch, walleye Chinook Salmon, catfish Velvet Catfish, muskie Limay King, cutthroat Big Puyen, goldenTrout Landlocked Salmon, arcticChar Glacier Trout, tigerTrout Andes Tiger, whitefish Pejerrey, cisco Steelhead, steelhead Sea-run Brown Trout, lakeSturgeon El Cuero, ghostSturgeon Nahuelito.
  - `fish.test.ts`, `it('colours exist for exactly the current species')`: `expect(Object.keys(FISH_COLORS).sort()).toEqual(SPECIES.map(s => s.id).sort())`.
  - `save.test.ts`, `it('a basket fish of a removed species survives load and sells')`: basket item `{ kind: 'fish', defId: 'lakeTrout', value: 50, ... }` → after `parseSave` it's still there; `sellAll` adds 50.
- [x] **Step 2: Run** `npm test` — the new tests FAIL.
- [x] **Step 3: Implement.** Rename the `name` fields; delete the two species and their `FISH_COLORS` entries. Palettes are retuned in Task 5.
- [x] **Step 4: Run** `npm test`. If `pacing.test.ts` fails, raise the weights of River's and Mountain Lake's remaining fish just enough to pass, and note the change in the commit message. Don't re-add species.
- [x] **Step 5: Commit** — `git commit -am "feat(data): Patagonian fish names"`.

---

### Task 3: Place styles, the Patagonia look, art preview — **review stop 1**

**Files:**
- Modify: `src/art/places.ts`, `src/game/rand.ts`, `src/scene/RiverBackdrop.ts`
- Create: `preview.html`, `src/preview.ts` (dev-only art page)
- Test: `src/art/places.test.ts`, `src/game/rand.test.ts` (create if missing)

**Interfaces:**
- Produces:
  - `hashString(s: string): number` in `src/game/rand.ts`.
  - `PlaceLook` gains `sky: [number, number]` (top, horizon), `deep: number` (darkest water colour), `horizon: HorizonLayer[]` (far to near; `HorizonLayer = { kind: 'peaks' | 'hills' | 'bardas' | 'trees'; colors: number[]; height: number }`), `shoreX: number` (x where water meets the bank on the side view), `dock: boolean`, `drift: Decor` (what floats on the title river instead of lily pads).
  - `PLACE_STYLES: Record<string, Record<LocationId, PlaceLook>>` with one `default` entry; `placeLook(id: LocationId, style = 'default'): PlaceLook`. `PLACE_LOOKS` is removed; callers use `placeLook`.
  - `bakeHorizon(look: PlaceLook, w: number, h: number, seed: number): Bitmap` (sky gradient plus layers, transparent below the horizon).
  - `bakeSideBank(look: PlaceLook, h: number, seed: number): Bitmap`: the left bank cut in side view, `look.shoreX` wide (wider when `dock`, which reaches out over the water). Row 0 is the walkable surface the anglers stand on.
  - `bakeBank` (top-down) stays and uses the new decor.

- [x] **Step 1: Write failing tests.**
  - `rand.test.ts`: `hashString('creek') !== hashString('river')`, and it's stable (same input, same output).
  - `places.test.ts`: keep the existing tests on `placeLook`; add: every place has ≥2 horizon layers; `deep` differs from `water[0]`; `bakeHorizon(look, 480, 80, 1)` is 480×80 with an opaque top-left pixel; `bakeSideBank(look, 120, 1)` has width `look.shoreX` (or more when `dock`) and an opaque pixel at row 0; `placeLook('creek', 'nope')` falls back to `default`.
- [x] **Step 2: Run** `npx vitest run src/art src/game/rand.test.ts` — FAIL.
- [x] **Step 3: Implement the five Patagonia looks** from the spec's table and the mockup (Creek steppe arroyo with coirón and lupines; River cobbles, bardas and poplars; Big River tall bardas, willows and driftwood; Mountain Lake turquoise water, lenga forest and close peaks; Great Lake deep blue water, the Andes filling the sky, cobble beach and dock). Decor and drift grids follow the existing `Decor` pattern.
- [x] **Step 4: Update `RiverBackdrop`**: use `placeLook`, seed with `hashString(location)`, and replace the lily pads with `look.drift`.
- [x] **Step 5: Create the preview page.** `preview.html` loads `src/preview.ts`, which draws baked bitmaps onto canvases at 2× with `image-rendering: pixelated`. One section per place: the top-down banks plus water bands, and the side view (horizon, water gradient from `water[0]` to `deep`, side bank). Later tasks add sections. Confirm `npm run build` still only emits the game: `dist/` has no `preview` entry.
- [x] **Step 6: Run** `npm test && npm run build` — pass.
- [x] **Step 7: Commit** — `git commit -am "feat(art): Patagonia place looks"` (add the new files first).
- [x] **Step 8: REVIEW STOP 1.** Run `npm run dev` and screenshot `/preview.html` and the title screen at each place (the dev console can set `state.location`). Show them to the user, apply their changes, and wait for approval.

---

### Task 4: Angler and helper figures — **review stop 2**

**Files:**
- Create: `src/art/figures.ts`, `src/art/figures.test.ts`
- Modify: `src/preview.ts`

**Interfaces:**
- Produces: `type Pose = 'idle' | 'cast' | 'reel'`; `type FigureKind = 'angler' | 'helper'`; `FIGURE_STYLES: Record<FigureKind, Record<string, FigureStyle>>` (`default` only); `figureBitmaps(kind: FigureKind, style = 'default'): Record<Pose, Bitmap>`; `ROD_TIP: Record<Pose, [number, number]>` (pixel the line leaves from, relative to the sprite's top-left); `FEET_Y: number` (the sprite row that stands on the ground).

- [x] **Step 1: Write failing tests**: all three poses are the same size for both kinds; `ROD_TIP` for each pose is inside the sprite and on an opaque pixel; the angler's and helper's idle bitmaps differ (the helper uses a different shirt colour from the red player).
- [x] **Step 2: Run** `npx vitest run src/art/figures.test.ts` — FAIL.
- [x] **Step 3: Implement.** Roughly 16×26 px figures: hat, outline, rod. `cast` has the rod forward, `reel` has it raised and bent.
- [x] **Step 4: Add a figures section to the preview page** (both kinds × three poses, standing on each place's side bank).
- [x] **Step 5: Run** `npm test && npm run build`. **Commit** `feat(art): angler and helper figures`.
- [x] **Step 6: REVIEW STOP 2.** Screenshot the preview and wait for the user's approval.

---

### Task 5: Side-view fish and junk — **review stop 3**

**Files:**
- Modify: `src/art/fish.ts`, `src/preview.ts`
- Create: `src/art/junk.ts`, `src/art/junk.test.ts`
- Test: `src/art/fish.test.ts`

**Interfaces:**
- Produces:
  - `FISH_SIDE: Record<Tier, [Grid, Grid]>`, a side view facing right with two tail frames. It grows with tier like `FISH_TOP`.
  - `FISH_MOUTH: Record<Tier, [number, number]>`, the mouth pixel the fly meets.
  - `FISH_STYLES: Record<string, Record<string, FishColors>>` with `default = FISH_COLORS`.
  - `fishColors(id: string, style = 'default')`.
  - `fishSideBitmaps(id: string, style = 'default'): [Bitmap, Bitmap]`. `fishBitmaps` also uses `fishColors`.
  - `junkBitmap(id: string): Bitmap`.
  - `JUNK_ART: Record<string, { grid: Grid; palette: Record<string, number> }>`.
  - `JUNK_SNAG: Record<string, [number, number]>`, where the line catches.

- [x] **Step 1: Write failing tests.**
  - The existing `FISH_TOP` size test is mirrored for `FISH_SIDE`.
  - `FISH_MOUTH` lands on an opaque pixel of frame 0.
  - `fishSideBitmaps` returns 2 bitmaps for every species.
  - `junk.test.ts`: every `JUNK` id has `JUNK_ART` and `JUNK_SNAG`, and `junkBitmap` paints each one.
- [x] **Step 2: Run** `npx vitest run src/art` — FAIL.
- [x] **Step 3: Implement.**
  - Side shapes use the same outline and eye conventions as `fishGrid`.
  - Retune the `FISH_COLORS` palettes to match each renamed fish. For example: Puyen is translucent olive with silver; Velvet Catfish is dark and velvety; Pejerrey is silver with a lateral stripe; Nahuelito is pale and ghostly.
  - Junk: can, tangled line, boot, tire.
- [x] **Step 4: Add sections to the preview page.** Show every species in both views, grouped by place, plus the four junk items.
- [x] **Step 5: Run** `npm test && npm run build`, then commit with `feat(art): side-view fish and junk`.
- [x] **Step 6: REVIEW STOP 3.** Screenshot the preview and wait for approval. If the user asks for unique shapes for El Cuero or Nahuelito, add a per-species grid override here.

---

### Task 6: The fishing scene — **review stop 4**

**Files:**
- Create: `src/scene/choreo.ts`, `src/scene/choreo.test.ts`
- Modify: `src/scene/FishingScene.ts` (rewrite of `create`/`update`; keep `VIEW_W`, `VIEW_H`, `SceneHooks`, the menu button and the input rules)

**Interfaces:**
- Consumes:
  - `angler.pending`, `phase` and `timerMs` (Task 1)
  - `placeLook`, `bakeHorizon`, `bakeSideBank` (Task 3)
  - `figureBitmaps`, `ROD_TIP`, `FEET_Y` (Task 4)
  - `fishSideBitmaps`, `FISH_MOUTH`, `junkBitmap`, `JUNK_SNAG`, `TIER_SCHOOL` (Task 5)
- Produces, in `src/scene/choreo.ts`:
  - `approach(remainingMs: number, waitMs: number): { stage: 'cruise' | 'notice' | 'swim'; k: number }`. The approach lasts `min(APPROACH_MS, waitMs)` and ends at `remainingMs = 0`. The first `NOTICE_SHARE` of it is the notice-and-turn; the rest is the swim. `k` runs 0→1 within each stage.
  - `castPose(waitMs: number, remainingMs: number): boolean`, true for the first `CAST_MS` of a wait.
  - `schoolKey(state: GameState): string`, which changes when the location or the licensed species there change.
  - Constants `APPROACH_MS`, `NOTICE_SHARE` and `CAST_MS`, starting at 2000, 0.4 and 300. Tune them at the review stop.

- [x] **Step 1: Write the failing tests** in `choreo.test.ts`:
  - `approach(5000, 6000).stage === 'cruise'`
  - `approach(0, 6000)` gives `{ stage: 'swim', k: 1 }`
  - A short wait: `approach(1500, 1500)` gives `{ stage: 'notice', k: 0 }`, and `approach(0, 1500).k === 1`
  - Over a wait, `k` never decreases within a stage
  - `castPose(3000, 2900) === true` and `castPose(3000, 1000) === false`
  - `schoolKey` differs after travel and after pushing a licence species for the current place
- [x] **Step 2: Run** `npx vitest run src/scene/choreo.test.ts` and confirm the tests FAIL.
- [x] **Step 3: Implement `choreo.ts`.**
- [x] **Step 4: Rewrite the scene.** The behaviour follows the spec's "What the player sees". Decisions the spec leaves open:
  - **Layers, back to front:**
    - the horizon bitmap
    - the water gradient: per-row, from `look.water` to `look.deep`, with no bands
    - surface ripples
    - ambient fish sprites
    - junk
    - the side bank
    - the figures
    - the line and fly as `Graphics`
    - the HUD
  - **Depth to y.** Fly y and species y come from depth as `surface + (depth + 0.5) / (maxDepth + 1) × waterHeight`, invisible but still ordered.
  - **Schools.** Build the ambient schools (`TIER_SCHOOL`; delete `TIER_COLOR` and `TIER_COUNT`) whenever `schoolKey` changes. Destroy the old sprites.
  - **Per-angler tracking**, for the player and `anglers[1]`: remember `pending` and `waitMs`. When `pending` changes identity, set `waitMs = timerMs`. This covers a new cast and a re-pick after travel.
  - **Player, fish catch.** Pick one sprite of `pending.defId`'s school. While `waiting`, drive it with `approach`: during the notice it turns toward the fly, during the swim it moves until its `FISH_MOUTH` meets the fly. While `bite`, hold it at the fly and tug. While `reeling`, pull it to the bank edge with `k = 1 - timerMs / TIMING.reelMs`. On landing, hide it and return it to the school off-screen.
  - **Player, junk catch.** The `junkBitmap` drifts in from the right at the fly's depth, timed with `approach`, until `JUNK_SNAG` meets the line. During the bite and reel, treat it the same as a fish.
  - **Missing catch.** If `pending` is `null` during a bite, draw the tug with no catch.
  - **Helper figure.** Show it only when `anglers.length > 1`, standing beside the player and driven by `anglers[1]`:
    - `idle` with no fly: idle pose, no line
    - `waiting`: the `cast` pose while `castPose`, then idle with the line in
    - `bite`: idle with the line in
    - `reeling`: the reel pose with the line coming in
    - It never shows a catch.
  - **Player figure poses.** The same `castPose`, idle and reel pose logic as the helper.
  - **HUD.** Top-left reads `Helpers ${anglers.length - 1}`, hidden at 0. Top-right keeps the place name and the menu button. The "!" sits over the player while in `bite`.
  - **Motion.** Fish tails swap frames at about 4 Hz. The fly bobs while waiting.
  - **Dock.** When `look.dock` is set, the figures stand on the dock.
- [x] **Step 5: Run** `npm test && npm run build` and confirm everything passes.
- [x] **Step 6: Manual run.** `npm run dev`, play at `?speed=20`, and check:
  - catches at every place, at least one junk snag, and travel mid-wait
  - a state with 50 helpers, set from the console: one figure, "Helpers 50"
  - Esc and the menu button still work, and clicking the menu button doesn't cast
- [x] **Step 7: Commit.** `git commit -am "feat(scene): Patagonia fishing scene with visible bites"`
- [x] **Step 8: REVIEW STOP 4.** Record a short GIF or screenshots of the approach, bite, reel, junk snag and the helper cycle. Show them to the user, tune the durations, and wait for approval.
- [x] **Step 9: Close out.**
  - In the roadmap, mark piece 3 done and drop the two deferred minors this piece fixed (the backdrop seed and `TIER_COUNT`).
  - Commit `docs: mark piece 3 done`.
  - Ask the user before merging `fishing-scene` to `master`.
