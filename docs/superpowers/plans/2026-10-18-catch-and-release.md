# Catch & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Catch & Release helper (hand-trashed fish add a capped bonus to the next manual Sell all), a free pause toggle for the Fish buyer, descriptions that stay on owned items, and a pricier Junk sorter.

**Architecture:** Rules live in `src/game/` (pure, Node-tested): a new one-off `HelperKind` `'release'`, two new state fields, the bonus math in `progress/economy.ts`, the pause check in `fishing/sim.ts`. `src/ui/panel.ts` only shows the bonus, the toggle and the descriptions, and dispatches. One new pixel icon goes through the `/preview.html` review stop.

**Tech Stack:** TypeScript, Vitest, Phaser 4 (untouched here), HTML panel.

**Spec:** `docs/superpowers/specs/2026-10-18-catch-and-release-design.md`

## Global Constraints

- Rules stay in `src/game/`; the panel never computes the bonus itself.
- New `GameState` fields get defaults in `newGame()`; `SAVE_VERSION` stays 1.
- `trash`, `trashStack` keep returning `boolean`; `sellAll` keeps returning the money earned.
- Starting numbers (all in `data.ts`, tunable only by Task 5's pacing): `RELEASE = { pctPerUnit: 0.02, cap: 1 }`, `HELPERS.release.cost = 1500`, `HELPERS.sorter.cost = 1000`.
- Copy: helper name "Catch & Release"; its description "Trashed fish add to your next Sell all, up to +100%".
- Commits: one short imperative line, no trailers (user's rule).
- Every task ends with `npm test` and `npm run build` green.

## Review Focus

- A fish caught at another place (basket kept across travel) → its bonus uses its own species' location, not the current one. Test in Task 2.
- Sell all on a basket with only junk while a bonus is waiting → the bonus stays. Test in Task 2.
- Trashing while already at +100% → stays exactly at the cap, never above. Test in Task 2.
- A save edited or corrupted to `releaseBonus: NaN`, negative or 50 → loads clamped to 0…cap. Test in Task 3.
- New Season while the Buyer is paused and a bonus is waiting → new season starts unpaused with 0 bonus. Test in Task 3.

---

### Task 1: Catch & Release helper, state fields, sorter reprice

**Files:**
- Modify: `src/game/data.ts` (`HELPERS`, new `RELEASE`)
- Modify: `src/game/state.ts` (`GameState`, `newGame`)
- Modify: `src/game/progress/helpers.ts` (`HelperKind`, `helperCost`)
- Modify: `src/art/icons.ts` (`HELPER_ICONS.release` placeholder), `src/art/icons.test.ts:21`
- Modify: `src/ui/panel.ts` (`HELPER_LABELS.release`)
- Test: `src/game/progress/helpers.test.ts`

**Interfaces:**
- Produces: `HelperKind` includes `'release'`; `GameState.release: boolean` (owned), `GameState.releaseBonus: number` (fraction, 0…`RELEASE.cap`), `GameState.buyerPaused: boolean`; `RELEASE: { pctPerUnit: number; cap: number }`; `HELPERS.release: { cost: number }`.

- [ ] **Step 1: Write the failing test** in `helpers.test.ts`:

```ts
it('catch & release is a one-off helper', () => {
  const s = newGame()
  expect(s.release).toBe(false)
  expect(helperCost(s, 'release')).toBe(HELPERS.release.cost)
  s.money = HELPERS.release.cost
  expect(buyHelper(s, 'release')).toBe(true)
  expect(s.release).toBe(true)
  expect(s.money).toBe(0)
  expect(helperCost(s, 'release')).toBeNull()
})
it('the junk sorter costs over 3× bulk trash', () => {
  expect(HELPERS.sorter.cost).toBeGreaterThan(3 * HELPERS.bulkTrash.cost)
})
```

- [ ] **Step 2: Run** `npx vitest run src/game/progress/helpers.test.ts` — expect FAIL (`release` undefined).
- [ ] **Step 3: Implement.** Add the fields with defaults `release: false, releaseBonus: 0, buyerPaused: false` to `GameState` and `newGame()`. Add `'release'` to `HelperKind` and a `case 'release'` in `helperCost` like `buyer`; `buyHelper`'s `state[kind] = true` already covers it. Add `release: { cost: 1500 }`, set `sorter.cost` to 1000, and add `export const RELEASE = { pctPerUnit: 0.02, cap: 1 }` with a one-line comment on what a unit is. Give `HELPER_ICONS` `release: TRASH_CAN` with the comment `// placeholder until Task 6's icon is approved`, add `'release'` to the list in `icons.test.ts:21`, and add `release: 'Catch & Release'` to `HELPER_LABELS`.
- [ ] **Step 4: Run** `npm test && npm run build` — expect PASS, except `pacing.test.ts` may fail (the sorter price moved); if so note the numbers and leave it for Task 5.
- [ ] **Step 5: Commit** `git commit -m "add catch and release helper and reprice sorter"`

### Task 2: Release bonus rules

**Files:**
- Modify: `src/game/progress/economy.ts` (`trash`, `trashStack`, `sellAll`, new `releaseBonusOf`)
- Modify: `src/game/fishing/sim.ts` (buyer keeps calling `sellAll(state)` — no bonus)
- Test: `src/game/progress/economy.test.ts`

**Interfaces:**
- Consumes: Task 1's fields and `RELEASE`.
- Produces: `releaseBonusOf(c: CatchItem): number` — the fraction one trashed catch adds: `RELEASE.pctPerUnit × (species.baseValue × c.size) / cheapest`, where `cheapest` is the lowest `baseValue` in `SPECIES` with that species' `location` (licensed or not); `0` for junk and unknown ids. `sellAll(state: GameState, withBonus = false): number`.

- [ ] **Step 1: Write the failing tests** (use real species ids; `fish(id, defId, size)` builds a `CatchItem` with `value = baseValue × size`):

```ts
describe('catch & release', () => {
  it('bonus is 2% per multiple of the place’s cheapest fish', () => {
    expect(releaseBonusOf(fish(1, 'dace', 1))).toBeCloseTo(0.02)
    expect(releaseBonusOf(fish(1, 'brownTrout', 1))).toBeCloseTo(0.30)
    expect(releaseBonusOf(fish(1, 'whitefish', 1.5))).toBeCloseTo(0.03)
    expect(releaseBonusOf({ ...fish(1, 'dace', 1), kind: 'junk', defId: 'tire' })).toBe(0)
  })
  it('same bonus per dollar for any species at one place', () => {
    const a = fish(1, 'creekChub', 1.3), b = fish(2, 'brownTrout', 1.7)
    expect(releaseBonusOf(a) / a.value).toBeCloseTo(releaseBonusOf(b) / b.value)
  })
  it('only counts once owned, and only fish', () => {
    const s = newGame()
    s.basket = [fish(1, 'brownTrout', 1), { ...item(2, -2, 'junk'), defId: 'boot' }]
    trash(s, 1); expect(s.releaseBonus).toBe(0)
    s.release = true
    s.basket.push(fish(3, 'brownTrout', 1))
    trash(s, 2); expect(s.releaseBonus).toBe(0)
    trash(s, 3); expect(s.releaseBonus).toBeCloseTo(0.30)
  })
  it('trash all adds every fish and stops at the cap', () => {
    const s = newGame(); s.release = true; s.bulkTrash = true
    s.basket = Array.from({ length: 5 }, (_, i) => fish(i + 1, 'brownTrout', 1))
    expect(trashStack(s, 'fish', 'brownTrout')).toBe(true)
    expect(s.releaseBonus).toBe(RELEASE.cap)
    s.basket = [fish(9, 'brownTrout', 1)]; trash(s, 9)
    expect(s.releaseBonus).toBe(RELEASE.cap)
  })
  it('a fish from another place uses its own place’s cheapest fish', () => {
    const s = newGame(); s.release = true; s.location = 'greatLake'
    s.basket = [fish(1, 'brownTrout', 1)]; trash(s, 1)
    expect(s.releaseBonus).toBeCloseTo(0.30)
  })
  it('manual sell multiplies fish only, then resets', () => {
    const s = newGame(); s.releaseBonus = 0.5
    s.basket = [item(1, 10), item(2, -2, 'junk')]
    expect(sellAll(s, true)).toBe(13)
    expect(s.releaseBonus).toBe(0)
  })
  it('a junk-only sale and the buyer’s sale keep the bonus', () => {
    const s = newGame(); s.releaseBonus = 0.5
    s.basket = [item(1, -2, 'junk')]; sellAll(s, true)
    expect(s.releaseBonus).toBe(0.5)
    s.basket = [item(2, 10)]
    expect(sellAll(s)).toBe(10)
    expect(s.releaseBonus).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/game/progress/economy.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `releaseBonusOf`, have `trash` and `trashStack` add each removed fish's bonus when `state.release` (clamped with `Math.min(RELEASE.cap, …)`), and `sellAll(state, withBonus = false)`: when `withBonus` and the basket has a fish, earn `fishSum × (1 + releaseBonus) + junkSum` and reset the bonus; otherwise as today. The existing `sellAll(s)` tests and the buyer in `sim.ts` stay unchanged.
- [ ] **Step 4: Run** `npm test && npm run build` — expect PASS (pacing as in Task 1).
- [ ] **Step 5: Commit** `git commit -m "add the catch and release bonus to trash and sell"`

### Task 3: Buyer pause, save and season edges

**Files:**
- Modify: `src/game/fishing/sim.ts` (buyer branch in `tick`)
- Modify: `src/game/progress/helpers.ts` (new `toggleBuyerPause`)
- Modify: `src/game/save.ts` (`sanitize`)
- Test: `src/game/progress/helpers.test.ts`, `src/game/save.test.ts`, `src/game/progress/prestige.test.ts`

**Interfaces:**
- Produces: `toggleBuyerPause(state: GameState): boolean` — flips `buyerPaused`; returns `false` (and changes nothing) without a Buyer.

- [ ] **Step 1: Write the failing tests:**

```ts
// helpers.test.ts
it('a paused buyer neither sells nor advances its timer', () => {
  const s = newGame(); s.buyer = true
  expect(toggleBuyerPause(s)).toBe(true); expect(s.buyerPaused).toBe(true)
  s.basket = [{ id: 1, kind: 'fish', defId: 'dace', value: 5, size: 1 }]
  run(s, TIMING.buyerIntervalMs * 2)
  expect(s.basket).toHaveLength(1); expect(s.buyerTimerMs).toBe(0)
  toggleBuyerPause(s); run(s, TIMING.buyerIntervalMs + 100)
  expect(s.basket).toHaveLength(0)
})
it('no buyer, no pause', () => {
  const s = newGame()
  expect(toggleBuyerPause(s)).toBe(false); expect(s.buyerPaused).toBe(false)
})
// save.test.ts
it('old saves get the new fields; the bonus is clamped', () => { /* serialize newGame(), delete release/releaseBonus/buyerPaused, parse → false/0/false; then releaseBonus NaN → 0, -1 → 0, 50 → RELEASE.cap */ })
// prestige.test.ts
it('a new season starts unpaused with no bonus', () => { /* buyer, buyerPaused true, releaseBonus 0.4, release true → startNewSeason → buyerPaused false, releaseBonus 0, release false */ })
```

- [ ] **Step 2: Run** the three files — expect FAIL.
- [ ] **Step 3: Implement:** `tick` only runs the buyer when `state.buyer && !state.buyerPaused`; `toggleBuyerPause` in `helpers.ts`; in `sanitize`, `s.releaseBonus = Number.isFinite(s.releaseBonus) ? Math.min(RELEASE.cap, Math.max(0, s.releaseBonus)) : 0`. The season case needs no code (`newGame(carry)`), only the test.
- [ ] **Step 4: Run** `npm test && npm run build` — expect PASS (pacing as in Task 1).
- [ ] **Step 5: Commit** `git commit -m "let the fish buyer be paused"`

### Task 4: Panel: bonus on Sell all, pause toggle, descriptions on owned items

**Files:**
- Modify: `src/ui/panel.ts`
- Modify: `src/ui/style.css`

**Interfaces:**
- Consumes: `sellAll(s, true)`, `toggleBuyerPause`, `releaseBonusOf` not needed (the panel reads `s.releaseBonus`).

No unit-test harness exists for `panel.ts`; this task is checked by hand in Step 3.

- [ ] **Step 1: Implement.**
  - `owned(ico, label, stamp?, desc?)`: when `desc` is given, render it as `<small>` under the label, as in buttons.
  - Pull the pattern and material description strings (today inline in the `shop` section) into `patternDesc(p)` / `materialDesc(m)`, used by both the button and the owned row. Owned rows keep "tie $X" and drop only the unlock price.
  - `HELPER_DESC: Record<HelperKind, string>` with the spec's texts (Hire angler "Fishes on its own with flies from the box", Tying bench "Ties flies from your recipe; more benches tie faster", Bulk trash "Adds Trash all to an open stack", Junk sorter "Throws junk away before it reaches the basket", Fish buyer "Sells the basket every 5 s; can be paused", Catch & Release "Trashed fish add to your next Sell all, up to +100%"), shown on both the hire button and the owned row.
  - License upgrades at MAX and licensed species: pass the same text the button showed as `desc` (the upgrade name already states its effect; species keep "Release X at Place").
  - `basketHead`: the Sell all total is `fishSum × (1 + s.releaseBonus) + junkSum` when the basket has a fish, and the label ends with ` +NN%` when `s.releaseBonus > 0`, e.g. `Sell all (12) $459 +35%`. When `s.buyer`, add after it `btn('pauseBuyer', '', lbl(icon('helper', 'buyer', HELPER_ICONS.buyer, 1), 'Pause buyer'), { pressed: s.buyerPaused, label: 'Pause fish buyer' })`.
  - `run`: `case 'sell': return act(s => sellAll(s, true))`; `case 'pauseBuyer': return act(s => toggleBuyerPause(s))` (falls to the `select` cue in `panelCue`).
  - CSS: the toggle shares the basket-head row height (32 px) and must not take the green Sell all style (scope that rule to `[data-action="sell"]`).
- [ ] **Step 2: Run** `npm test && npm run build` — expect PASS (pacing as in Task 1).
- [ ] **Step 3: Check by hand** in `npm run dev` with `?speed=20`: buy Catch & Release and the Buyer, pause, trash a fish from an open stack (bonus shows on Sell all), sell (bonus gone), unpause (buyer sells, bonus untouched), owned items show their descriptions.
- [ ] **Step 4: Commit** `git commit -m "show the release bonus, buyer pause and owned descriptions"`

### Task 5: Pacing

**Files:**
- Modify: `src/game/pacing.test.ts:30` (one-off list), `src/game/data.ts` (only if retuning)

- [ ] **Step 1:** Add `'release'` to the bot's one-off list (`for (const k of ['bulkTrash', 'sorter', 'buyer', 'release'] as const)`). The bot never trashes fish and never pauses.
- [ ] **Step 2: Run** `PACING_LOG=1 npx vitest run src/game/pacing.test.ts` — check bulk trash is bought clearly before the sorter in the log, and the 30–50 sim-min, 8-min-gap and 10×-jump checks.
- [ ] **Step 3:** If any check fails, retune in this order and rerun: `HELPERS.release.cost`, then `HELPERS.sorter.cost` (keep it > 3× bulk trash and ≥ the Buyer), then other `data.ts` numbers. Record the final season-1 minutes.
- [ ] **Step 4: Run** `npm test && npm run build` — expect PASS.
- [ ] **Step 5: Commit** `git commit -m "retune pacing for catch and release"`

### Task 6: Catch & Release icon (art review stop)

**Files:**
- Modify: `src/art/icons.ts` (`HELPER_ICONS.release`)

- [ ] **Step 1:** Draw a 16×16 icon in the style of the other helper icons (thick `O` outlines, stepped shades): a fish leaping back into water, or a fish over a curved "back" arrow. Replace the `TRASH_CAN` placeholder and its comment.
- [ ] **Step 2: Run** `npm test` — `icons.test.ts` checks size and palette.
- [ ] **Step 3: Review stop.** It appears on `/preview.html` automatically (helpers loop at `src/preview.ts:133`). Show the user and wait for approval; redraw on feedback.
- [ ] **Step 4: Commit** `git commit -m "draw the catch and release icon"`

### Task 7: Docs

**Files:**
- Modify: `docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`, `CLAUDE.md` (Docs and workflow paragraph)

- [ ] **Step 1:** Mark piece 1 done in the roadmap with the final numbers from Task 5 and any deferred minors; point CLAUDE.md's "current" roadmap at the shop upgrades roadmap (the visual overhaul one stays as history).
- [ ] **Step 2: Commit** `git commit -m "docs: close piece 1 on the shop upgrades roadmap"`
