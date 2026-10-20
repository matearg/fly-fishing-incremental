# Taxidermist and Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two one-off helpers: the Taxidermist (first legendary of each species becomes a trophy worth +% on every fish sold, with a plaque pop-up) and the Guide (hired anglers get extra odds, and a figure with a hat and net stands on the bank).

**Architecture:** Rules in `src/game/` (state fields, a small `progress/trophies.ts`, a guide odds term passed into `rollCatch`, the trophy multiplier inside `saleValue`). Art in `src/art/` (guide figure, plaque, two icons, one sound), reviewed on `/preview.html` before scene and panel work. The scene gets a pure `spots.ts` (figure positions) and a pure `plaque.ts` (pop-up queue and timing), then draws from them.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-taxidermist-guide-design.md`

## Global Constraints

- Branch `feat/shop-upgrades-v2`. Commits via the mateo-commit rules: one short imperative line, no trailers, no amend.
- `src/game/` stays pure (no Phaser or DOM). All randomness injected as `rand`.
- New `GameState` fields get defaults in `newGame()`; `SAVE_VERSION` stays 1.
- `pacing.test.ts` stays green: season 1 in 30–60 sim-min, no purchase gap > 8 min, no income jump > 10×.
- Every shop item keeps its description once owned.
- The panel shows sale totals only through `saleValue(state, withBonus)`, never its own bonus math.
- Art: grids through `refine`, shown with `fineImage`, anchors in grid units. Chunky text (`addText`) stays at scale 1.
- New art and the new sound go through a user review stop on `/preview.html` (Task 4) before Tasks 5–6.
- `npm run build` (tsc + vite) passes at the end of every task.

## Review Focus

1. **Loading a save with trophies already mounted, or adopting one from another tab**: no pop-up plays. Covered by `plaque.test.ts` "a reset marks existing trophies as seen".
2. **Two legendaries mounted within a second** (a helper and the player landing together): both plaques show, one after the other, each with its own sound. Covered by `plaque.test.ts` "queues a second mount behind the first".
3. **An edited save with junk in `trophies`** (unknown ids, non-legendary ids, duplicates): trophies are filtered, and the bonus never counts junk. Covered by `save.test.ts` "keeps only known legendary trophies, once each".
4. **The Fish buyer selling while trophies exist**: the trophy bonus is paid, the release bonus is not. Covered by `economy.test.ts` "the buyer's sale pays trophies but not the release bonus".
5. **The Guide hired with no hired anglers**: nothing changes for the player's catches. Covered by `sim.test.ts` "castOdds is 0 for the player even with the Guide".

---

### Task 1: Taxidermist rules

**Files:**
- Modify: `src/game/data.ts` (add `TROPHY`, `HELPERS.taxidermist`, `HELPERS.guide`)
- Modify: `src/game/state.ts` (fields + defaults)
- Create: `src/game/progress/trophies.ts`
- Modify: `src/game/progress/economy.ts` (`saleValue`)
- Modify: `src/game/progress/helpers.ts` (`HelperKind`, `baseCost`)
- Modify: `src/game/fishing/sim.ts` (`land`)
- Modify: `src/game/save.ts` (`sanitize`)
- Test: `src/game/progress/trophies.test.ts` (new), `src/game/progress/economy.test.ts`, `src/game/fishing/sim.test.ts`, `src/game/save.test.ts`, `src/game/progress/prestige.test.ts`

**Interfaces:**
- Produces: `TROPHY = { pctEach: 0.1 }`; `HELPERS.taxidermist = { cost: 25_000 }`, `HELPERS.guide = { cost: 8_000 }`; `GameState.taxidermist: boolean`, `GameState.guide: boolean`, `GameState.trophies: string[]`; `HelperKind` gains `'taxidermist' | 'guide'`; `LEGENDARY_IDS: string[]` and `mountTrophy(state, defId: string): boolean`, `trophyMult(state): number` in `progress/trophies.ts`.

The Guide's state field and helper kind land here too, since `HelperKind` and the panel's `Record<HelperKind, …>` maps change together. Its odds effect is Task 2.

`HelperKind` widening breaks the type of `HELPER_LABELS`, `HELPER_DESC` (`src/ui/panel.ts`) and `HELPER_ICONS` (`src/art/icons.ts`). In this task give them placeholder entries so the build passes: labels "Taxidermist" and "Guide", descriptions built from the constants (`Mounts your first legendary of each species: +${pct(TROPHY.pctEach)} on every fish sold`, `Your hired anglers find rarer fish: odds +${pct(GUIDE.oddsBonus)}` once Task 2 adds `GUIDE`, a fixed string until then). For icons, temporarily reuse `HELPER_ICONS.buyer` for both. Task 4 draws the real icons.

- [ ] **Step 1: Write the failing tests**

`trophies.test.ts`:
```ts
it('LEGENDARY_IDS lists every legendary species', () => {
  expect(LEGENDARY_IDS.sort()).toEqual(['arcticChar', 'ghostSturgeon', 'lakeSturgeon', 'muskie', 'tigerTrout'])
})
it('mounts only with the Taxidermist, only legendaries, once per species', () => {
  const s = newGame()
  expect(mountTrophy(s, 'muskie')).toBe(false)
  s.taxidermist = true
  expect(mountTrophy(s, 'muskie')).toBe(true)
  expect(mountTrophy(s, 'muskie')).toBe(false)
  expect(mountTrophy(s, SPECIES.find(d => d.tier === 'rare')!.id)).toBe(false)
  expect(s.trophies).toEqual(['muskie'])
})
it('trophyMult adds pctEach per trophy', () => {
  const s = newGame(); s.trophies = ['muskie', 'arcticChar']
  expect(trophyMult(s)).toBeCloseTo(1 + 2 * TROPHY.pctEach)
})
```
`economy.test.ts`:
```ts
it('trophies raise every fish in saleValue, not junk, and multiply with the release bonus', () => {
  const s = newGame(); s.trophies = ['muskie']; s.releaseBonus = 0.5
  s.basket = [{ id: 1, kind: 'fish', defId: 'muskie', value: 100, size: 1 }, { id: 2, kind: 'junk', defId: 'can', value: -5, size: 1 }]
  expect(saleValue(s)).toBeCloseTo(100 * 1.1 - 5)
  expect(saleValue(s, true)).toBeCloseTo(100 * 1.5 * 1.1 - 5)
})
it("the buyer's sale pays trophies but not the release bonus", () => {
  const s = newGame(); s.trophies = ['muskie']; s.releaseBonus = 0.5
  s.basket = [{ id: 1, kind: 'fish', defId: 'muskie', value: 100, size: 1 }]
  expect(sellAll(s)).toBeCloseTo(110)
  expect(s.releaseBonus).toBe(0.5)
})
```
`sim.test.ts`:
```ts
it("a hired angler's legendary is mounted and still goes to the basket", () => {
  const s = newGame(); s.taxidermist = true
  s.anglers.push({ auto: true, phase: 'reeling', timerMs: 1, fly: { patternId: 'basicDry', materialIds: [], wearLeft: 3 }, pending: { kind: 'fish', defId: 'muskie', value: 2500, size: 1, location: s.location } })
  tick(s, 10, seqRand(0.5))
  expect(s.trophies).toEqual(['muskie'])
  expect(s.basket.map(c => c.defId)).toEqual(['muskie'])
})
```
`save.test.ts`:
```ts
it('keeps only known legendary trophies, once each', () => {
  const s = newGame(); s.trophies = ['muskie', 'muskie', 'nope', SPECIES.find(d => d.tier === 'rare')!.id, 'arcticChar']
  expect(parseSave(serialize(s))!.trophies).toEqual(['muskie', 'arcticChar'])
})
it('an old save without the new fields loads with defaults', () => {
  const raw = JSON.parse(serialize(newGame())); delete raw.taxidermist; delete raw.guide; delete raw.trophies
  const s = parseSave(JSON.stringify(raw))!
  expect([s.taxidermist, s.guide, s.trophies]).toEqual([false, false, []])
})
```
`prestige.test.ts`: a New Season from a state with `taxidermist`, `guide` set and two trophies leaves all three at their defaults.

`helpers.test.ts`: `helperCost(s, 'taxidermist')` is `price(s, 25_000)` before and `null` after `buyHelper(s, 'taxidermist')`; the same for `'guide'` at 8,000; `buyHelper` sets `s.taxidermist` / `s.guide` to `true`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/game`
Expected: FAIL (missing exports and fields).

