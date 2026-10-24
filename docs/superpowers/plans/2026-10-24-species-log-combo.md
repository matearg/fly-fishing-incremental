# Species Log and Combo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a species log (the player's first catch of each non-legendary species pops a paper card and pays a bounty, mounted legendaries fill in the rest, the log carries over seasons, and the panel lists it) and a combo (the player's same-species streak raises each fish's value, with a "×N" counter in the top-right).

**Architecture:** The rules go in two small pure modules, `progress/log.ts` and `progress/combo.ts`, called from `sim.ts` `land()` for the player only. `mountTrophy` also logs legendaries. The combo multiplier is baked into the catch's stored `value`, so no sale math changes. The art and sounds go in `src/art/` and `src/audio/` and are reviewed on `/preview.html` before the scene work. The scene's plaque queue becomes one queue for both popup kinds. The panel's log list comes from a pure `ui/log.ts`.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-species-log-combo-design.md`

## Global Constraints

- Branch `feat/shop-upgrades-v2`. Commits follow the mateo-commit rules: one short imperative line, no trailers, no amend.
- `src/game/` stays pure (no Phaser or DOM). All randomness is injected as `rand`.
- New `GameState` fields get defaults in `newGame()`. `SAVE_VERSION` stays 1.
- Only the player's own catches (`!a.auto`) touch the log, the bounty or the combo. The one exception: `mountTrophy` logs a legendary from anyone's catch.
- Legendaries never get a log card or a bounty.
- `pacing.test.ts` stays green: season 1 in 30–60 sim-min, no purchase gap > 8 min, no income jump > 10×.
- The panel shows sale totals only through `saleValue(state, withBonus)`, never its own bonus math.
- Art: grids go through `refine` and are shown with `fineImage`, with anchors in grid units. Chunky text (`addText`) stays at scale 1. No Phaser rotation on pixel art.
- The new art and sounds go through a user review stop on `/preview.html` (Task 4) before Tasks 5–7.
- `npm test` and `npm run build` (tsc + vite) pass at the end of every task. The one exception is `pacing.test.ts` after Tasks 1–2, since the new income can push it out of range until Task 3 retunes it.

## Review Focus

1. **Loading a save, Continue, New Season or an adopted save whose log already has entries**: no card pops up. Covered by `plaque.test.ts` "entries already in the state never pop up" (Task 5).
2. **A helper lands a species the player hasn't logged**: no log entry, no bounty, no combo change. Covered by `sim.test.ts` "a helper's catch never logs, pays or touches the combo" (Task 1, extended in Task 2).
3. **The same species in a later season**: no second bounty, because `speciesLog` carries over. Covered by `prestige.test.ts` "New Season keeps the species log and clears the combo" (Tasks 1–2).
4. **An edited save with junk in `speciesLog` or `combo`** (unknown ids, duplicates, a negative or fractional count): filtered or reset. Covered by `save.test.ts` "keeps only known species in the log, once each, plus mounted trophies" and "resets a bad combo" (Tasks 1–2).
5. **Junk between two same-species fish, with the sorter on or off**: the streak survives. Covered by `sim.test.ts` "junk leaves the streak alone" (Task 2).

---

### Task 1: Species log rules

**Files:**
- Modify: `src/game/data.ts` (add `BOUNTY`)
- Modify: `src/game/state.ts` (`speciesLog` field, default, `Carry`)
- Modify: `src/game/progress/prestige.ts` (`startNewSeason` carries `speciesLog`)
- Create: `src/game/progress/log.ts`
- Modify: `src/game/progress/trophies.ts` (`mountTrophy` logs)
- Modify: `src/game/fishing/sim.ts` (`land`)
- Modify: `src/game/save.ts` (`sanitize`)
- Test: `src/game/progress/log.test.ts` (new), `trophies.test.ts`, `sim.test.ts`, `save.test.ts`, `prestige.test.ts`, `state.test.ts` (its `newGame({...})` literal needs `speciesLog`)

