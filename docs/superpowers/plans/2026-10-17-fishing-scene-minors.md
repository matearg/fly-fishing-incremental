# Fishing Scene Minors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the seven minor findings from the fishing scene's final whole-branch review, before piece 3 is merged.

**Architecture:** Each fix goes in the layer that owns the behaviour:
- **Game layer (`src/game`):** the species list and save repair.
- **Art layer (`src/art`):** grid validation and mouth lookup.
- **Scene (`src/scene`):** cast timing, plus release after landing.

Only these files change. There are no new modules, no new dependencies and no save format change.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-fishing-scene-design.md`. The findings are recorded as `Final: minor (deferred)` lines in `.superpowers/sdd/2026-10-17-fishing-scene/progress.md`. The plan they come from is `plans/2026-10-17-fishing-scene.md`.

## Global Constraints

- Work on branch `fishing-scene`, after review stop 4 of the fishing scene plan is approved. That way, timing changes from the review land first.
- No `SAVE_VERSION` bump. Old saves must load.
- No change to `TIMING`, prices, species, or the approved art.
- The scene never mutates game state. Keep `SceneHooks`, the menu button, Esc, and "a click on the menu button is not a cast".
- Commit messages: short, one line, imperative, `type: subject` like the repo history; no trailers.
- `npm test` and `npm run build` pass at the end of every task.

## Review Focus

1. **A ragged grid already in the codebase:** making `paint` strict must not break any existing art. Task 2's full suite run covers every grid, through the existing "paints every …" tests.
2. **Travel mid-wait after the cast/approach split:** the fly stays in the water at the new depth, with no re-cast. The new fish's approach still ends exactly at the bite. Tested in Task 3 (`trackCatch` keeps `castMs`), and checked in Task 3's manual run.
3. **Spam-click recast during a reel:** the landed fish vanishes, and the next catch's approach starts cleanly. Tested in Task 3 (`releaseOffscreen`), and checked in the manual run.
4. **Title school vs. fishing school vs. catch odds:** after Task 1 all three read the same `placeSpecies` list, so a bought licence species shows up in all three at once. Tested in Task 1.
5. **A corrupt save with `phase: 'reeling'` and no fly:** it loads as idle and doesn't land a phantom catch. Tested in Task 1.

---

### Task 1: One species list per place; repair a flyless active angler

Covers findings 5 (duplicated licence filter) and 6 (`waiting` with a null fly throws on the first tick).

**Files:**
- Modify: `src/game/catch.ts`, `src/game/save.ts:28-32`, `src/scene/choreo.ts:23-26`, `src/scene/FishingScene.ts:117`, `src/scene/RiverBackdrop.ts:38`
- Test: `src/game/catch.test.ts`, `src/game/save.test.ts`

**Interfaces:**
- Produces: `placeSpecies(location: LocationId, licensed: string[]): SpeciesDef[]` in `src/game/catch.ts`. It returns the place's species; licence species appear only once bought.
- Removes: `schoolSpecies` from `choreo.ts`. `schoolKey(state)` keeps its signature and builds on `placeSpecies(state.location, state.licenseSpecies)`.

- [x] **Step 1: Write failing tests.**
  - In `catch.test.ts`, `it('placeSpecies hides licence species until bought')`:
    - `placeSpecies('mountainLake', [])` does not contain `tigerTrout`
    - `placeSpecies('mountainLake', ['tigerTrout'])` does contain `tigerTrout`
    - every returned species has `location === 'mountainLake'`
  - In `save.test.ts`, `it.each(['waiting', 'bite', 'reeling'])('a %s angler with no fly loads idle and ticks safely')`:
    1. Start from `newGame()`. Set `anglers[0] = { auto: false, phase, timerMs: 10, fly: null, pending: { kind: 'junk', defId: 'can', value: 0, size: 1, location: 'creek' } }`.
    2. After `parseSave`, expect it to match `{ phase: 'idle', pending: null }`.
    3. Expect `tick(l, 100, Math.random)` not to throw.
    4. Expect `l.basket` to have length 0.
- [x] **Step 2: Run** `npx vitest run src/game/catch.test.ts src/game/save.test.ts`. Expected: FAIL. `placeSpecies` is not exported, and the save test throws inside `pick`/`flyStats`.
- [x] **Step 3: Implement.**
  - `placeSpecies` holds the filter that `rollCatch` has today. `rollCatch` calls it, then applies its own `depth` filter.
  - In `sanitize`'s angler loop: if `!a.fly && a.phase !== 'idle'`, set `phase = 'idle'` and `pending = null`.
  - `choreo.schoolKey`, `FishingScene.buildSchool` and the `RiverBackdrop` constructor call `placeSpecies`.
- [x] **Step 4: Run** `npm test && npm run build`. Expected: all pass, including `pacing.test.ts` (the odds don't change).
- [x] **Step 5: Commit** `refactor(game): one species list per place, repair flyless anglers on load`.

---

### Task 2: Strict grids; one mouth lookup

Covers findings 4 (place grids have no rectangular-rows check) and 3 (`FISH_MOUTH` is used only by tests, and `fishMouth` is recomputed every frame).

**Files:**
- Modify: `src/art/pixels.ts` (`paint`), `src/art/fish.ts:68-73,161`
- Test: `src/art/pixels.test.ts`, `src/art/fish.test.ts:36-41`

**Interfaces:**
- Changes: `paint(grid, palette)` throws `Error('ragged grid: row ${y} is ${n} wide, expected ${w}')` when a row's length differs from `grid[0].length`. This fixes the root cause once for every grid (decor, props, drift, fish, junk, figures). The per-module rectangular-rows tests stay as documentation.
- Removes: the `FISH_MOUTH` export. `fishMouth(id: string): [number, number]` stays and is memoised per id in a module-level `Map`.

- [x] **Step 1: Write failing tests.**
  - In `pixels.test.ts`, `it('throws on a ragged grid')`: `expect(() => paint(['ab', 'abc'], { a: 1, b: 2, c: 3 })).toThrow('ragged grid')`.
  - In `fish.test.ts`, replace the tier test `the mouth sits on an opaque pixel of frame 0` (which uses `FISH_MOUTH`) with `it('fishMouth returns the same point on repeat calls')`: `expect(fishMouth('dace')).toBe(fishMouth('dace'))`. That is the same array instance, so the result is cached. The existing per-species mouth test already covers opacity for every tier.
- [x] **Step 2: Run** `npx vitest run src/art`. Expected: both new tests FAIL. `paint` doesn't throw, and `fishMouth` returns a new array each call.
- [x] **Step 3: Implement.**
  - The width check in `paint`.
  - Delete `FISH_MOUTH`.
  - Memoise `fishMouth`.
- [x] **Step 4: Run** `npm test && npm run build`. Expected: all pass. A failure here means an existing grid is ragged: fix that grid, not the check.
- [x] **Step 5: Commit** `refactor(art): reject ragged grids, cache fish mouths`.

---

### Task 3: Scene timing and release fixes

Covers findings 2 (inline `castPose`), 7 (travel mid-wait replays the cast) and 1 (a landed fish swims off when a recast lands in the same frame). It also adds the reviewer's side note: `addSwimmer` re-bakes bitmaps whose textures already exist.

**Files:**
- Modify: `src/scene/choreo.ts` (`Track`, `trackCatch`, new `releaseOffscreen`), `src/scene/FishingScene.ts` (`pose`, `flyPos`, `release` call, `Chosen`, `addSwimmer`, track initialisers)
- Test: `src/scene/choreo.test.ts`

**Interfaces:**
- Changes `Track` to `{ pending: Pending | null; waitMs: number; castMs: number; lastMs: number }`.
  - `waitMs` is the wait left when the current catch appeared. It drives `approach`.
  - `castMs` is the wait left when the current cast began. It drives `castPose`, the cast arc and the sink.
- `trackCatch` sets both `waitMs` and `castMs` when the timer rises (a new cast). When only the catch changes (a travel re-pick, or a reload with different values), it sets only `waitMs`.
- Produces `releaseOffscreen(lastPhase: Phase): boolean` in `choreo.ts`. It is true when `lastPhase` is `'bite'` or `'reeling'`: the fish was on the line, so it landed and must not swim back into view.
- `Chosen` gains `lastPhase: Phase`. The scene updates it every frame while the fish is chosen, and passes it to `releaseOffscreen` when releasing.

- [x] **Step 1: Write failing tests** in `choreo.test.ts`. Update the existing `Track` literals to include `castMs: 0`.
  - `it('a travel re-pick restarts the approach but not the cast')`:
    1. `trackCatch(tr, angler(c, 3000))`
    2. `trackCatch(tr, angler(c, 2000))`
    3. `trackCatch(tr, angler({ ...c, location: 'river' }, 1900))`
    4. Expect `tr.waitMs` to be `1900` and `tr.castMs` to be `3000`.
  - `it('a new cast restarts both')`: after a timer rise to `2800`, expect `tr.castMs` and `tr.waitMs` to both be `2800`.
  - `it('releaseOffscreen is true only for a fish that was on the line')`: true for `'bite'` and `'reeling'`, false for `'waiting'` and `'idle'`.
- [x] **Step 2: Run** `npx vitest run src/scene/choreo.test.ts`. Expected: FAIL. `castMs` is undefined, and `releaseOffscreen` is not exported.
- [x] **Step 3: Implement in `choreo.ts`.**
- [x] **Step 4: Update `FishingScene.ts`.**
  - `pose()` returns `'cast'` when `a.phase === 'waiting' && castPose(tr.castMs, a.timerMs)`.
  - `flyPos()` measures `since` from `tr.castMs`.
  - The release call passes `releaseOffscreen(this.chosen.lastPhase)` instead of `p.phase === 'idle'`.
  - `moveChosen` records `c.lastPhase = p.phase`.
  - Drop the `CAST_MS` import if it is unused.
  - `addSwimmer` bakes and uploads only when `!this.textures.exists(frames[0])`, and reads the sprite width from the texture: `this.textures.get(frames[0]).getSourceImage().width`.
- [x] **Step 5: Run** `npm test && npm run build`. Expected: all pass.
- [x] **Step 6: Manual run.** Run `npm run dev`, then check:
  - **Travel mid-wait** (cast, then pick another place in the Places panel before the bite): the fly stays in the water at the new place with no new cast, and the new place's fish approaches and bites.
  - **Spam-click** through a reel and the recast: the landed fish doesn't reappear swimming away.
  - **Cast pose:** it still shows for the first 0.3 s of each cast.
- [x] **Step 7: Commit** `fix(scene): cast timing survives travel, landed fish never swim off`.

---

## After the last task

Run a whole-branch review of these three commits against this plan. If it's clean, go back to Task 6 Step 9 of `plans/2026-10-17-fishing-scene.md`: the roadmap close-out, then ask the user before merging `fishing-scene` to `master`.