- [ ] **Step 3: Implement**

- `state.ts`: add `taxidermist: boolean; guide: boolean; trophies: string[]` (a comment: trophies are species ids, in mount order) with defaults `false, false, []`.
- `trophies.ts`: `LEGENDARY_IDS` from `SPECIES` (tier `legendary`). `mountTrophy` returns `false` unless the Taxidermist is owned, `defId` is in `LEGENDARY_IDS` and not yet in `trophies`. `trophyMult = 1 + trophies.length * TROPHY.pctEach`.
- `economy.ts` `saleValue`: fish are `value × (1 + bonus) × trophyMult(state)`; junk unchanged.
- `helpers.ts`: `'taxidermist'` and `'guide'` are one-offs like `buyer` (`state[kind] ? null : HELPERS[kind].cost * discount`). `buyHelper` already sets `state[kind] = true`.
- `sim.ts` `land`: after the basket push, `if (c.kind === 'fish') mountTrophy(state, c.defId)`.
- `save.ts` `sanitize`: `s.trophies = [...new Set(s.trophies.filter(id => LEGENDARY_IDS.includes(id)))]`. A non-array throws inside `sanitize` and `parseSave` returns `null`, as for `rods`.

- [ ] **Step 4: Run the tests and the build**

Run: `npx vitest run src/game && npm run build`
Expected: PASS. (`pacing.test.ts` may change numbers but must stay green, since the bot doesn't buy the new helpers yet.)

- [ ] **Step 5: Commit**

`git commit -m "add the Taxidermist and its trophies"`

---

### Task 2: Guide odds

**Files:**
- Modify: `src/game/data.ts` (`GUIDE`)
- Modify: `src/game/fishing/catch.ts` (`rollCatch`)
- Modify: `src/game/fishing/sim.ts` (`castOdds`, `pick`)
- Modify: `src/ui/panel.ts` (Guide description now from `GUIDE`)
- Test: `src/game/fishing/catch.test.ts`, `src/game/fishing/sim.test.ts`

**Interfaces:**
- Consumes: `GameState.guide` (Task 1).
- Produces: `GUIDE = { oddsBonus: 0.3 }`; `rollCatch(state, fly, rand, rod = RODS[0], chum = false, extraOdds = 0)`; `castOdds(state, a: Angler): number` exported from `sim.ts`.

- [ ] **Step 1: Write the failing tests**

`catch.test.ts`:
```ts
it('extraOdds adds to the fly odds bonus, so legendaries come up more often', () => {
  const s = newGame(); s.location = 'bigRiver'; s.unlockedLocations.push('river', 'bigRiver')
  const fly = { patternId: 'woollyBugger', materialIds: [], wearLeft: 5 }
  const count = (extra: number) => { const r = lcg(7); let n = 0; for (let i = 0; i < 4000; i++) if (rollCatch(s, fly, r, RODS[0], false, extra).defId === 'muskie') n++; return n }
  expect(count(GUIDE.oddsBonus)).toBeGreaterThan(count(0) * 1.3)
})
```
`sim.test.ts`:
```ts
it('castOdds gives hired anglers the Guide bonus', () => {
  const s = newGame(); const helper = { auto: true, phase: 'idle', timerMs: 0, fly: null, pending: null } as Angler
  expect(castOdds(s, helper)).toBe(0)
  s.guide = true
  expect(castOdds(s, helper)).toBe(GUIDE.oddsBonus)
})
it('castOdds is 0 for the player even with the Guide', () => {
  const s = newGame(); s.guide = true
  expect(castOdds(s, s.anglers[0])).toBe(0)
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/game/fishing`
Expected: FAIL.

- [ ] **Step 3: Implement**

`rollCatch` uses `st.oddsBonus + extraOdds` in `speciesWeight`. `castOdds` returns `a.auto && state.guide ? GUIDE.oddsBonus : 0`. `pick` passes `castOdds(state, a)`. Update the `rollCatch` header comment for the new term.

- [ ] **Step 4: Run the tests and the build**

Run: `npx vitest run src/game && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "give hired anglers the Guide's odds"`

---

### Task 3: Pacing

**Files:**
- Modify: `src/game/pacing.test.ts:33` (one-off helper list)
- Modify: `src/game/data.ts` (only if retuning)
- Modify: `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md` (pacing line for piece 4)

- [ ] **Step 1: Add the new helpers to the bot**

Change `['bulkTrash', 'sorter', 'buyer', 'release']` to also include `'taxidermist'` and `'guide'`.

- [ ] **Step 2: Run the bot with the log**

Run: `PACING_LOG=1 npx vitest run src/game/pacing.test.ts`
Expected: PASS, with a timeline showing when each new helper is bought. If it fails, retune `HELPERS.taxidermist.cost`, `HELPERS.guide.cost`, `TROPHY.pctEach` and `GUIDE.oddsBonus` in `data.ts` until it passes. Prefer moving prices. If a bonus has to drop below half its starting value, stop and tell the user (spec: don't silently make them meaningless).

- [ ] **Step 3: Measure what the hires move**

Run seeds 1–8 with and without the two hires in the bot's list, the same way piece 2 measured gear. Write the result into the roadmap's Pacing bullet as "After piece 4: season 1 is X sim-min (max purchase gap Y min, worst income jump Z×) …", with the final prices and bonuses.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "price the Taxidermist and the Guide"`

---

### Task 4: Art, sound and the review stop

**Files:**
- Modify: `src/art/sprites/figures.ts` (`guideBitmap`)
- Create: `src/art/sprites/plaque.ts`
- Create: `src/scene/fishing/spots.ts`
- Modify: `src/art/places.ts` (River and Mountain Lake `shoreX` 70 → 76)
- Modify: `src/art/icons.ts` (`HELPER_ICONS.taxidermist`, `HELPER_ICONS.guide`)
- Modify: `src/audio/sounds.ts` (`trophy`)
- Modify: `src/preview.ts`
- Test: `src/art/sprites/figures.test.ts`, `src/art/sprites/plaque.test.ts` (new), `src/scene/fishing/spots.test.ts` (new), `src/audio/sounds.test.ts` (already loops over `SFX`), `src/art/icons.test.ts` (check it loops over `HELPER_ICONS`)

**Interfaces:**
- Produces:
  - `guideBitmap(): Bitmap` in `figures.ts`, the same size as the other figure bitmaps, using the shared `BODY`, `BODY_X`, `FEET_Y`. A guide palette (vest/shirt and hat colours unlike the red angler and blue helper) and a landing net (hoop and mesh on a short handle) in place of the rod. Built from `poseGrid('idle', false)` through `refine`. Draw the net in the grid or fine after refining (like the rod); your choice. Don't add `'guide'` to `FigureKind`: it has one bitmap, not poses.
  - `plaqueBitmap(speciesId: string): Bitmap` in `plaque.ts`: a shield-shaped wooden board grid run through `refine`, with `fishSideBitmaps(speciesId)[0]` blitted centred on it. World size about 40×24 (a legendary side fish is 24×11).
  - `PLAQUE_STYLE: TextStyle` in `plaque.ts`, for the two text lines.
  - `figureSpots(look: PlaceLook): { playerX: number; helperX: number; guideX: number }` in `spots.ts`. These are body-start x values in world units: `playerX = look.dock ? look.shoreX + 70 : look.shoreX - 34`, `helperX = playerX - 24`, `guideX = helperX - 16`. `BODY_W = 14` exported alongside.
  - `SoundId` gains `'trophy'`: a short fanfare in `SFX`, distinct from `catchBig` and `season`.

- [ ] **Step 1: Write the failing tests**

`spots.test.ts`:
```ts
it('the Guide stands fully on canvas and clear of the helper at every place', () => {
  for (const l of LOCATIONS) {
    const { helperX, guideX } = figureSpots(placeLook(l.id))
    expect(guideX, l.id).toBeGreaterThanOrEqual(0)
    expect(guideX + BODY_W, l.id).toBeLessThanOrEqual(helperX)
  }
})
it('at the Great Lake all three stand on the dock', () => {
  const look = placeLook('greatLake')
  expect(figureSpots(look).guideX).toBeGreaterThanOrEqual(look.shoreX - 20) // past the bank's shoulder, on the deck
})
```
In `figures.test.ts`: `guideBitmap()` has the same `w×h` as `figureBitmaps('angler').idle`, and its feet sit on the bottom row (like the angler test). It has no pixel of any `ROD_LOOKS` rod colour.
`plaque.test.ts`: `plaqueBitmap` bakes for every id in `LEGENDARY_IDS` without throwing, and has opaque pixels at its centre (the fish).

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/art src/scene src/audio`
Expected: FAIL (`spots.ts`, `plaque.ts` and `guideBitmap` missing; the shoreX check fails on River and Mountain Lake).

- [ ] **Step 3: Implement the art, the spots and the sound**

- In `places.ts`, River and Mountain Lake `shoreX` goes from 70 to 76.
- Replace the placeholder `HELPER_ICONS.taxidermist` (e.g. a small plaque with a fish) and `HELPER_ICONS.guide` (e.g. a hat over a net) from Task 1 with real 16-wide grids in the existing icon style.
- `FishingScene.buildPlace` keeps its own spot math until Task 5, so it can be reviewed against the preview first.

- [ ] **Step 4: Add preview sections**

In `src/preview.ts`:
- "Figures on each bank" uses `figureSpots` and adds the Guide at `guideX`, with and without the helper, at every place.
- New section "Taxidermist plaques (2×)": `plaqueBitmap` for each id in `LEGENDARY_IDS`, each with its name and "+10% SALES" in `PLAQUE_STYLE` under it, laid out as the scene will show them.
- The sound buttons already come from `SFX`, so `trophy` shows up on its own.
- The helper icons already come from `HELPER_ICONS`.

- [ ] **Step 5: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "draw the Guide, the plaques and the trophy sound"`

- [ ] **Step 7: REVIEW STOP: the user reviews `/preview.html`**

Run `npm run dev`, then ask the user to open http://localhost:5173/preview.html and check: the Guide at every bank (River and Mountain Lake redrawn at 76, props included), the plaques, both helper icons, and the `trophy` sound. Apply their changes, re-run step 5, commit, and wait for an explicit approval before Task 5.

---

### Task 5: Scene (Guide figure and plaque pop-up)

**Files:**
- Create: `src/scene/fishing/plaque.ts`
- Modify: `src/scene/fishing/FishingScene.ts`
- Test: `src/scene/fishing/plaque.test.ts` (new)

**Interfaces:**
- Consumes: `figureSpots`, `guideBitmap`, `plaqueBitmap`, `PLAQUE_STYLE`, `'trophy'` (Task 4); `GameState.trophies`, `GameState.guide` (Task 1).
- Produces, in `scene/fishing/plaque.ts` (pure, no Phaser):
  - `PLAQUE_MS = 4000`, `PLAQUE_IN_MS = 400`, `PLAQUE_OUT_MS = 600`
  - `interface PlaqueQueue { seen: number; queue: string[]; startMs: number | null }`
  - `newPlaqueQueue(trophies: string[]): PlaqueQueue`: seen = `trophies.length`, so existing trophies never pop.
  - `notePlaques(q: PlaqueQueue, trophies: string[]): string[]`: queues ids past `q.seen` and returns the newly queued ones.
  - `plaqueFrame(q: PlaqueQueue, nowMs: number): { id: string; dy: number; alpha: number; started: boolean } | null`: starts the head when `startMs` is null (`started: true` on that frame only, so the scene plays `trophy` once), drops in over `PLAQUE_IN_MS` (`dy` from a negative offset to 0), holds, then fades over the last `PLAQUE_OUT_MS`, shifts the queue when done, and returns `null` when empty.

- [ ] **Step 1: Write the failing tests**

`plaque.test.ts`:
```ts
it('a reset marks existing trophies as seen', () => {
  const q = newPlaqueQueue(['muskie'])
  expect(notePlaques(q, ['muskie'])).toEqual([])
  expect(plaqueFrame(q, 0)).toBeNull()
})
it('a new trophy starts once, drops in, holds and fades out', () => {
  const q = newPlaqueQueue([]); notePlaques(q, ['muskie'])
  expect(plaqueFrame(q, 1000)).toMatchObject({ id: 'muskie', started: true, alpha: 1 })
  expect(plaqueFrame(q, 1000 + PLAQUE_IN_MS)).toMatchObject({ started: false, dy: 0, alpha: 1 })
  expect(plaqueFrame(q, 1000 + PLAQUE_MS - PLAQUE_OUT_MS / 2)!.alpha).toBeCloseTo(0.5, 1)
  expect(plaqueFrame(q, 1000 + PLAQUE_MS)).toBeNull()
})
it('queues a second mount behind the first', () => {
  const q = newPlaqueQueue([]); notePlaques(q, ['muskie', 'arcticChar'])
  plaqueFrame(q, 0)
  expect(plaqueFrame(q, PLAQUE_MS - 1)!.id).toBe('muskie')
  plaqueFrame(q, PLAQUE_MS)
  expect(plaqueFrame(q, PLAQUE_MS + 1)).toMatchObject({ id: 'arcticChar', started: true })
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/scene/fishing/plaque.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `plaque.ts`**

- [ ] **Step 4: Wire `FishingScene`**

- `buildPlace` takes `playerX`, `helperX` from `figureSpots(look)` and stores `guideX` in `Place`.
- The Guide: one `fineImage` of a `fig:guide` texture (`guideBitmap()`), depth `Z.helper - 0.1`, at `(place.guideX - BODY_X, GROUND_Y - FEET_Y)`, visible iff `s.guide`.
- The plaque: one board image per species (texture `plaque:<id>`, baked on first use), and two `addText` lines (species name, `+${Math.round(TROPHY.pctEach * 100)}% SALES`) in `PLAQUE_STYLE`, at `Z.hud`. Centred on the crop width `w` like `drawPowerups`, with the top just below the last visible power-up title (24, plus 20 per title on). Apply `dy` and `alpha` each frame.
- Memory: a `plaques: PlaqueQueue` field. Re-create it with `newPlaqueQueue(s.trophies)` when `s !== this.cueState` (next to the existing reset) and in the `wake` handler. Each `update`: `notePlaques`, then `plaqueFrame(this.plaques, time)`. On `started`, `this.hooks.play('trophy')`.

- [ ] **Step 5: Run the tests and the build, then check in the browser**

Run: `npm test && npm run build`
Expected: PASS.
Then `npm run dev` and open `http://localhost:5173/?speed=20`. In devtools, use the save to set `taxidermist: true`, `guide: true` and a muskie pending on the player's line at Big River. Check that the plaque drops in with the fanfare, that reloading doesn't replay it, that the Guide stands at every place, and that lines pass in front of it.

- [ ] **Step 6: Commit**

`git commit -m "show the Guide and the trophy plaques"`

---

### Task 6: Panel

**Files:**
- Modify: `src/ui/panel.ts` (helper rows, Sell all tag)

**Interfaces:**
- Consumes: `LEGENDARY_IDS`, `trophyMult` (Task 1); `TROPHY`, `GUIDE` (Tasks 1–2).

- [ ] **Step 1: Owned Taxidermist row shows the count**

The owned row keeps `HELPER_DESC.taxidermist` and appends `Trophies: ${s.trophies.length} of ${LEGENDARY_IDS.length}`. The `owned(...)` helper already takes a description, so pass the joined string.

- [ ] **Step 2: Sell all tag**

After the existing release tag, add ` Trophies +${pct(trophyMult(s) - 1)}` while `s.trophies.length > 0`. The total stays `saleValue(s, true)`.

- [ ] **Step 3: Build and check in the browser**

Run: `npm run build`, then `npm run dev`. With the edited save from Task 5, check both helper rows (unowned with price, owned with description), the trophy count, and the Sell all tag next to a release tag.

- [ ] **Step 4: Commit**

`git commit -m "show the trophies in the panel"`

---

### Task 7: Close piece 4 on the roadmap

**Files:**
- Modify: `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`

- [ ] **Step 1: Update the roadmap**

- Mark piece 4 done, pointing to the spec and this plan.
- Replace "Details not brainstormed yet" for piece 4 with the settled rules: one-off hires; trophies on landing, by anyone, after hiring, fish kept; +% on every fish sold, multiplying with release; Guide odds for hired anglers only; Guide figure with hat and net, no animation, shown once bought; River and Mountain Lake banks widened to 76.
- Add the user's deferred idea: a trophies menu, later.
- Point "How to resume" at piece 5.
- Add any minors the final review defers.

- [ ] **Step 2: Commit**

`git commit -m "docs: close piece 4 on the roadmap"`