**Interfaces:**
- Produces: `BOUNTY = { mult: 5 }`, `GameState.speciesLog: string[]`, `Carry` = `Pick<GameState, 'licenses' | 'licenseLevels' | 'licenseSpecies' | 'speciesLog'>`. In `progress/log.ts`: `bountyOf(defId: string): number` (= `BOUNTY.mult × baseValue`), `logSpecies(state, defId: string): boolean` (pushes if missing, pays nothing), and `logCatch(state, defId: string): number` (the player's fish: if not legendary and not logged, it pushes and returns the bounty, otherwise it returns 0 and changes nothing). `log.ts` checks the tier from `SPECIES` and imports neither `trophies.ts` nor `economy.ts`, which avoids an import cycle.

- [ ] **Step 1: Write the failing tests**

`log.test.ts`:
```ts
it('bountyOf is mult × base value', () => {
  expect(bountyOf('brookTrout')).toBe(BOUNTY.mult * 8)
})
it('logCatch logs a new non-legendary once and returns its bounty', () => {
  const s = newGame()
  expect(logCatch(s, 'brookTrout')).toBe(bountyOf('brookTrout'))
  expect(logCatch(s, 'brookTrout')).toBe(0)
  expect(s.speciesLog).toEqual(['brookTrout'])
})
it('logCatch ignores legendaries', () => {
  const s = newGame()
  expect(logCatch(s, 'muskie')).toBe(0)
  expect(s.speciesLog).toEqual([])
})
```
`trophies.test.ts`: "a mount logs the legendary, with no bounty": `s.taxidermist = true; mountTrophy(s, 'muskie')` → `s.speciesLog` equals `['muskie']` and `s.money` is 0. A second `mountTrophy` call after `s.trophies = []` (a new season) leaves `speciesLog` at `['muskie']`.

`sim.test.ts`, using the forced-pending pattern of "a hired angler's legendary is mounted…":
- "the player's first catch of a species pays its bounty once": the player is reeling a `brookTrout` pending (value 8). After `tick`, `money === bountyOf('brookTrout')` and `speciesLog` is `['brookTrout']`. A second forced Brook Trout leaves `money` unchanged.
- "a helper's catch never logs, pays or touches the combo": a reeling auto angler lands `brookTrout`, then `speciesLog` is `[]` and `money` is 0. Task 2 adds the combo assertion.

`save.test.ts` "keeps only known species in the log, once each, plus mounted trophies": `speciesLog = ['dace', 'dace', 'nope']`, `trophies = ['muskie']`, and after a round trip `speciesLog` equals `['dace', 'muskie']`. Also "fills an empty log for old saves" (`delete raw.speciesLog` gives `[]`).

`prestige.test.ts` "New Season keeps the species log": `s.speciesLog = ['dace']`, then `startNewSeason(s).speciesLog` equals `['dace']`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game`
Expected: FAIL (`./log` not found, `speciesLog` undefined).

- [ ] **Step 3: Implement**

- `newGame` sets `speciesLog: [...(carry?.speciesLog ?? [])]`. `startNewSeason` passes `speciesLog: state.speciesLog`.
- `mountTrophy` calls `logSpecies(state, defId)` after a successful push.
- In `land()`, before the basket push, for `c.kind === 'fish' && !a.auto`: `earn(state, logCatch(state, c.defId))`. Import `earn` from `economy.ts`, which `sim.ts` already imports from.
- In `sanitize`, after the `trophies` line: `s.speciesLog = [...new Set([...s.speciesLog.filter(id => has(SPECIES, id)), ...s.trophies])]`.

- [ ] **Step 4: Run them to see them pass**

Run: `npm test && npm run build`
Expected: all green. `pacing.test.ts` may fail here, since the bounties are new income. That's fine until Task 3, but note the numbers it prints.

- [ ] **Step 5: Commit** `add the species log and its bounties`

### Task 2: Combo rules

**Files:**
- Modify: `src/game/data.ts` (add `COMBO`)
- Modify: `src/game/state.ts` (`combo` field, default)
- Create: `src/game/progress/combo.ts`
- Modify: `src/game/fishing/sim.ts` (`land`)
- Modify: `src/game/save.ts` (`sanitize`)
- Test: `src/game/progress/combo.test.ts` (new), `sim.test.ts`, `save.test.ts`, `prestige.test.ts`

**Interfaces:**
- Consumes: Task 1's `land()` player branch.
- Produces: `COMBO = { pctStep: 0.1, maxSteps: 10 }`, `GameState.combo: { defId: string | null; count: number }` (default `{ defId: null, count: 0 }`, not in `Carry`). In `progress/combo.ts`: `comboMult(count: number): number` (= `1 + pctStep × min(count - 1, maxSteps)`) and `noteCombo(state, defId: string): number`, which extends or restarts the streak and returns this fish's multiplier.

- [ ] **Step 1: Write the failing tests**

`combo.test.ts`:
```ts
it('comboMult: ×1 for the first fish, +pctStep each, capped at maxSteps', () => {
  expect(comboMult(1)).toBe(1)
  expect(comboMult(2)).toBeCloseTo(1.1)
  expect(comboMult(11)).toBeCloseTo(2)
  expect(comboMult(30)).toBeCloseTo(2)
})
it('noteCombo extends a same-species run and restarts on another species', () => {
  const s = newGame()
  expect([noteCombo(s, 'dace'), noteCombo(s, 'dace')]).toEqual([1, comboMult(2)])
  expect(s.combo).toEqual({ defId: 'dace', count: 2 })
  expect(noteCombo(s, 'brookTrout')).toBe(1)
  expect(s.combo).toEqual({ defId: 'brookTrout', count: 1 })
})
```
`sim.test.ts`:
- "the player's streak raises each fish's stored value": force three `dace` landings, each with pending value 2. The basket values are `[2, 2 * comboMult(2), 2 * comboMult(3)]`.
- "junk leaves the streak alone": dace, then a `can` junk (once with `s.sorter = false` and once with `true`), then dace. `combo.count` ends at 2.
- Extend "a helper's catch never logs, pays or touches the combo": `combo` stays `{ defId: null, count: 0 }`, and the helper's basket value is its pending value.

`save.test.ts` "resets a bad combo": the default comes back for `{ defId: 'nope', count: 2 }`, `{ defId: 'dace', count: -1 }`, `{ defId: 'dace', count: 1.5 }` and a missing `combo`. `{ defId: 'dace', count: 3 }` is kept.

`prestige.test.ts`: rename the Task 1 test to "New Season keeps the species log and clears the combo", and add `s.combo = { defId: 'dace', count: 4 }` → `startNewSeason(s).combo` equals `{ defId: null, count: 0 }`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/game`
Expected: FAIL (`./combo` not found).

- [ ] **Step 3: Implement**

In `land()`'s player-fish branch, before the basket push: `c.value *= noteCombo(state, c.defId)`. The destructured `c` is already a fresh object. Junk never reaches that branch. `sanitize` resets `combo` to `d.combo` unless `combo` is an object whose `defId` is `null` or in `SPECIES`, and whose `count` is a non-negative integer.

- [ ] **Step 4: Run them to see them pass**

Run: `npm test && npm run build`
Expected: green, except for any pacing failure carried over from Task 1.

- [ ] **Step 5: Commit** `add the combo streak`

### Task 3: Pacing

**Files:**
- Modify: `src/game/data.ts` (`BOUNTY`, `COMBO` only, unless the spec's fallback is needed)
- Modify: `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`

- [ ] **Step 1: Measure.** Run `PACING_LOG=1 npx vitest run src/game/pacing.test.ts` with seeds 1–8 the way piece 4 measured them, once as-is, once with `BOUNTY.mult = 0`, and once with `COMBO.pctStep = 0`. Record season 1's length, the max purchase gap and the worst income jump for each.
- [ ] **Step 2: Tune.** If season 1 is under 30 min or a jump is over 10×, lower `BOUNTY.mult` and `COMBO.pctStep`/`maxSteps` before any price. Stop at the first values that are green on every seed.
- [ ] **Step 3: Verify.** Run `npm test`. Expected: all green, including the 4 pacing tests.
- [ ] **Step 4: Record in the roadmap.** Add a "Pacing → After piece 5" entry like piece 4's: season 1 length, max gap, worst jump, final `BOUNTY`/`COMBO` values, and how many minutes each bonus moves season 1. If either bonus had to shrink a lot, say so. Also mark the basket set as dropped (user's decision, 2026-10-24).
- [ ] **Step 5: Commit** `tune the bounty and the combo`

### Task 4: Log card art, sounds, and the review stop

**Files:**
- Create: `src/art/sprites/logcard.ts`, `src/art/sprites/logcard.test.ts`
- Modify: `src/audio/sounds.ts` (`'logged' | 'combo'` in `SoundId` and `SFX`)
- Modify: `src/audio/player.ts` (`play(id, scale = 1, pitch = 1)` passes `pitch` to `this.notes`, which already takes it)
- Modify: `src/audio/cues.ts`, `src/audio/cues.test.ts` (`comboCue`)
- Modify: `src/preview.ts`

**Interfaces:**
- Produces: `logCardBitmap(speciesId: string): Bitmap` and `BOUNTY_STYLE: TextStyle` in `logcard.ts`; `SoundId` gains `'logged'` and `'combo'`; `SoundPlayer.play(id: SoundId, scale?: number, pitch?: number)`; `comboCue(prevCount: number, curCount: number): number | null` in `cues.ts`, which returns the tick's pitch multiplier, or `null` for no tick.

- [ ] **Step 1: Write the failing tests**

`logcard.test.ts`, mirroring `plaque.test.ts`: "bakes for every non-legendary species with the fish opaque at its centre" (ids = `SPECIES` minus `LEGENDARY_IDS`), "different species get different cards", and "no taller than the trophy shield": `logCardBitmap(id).h <= plaqueBitmap('muskie').h` for every id.

`cues.test.ts`:
```ts
it('comboCue ticks when the streak grows past 1, rising a semitone a step, capped', () => {
  expect(comboCue(1, 2)).toBe(1)
  expect(comboCue(2, 3)).toBeCloseTo(2 ** (1 / 12))
  expect(comboCue(10, 11)).toBeCloseTo(2 ** ((COMBO.maxSteps - 1) / 12))
  expect(comboCue(20, 21)).toBeCloseTo(2 ** ((COMBO.maxSteps - 1) / 12))
  expect([comboCue(0, 1), comboCue(3, 1), comboCue(2, 2)]).toEqual([null, null, null])
})
```
The existing `sounds.test.ts` loop over `SFX` covers the two new sounds' note shapes.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/art/sprites/logcard.test.ts src/audio`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **The card:** a pale paper card with a dark outline and a punched hole near one corner, built as a grid through `refine`, with `fishSideBitmaps(id)[0]` blitted on top, like `plaqueBitmap`. The tilt is drawn into the grid (for example, rows sheared a pixel every few rows), never a Phaser rotation. It should read lighter than the wooden shield. `BOUNTY_STYLE` is a green-ish `TextStyle` in the shape of `PLAQUE_STYLE`.
- **The sounds:** `logged` is a short light chime of two or three high notes, under about 300 ms and quieter than `trophy`. `combo` is a single short tick, under 80 ms, played at pitch 1 for count 2.
- **The preview:** add a "Species log cards (2×)" section laid out like the plaques section: each non-legendary card on its place's water, with "NEW SPECIES: <NAME>" in `PLAQUE_STYLE` and "+$<bountyOf>" in `BOUNTY_STYLE` under it. Add a "Combo counter" section of stills: "×2", "×5" and "×11" in `TEXT_YELLOW`, each with a species name in `TEXT_WHITE` under it, right-aligned on water. Add sound buttons `combo ×2`, `combo ×6` and `combo ×11`, which play `combo` at `comboCue(n - 1, n)`. `logged` gets its button from the existing `SFX` loop.

- [ ] **Step 4: Run them to see them pass**

Run: `npm test && npm run build`
Expected: green.

- [ ] **Step 5: Commit** `draw the log cards and add the log and combo sounds`

- [ ] **Step 6: Review stop.** Run `npm run dev`, then ask the user to review `/preview.html` (the cards, the counter stills and the three sounds). Don't start Task 5 until they approve. Fold any changes they ask for into a follow-up commit.

### Task 5: One popup queue for log cards and trophy plaques

**Files:**
- Modify: `src/scene/fishing/plaque.ts`, `src/scene/fishing/plaque.test.ts`
- Modify: `src/scene/fishing/FishingScene.ts` (`drawPlaque` and the plaque images in `create`)

**Interfaces:**
- Consumes: `speciesLog`, `trophies`, `LEGENDARY_IDS`, `bountyOf`, `logCardBitmap`, `BOUNTY_STYLE`, and the `'logged'` sound.
- Produces in `plaque.ts`:
  - `type Popup = { kind: 'log' | 'trophy'; id: string }`
  - `type Shown = Pick<GameState, 'speciesLog' | 'trophies'>`
  - `PlaqueQueue = { seenLog: number; seenTrophies: number; queue: Popup[]; startMs: number | null }`
  - `newPlaqueQueue(s: Shown)`, `resumePlaques(q: PlaqueQueue | null, s: Shown)`, `notePlaques(q, s: Shown): Popup[]`
  - `plaqueFrame(q, nowMs)`, which returns `{ popup: Popup; dy; alpha; started } | null`
  - The timing constants are unchanged.

- [ ] **Step 1: Update the tests**

Port each existing `plaque.test.ts` case to the `Shown` shape (`{ speciesLog: [], trophies: [...] }`), then add:
- "a new log entry queues a log card": `speciesLog` goes from `[]` to `['dace']`, so `notePlaques` returns `[{ kind: 'log', id: 'dace' }]`.
- "a mounted legendary queues only its trophy plaque": `speciesLog: ['muskie'], trophies: ['muskie']` (both new) → `[{ kind: 'trophy', id: 'muskie' }]`.
- "log cards and plaques share one queue, in order": dace logged, then muskie mounted on a later note. The frames show `dace` first, `muskie` after `PLAQUE_MS`.
- "entries already in the state never pop up": `newPlaqueQueue({ speciesLog: ['dace', 'muskie'], trophies: ['muskie'] })`, then `notePlaques` on the same state returns `[]`.
- "resume keeps a cut-short card only if the state still has it": queue a `dace` card, then `resumePlaques(q, { speciesLog: [], trophies: [] })` empties the queue, and `resumePlaques(q, { speciesLog: ['dace'], trophies: [] })` keeps it.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/scene/fishing/plaque.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **`notePlaques`:** in one note, push new log entries first (skipping `LEGENDARY_IDS`), then new trophies. `resumePlaques` keeps a queued entry only if its id is still in the matching list (`speciesLog` for `log`, `trophies` for `trophy`).
- **Scene:** `drawPlaque` keeps its position math. On `started`:
  - A `log` popup uses texture `logcard:<id>` (baked on first use, like `plaque:<id>`), name line `NEW SPECIES: <NAME>` in `PLAQUE_STYLE`, bonus line `+$<fmt(bountyOf(id))>` in `BOUNTY_STYLE`, and plays `'logged'`.
  - A `trophy` popup keeps today's textures and lines and plays `'trophy'`.
  - The bonus image's texture is now set per popup instead of once in `create`. Use the same money format as the panel (`formatNumber`).

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`. Expected: green.

Then run `npm run dev`, start a new game and catch a Puyen. The card drops in under the power-up titles with the chime and a `+$10` line. Open and close the menu: no card replays unless one was cut short.

- [ ] **Step 5: Commit** `show a log card for each new species`

### Task 6: The combo counter on screen

**Files:**
- Modify: `src/scene/fishing/FishingScene.ts`
- Modify: `src/scene/fishing/FishingScene.ts` `SceneHooks.play` and `src/main.ts` (pass `pitch` through)

**Interfaces:**
- Consumes: `GameState.combo`, `comboCue`, `SoundPlayer.play(id, scale, pitch)`.
- Produces: `SceneHooks.play: (id: SoundId, scale?: number, pitch?: number) => void`.

- [ ] **Step 1: Implement**

- **The counter:** two new HUD images in `create`, `comboText` ("×N", `TEXT_YELLOW`) and `comboName` (the species name, `TEXT_WHITE`). Both use `setOrigin(1, 0)`, `setScrollFactor(0)` and depth `Z.hud`. `update` pins them like `placeText` (`x = w - 22`), stacked under it, and shows them only while `s.combo.count >= 2`. Re-texture through `addText` only when the count or species changes, since `addText` caches by text.
- **The tick:** a `prevCombo: number | null` field, cleared to `null` wherever `prevHatchMs` is (the state swap and `wake`). Each frame, when it isn't null, play `comboCue(prevCombo, s.combo.count)`'s pitch through `this.hooks.play('combo', 1, pitch)`. Then store the count.
- **Wiring:** `main.ts` passes `(id, scale, pitch) => sound.play(id, scale, pitch)`.

- [ ] **Step 2: Verify**

Run: `npm test && npm run build`. Expected: green.

Then run `npm run dev` with `?speed=20`. With a dry fly at the Creek, two Puyen in a row show "×2 / PUYEN" under "CREEK" with a tick. Each further Puyen raises the count and the tick's pitch, and a Brook Trout clears the counter. Reloading the page mid-streak shows the counter again with no tick, and the menu button stays clear of it.

- [ ] **Step 3: Commit** `show the combo counter`

### Task 7: The species log in the panel

**Files:**
- Create: `src/ui/log.ts`, `src/ui/log.test.ts`
- Modify: `src/ui/panel.ts` (a new section after Licenses, a toggle action)
- Modify: `src/ui/style.css` only if the place headings need a class (reuse `.label`)
- Modify: `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`

**Interfaces:**
- Consumes: `speciesLog`, `unlockedLocations`, `LOCATIONS`, `SPECIES`, `LEGENDARY_IDS`.
- Produces: `logPlaces(state): LogPlace[]` in `ui/log.ts`, where `LogPlace = { id: LocationId; name: string; logged: number; total: number; locked: boolean; rows: { id: string; logged: boolean; legendary: boolean }[] }`. `rows` is empty when `locked`.

- [ ] **Step 1: Write the failing tests**

`log.test.ts`:
- "lists every place in order with logged over total": on a fresh game, the first entry is `{ id: 'creek', logged: 0, total: 4, locked: false }` with 4 rows, all unlogged. The totals across all places sum to `SPECIES.length`.
- "a locked place with nothing logged is locked with no rows": the River on a fresh game.
- "a locked place with a logged species lists its rows": `speciesLog = ['grayling']` with the River locked gives `locked: false`, `logged: 1` and 3 rows.
- "marks legendary rows": the Big River's `muskie` row has `legendary: true`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/ui/log.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- **The section:** a new panel section `<section><h2>…Species log</h2><div data-sec="log"></div></section>` after Licenses. Reuse an existing `UI_ICONS` entry, as the other headings do.
- **Panel state:** `let logOpen = false`.
- **The section's HTML:** `btn('toggleLog', '', \`Caught ${speciesLog.length} of ${SPECIES.length}\`, { expanded: logOpen, cls: 'wide' })`. When open, follow it with, for each `LogPlace`:
  - a `<p class="label">` heading `<NAME> n/m` (plus ` · locked` when locked)
  - then each row as `<div class="row-catch">`: `catchImg('fish', id)` and the species name when logged, otherwise `???`, or `??? (Taxidermist)` when the row is legendary.
- **The action:** `case 'toggleLog': logOpen = !logOpen; return render()`. Check that `panelCue` gives it the same sound `toggleStack` gets, and add it there if not.

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`. Expected: green.

Then run `npm run dev`. The section opens and closes, its count matches the log, a locked place shows "locked", and keyboard focus stays on the toggle across re-renders.

- [ ] **Step 5: Close the piece on the roadmap.** Mark piece 5 done in the progress table with the spec and plan paths. Note any review stop changes, add a "Deferred minors (from piece 5's review)" list if the review produced any, and update "How to resume".

- [ ] **Step 6: Commit** `list the species log in the panel`, then a separate commit `docs: close piece 5 on the roadmap`.
