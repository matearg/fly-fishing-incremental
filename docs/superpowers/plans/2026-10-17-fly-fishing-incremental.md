# Fly Fishing Incremental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser fly-fishing incremental game: cast and reel by hand, tie flies that wear out, sell or trash catches, automate everything with helpers, move through five rivers and lakes, and prestige with "New Season" for Fishing Licenses.

**Architecture:** All game rules live in pure TypeScript under `src/game/`, with no Phaser and no DOM. They mutate a single plain `GameState` object and are unit-tested with Vitest. `src/scene/` (Phaser) only draws the state and forwards clicks on the water. `src/ui/` (plain HTML over the canvas) draws the panels and forwards button clicks. `src/main.ts` runs the loop, autosave, and pause. Every tuning number lives in `src/game/data.ts`.

**Tech Stack:** TypeScript ^7.0.2, Vite ^8.3.4, Phaser ^4.2.1, Vitest ^5.0.5, npm.

**Spec:** `docs/superpowers/specs/2026-10-17-fly-fishing-incremental-design.md`

## Global Constraints

- Browser only. 2D side view, pixel art (`pixelArt: true`, integer zoom). Placeholder rectangles are fine until free assets are chosen, and any asset added must have a license allowing commercial use.
- No oceans: exactly five places, in order `creek → river → bigRiver → mountainLake → greatLake`.
- No idle/offline progress. The simulation pauses while the tab is hidden, and no catch-up is applied on return.
- All tuning numbers (prices, growth, odds, values, wear, timings, license formula) live in `src/game/data.ts`. No magic numbers in logic files.
- Currency is a plain JS `number`. No big-number library.
- `src/game/**` must not import Phaser or touch `window`/`document`/`localStorage`. The one exception is `save.ts`'s storage wrappers.
- Randomness enters game logic only through a `rand: () => number` parameter, so tests stay deterministic.
- UI text in English.
- Pacing: the first season with no license upgrades takes **30–60 minutes**, and later seasons get shorter.

## Review Focus

1. **Selling a basket that's mostly junk while broke:** money must never go below 0. `sellAll` clamps at 0, so the junk loss is absorbed. Test in Task 5.
2. **A corrupt, old-version or missing save in localStorage:** the game starts a fresh season instead of crashing or loading garbage. Test in Task 9.
3. **Returning from a hidden tab or laptop sleep (huge `dt`):** no burst of catches. `tick` clamps `dt` to `TIMING.maxTickMs`. Test in Task 6.
4. **Clicking any buy button without enough money:** nothing changes and the call returns `false`. Tests in Tasks 5, 7, and 8.
5. **Spam-clicking the water:** a second cast while the line is already out does nothing, and reeling only works on a bite. Test in Task 6.

---

## File Structure

```
index.html                 canvas host + #ui root
vite.config.ts
tsconfig.json
package.json
src/main.ts                boot: load save, Phaser game, UI, loop, autosave, pause-on-hidden, dev speed
src/game/data.ts           ALL content + tuning numbers (types + const tables)
src/game/state.ts          GameState types, SAVE_VERSION, newGame()
src/game/license.ts        licenseEffects(levels): what owned license upgrades do
src/game/flies.ts          fly stats, tie cost, tieFly
src/game/catch.ts          rollCatch (ladder depth, odds, size, junk)
src/game/economy.ts        sellAll, trash, unlock/buy/travel/setRecipe
src/game/helpers.ts        helper costs + buyHelper
src/game/sim.ts            tick, castPlayer, reelPlayer (angler state machine, bench, sorter, buyer)
src/game/prestige.ts       New Season + license shop
src/game/save.ts           serialize/deserialize + localStorage wrappers
src/game/format.ts         formatNumber
src/game/testutil.ts       seqRand helper for tests
src/game/*.test.ts         Vitest, colocated
src/scene/FishingScene.ts  Phaser scene: draws water bands, bank, anglers, lines, fish; water clicks
src/ui/panel.ts            HTML panels: money, fly, shop, helpers, places, season, basket + trash
src/ui/style.css
```

---

### Task 1: Project scaffold + number formatting

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts` (temporary stub), `src/game/format.ts`, `src/game/format.test.ts`

**Interfaces:**
- Produces: `formatNumber(n: number): string`

- [ ] **Step 1: Create the scaffold by hand** (don't run `npm create vite`: the directory isn't empty). `package.json` has `"type": "module"`, scripts `dev: "vite"`, `build: "tsc --noEmit && vite build"`, `test: "vitest run"`. Then run `npm i phaser@^4.2.1` and `npm i -D vite@^8.3.4 vitest@^5.0.5 typescript@^7.0.2`. `tsconfig.json`: `strict: true`, `target/module: ES2022`, `moduleResolution: "bundler"`, `types: ["vite/client"]`, `include: ["src"]`. `index.html` has `<div id="game"></div><div id="ui"></div>` and loads `/src/main.ts`. `vite.config.ts` uses `base: './'` (keeps a later desktop/Steam wrap working with relative paths).

- [ ] **Step 2: Write the failing test** `src/game/format.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it('plain below 1000, floored', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(12.7)).toBe('12')
    expect(formatNumber(999)).toBe('999')
  })
  it('suffixes with 2 decimals', () => {
    expect(formatNumber(1234)).toBe('1.23K')
    expect(formatNumber(1_000_000)).toBe('1.00M')
    expect(formatNumber(1.5e12)).toBe('1.50T')
  })
  it('scientific past the last suffix (Dc = 1e33)', () => {
    expect(formatNumber(1.234e33)).toBe('1.23Dc')
    expect(formatNumber(1e36)).toBe('1.00e36')
  })
  it('negatives and non-finite', () => {
    expect(formatNumber(-1234)).toBe('-1.23K')
    expect(formatNumber(Infinity)).toBe('∞')
    expect(formatNumber(NaN)).toBe('0')
  })
})
```

- [ ] **Step 3: Run it:** `npx vitest run src/game/format.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement `formatNumber`** in `src/game/format.ts`. Suffixes: `K M B T Qa Qi Sx Sp Oc No Dc`, each step ×1000. Truncate to 2 decimals (`Math.floor(x*100)/100`, then `toFixed(2)`) so a value never displays higher than it is.

- [ ] **Step 5: Run** `npx vitest run` → PASS, and `npm run build` → succeeds.

- [ ] **Step 6: Commit** `git add -A && git commit -m "chore: scaffold vite+phaser+vitest, add formatNumber"` (`node_modules` and `dist` go in `.gitignore`).

---

### Task 2: Content data + game state

**Files:**
- Create: `src/game/data.ts`, `src/game/license.ts`, `src/game/state.ts`, `src/game/testutil.ts`, `src/game/data.test.ts`, `src/game/state.test.ts`

**Interfaces:**
- Produces (data.ts):
  ```ts
  type Tier = 'common' | 'uncommon' | 'rare' | 'legendary'
  const TIERS: Tier[]                       // index = tier rank
  type LocationId = 'creek' | 'river' | 'bigRiver' | 'mountainLake' | 'greatLake'
  interface LocationDef { id: LocationId; name: string; unlockCost: number; maxDepth: number; junkWeight: number }
  interface PatternDef  { id: string; name: string; cls: 'dry' | 'nymph' | 'streamer'; maxDepth: number; wear: number; oddsBonus: number; tieCost: number; unlockCost: number }
  interface MaterialDef { id: string; name: string; depthBonus: number; wearBonus: number; oddsBonus: number; sizeBonus: number; tieCost: number; unlockCost: number }
  interface SpeciesDef  { id: string; name: string; location: LocationId; depth: number; tier: Tier; weight: number; baseValue: number; licenseCost?: number } // licenseCost set ⇒ absent until bought with licenses
  interface JunkDef     { id: string; name: string; value: number; weight: number }   // value <= 0
  type LicenseUpgradeId = 'startPattern' | 'extraWear' | 'valueMult' | 'helperDiscount' | 'startLocation'
  interface LicenseUpgradeDef { id: LicenseUpgradeId; name: string; costs: number[]; perLevel: number } // max level = costs.length
  const LOCATIONS: LocationDef[]; PATTERNS: PatternDef[]; MATERIALS: MaterialDef[]; SPECIES: SpeciesDef[]; JUNK: JunkDef[]; LICENSE_UPGRADES: LicenseUpgradeDef[]
  const TIMING: { biteMinMs: number; biteMaxMs: number; reelMs: number; benchTieMs: number; buyerIntervalMs: number; maxTickMs: 250 }
  const HELPERS: { angler: { baseCost: number; growth: number }; bench: { baseCost: number; growth: number }; sorter: { cost: number }; buyer: { cost: number } }
  const SIZE: { spread: number }            // fish size multiplier = 1 + rand*(spread + sizeBonus)
  const SEASON: { minEarnings: number; licenseDivisor: number }
  const BENCH_BOX_PER_ANGLER: number        // bench stops tying when flyBox.length >= anglers.length * this
  ```
- Produces (license.ts): `interface LicenseEffects { startPatterns: number; extraWear: number; valueMult: number; helperDiscount: number; startLocation: number }` and `licenseEffects(levels: Record<LicenseUpgradeId, number>): LicenseEffects`. Each field is `level * perLevel`, except `valueMult = 1 + level*perLevel` and `startPatterns`/`startLocation`, which are counts (`level*perLevel`, floored). `helperDiscount` is a fraction, capped at 0.9.
- Produces (state.ts):
  ```ts
  interface Fly { patternId: string; materialIds: string[]; wearLeft: number }
  type Phase = 'idle' | 'waiting' | 'bite' | 'reeling'
  interface Angler { auto: boolean; phase: Phase; timerMs: number; fly: Fly | null }
  interface CatchItem { id: number; kind: 'fish' | 'junk'; defId: string; value: number; size: number } // size 1 for junk
  interface Recipe { patternId: string; materialIds: string[] }
  interface GameState {
    version: number; money: number; seasonEarnings: number
    location: LocationId; unlockedLocations: LocationId[]
    unlockedPatterns: string[]; unlockedMaterials: string[]; recipe: Recipe
    flyBox: Fly[]; anglers: Angler[]                // anglers[0] is the player (auto: false)
    bench: number; sorter: boolean; buyer: boolean; benchTimerMs: number; buyerTimerMs: number
    basket: CatchItem[]; nextCatchId: number
    licenses: number; licenseLevels: Record<LicenseUpgradeId, number>; licenseSpecies: string[]
  }
  type Carry = Pick<GameState, 'licenses' | 'licenseLevels' | 'licenseSpecies'>
  const SAVE_VERSION = 1
  function newGame(carry?: Carry): GameState
  ```
- Produces (testutil.ts): `seqRand(...values: number[]): () => number`, which cycles through values.

- [ ] **Step 1: Write failing tests.** `data.test.ts`:
  - `LOCATIONS.map(l => l.id)` equals `['creek','river','bigRiver','mountainLake','greatLake']`, and `unlockCost` is strictly increasing with `creek.unlockCost === 0`.
  - `PATTERNS[0]` is `cls: 'dry'` with `tieCost === 0 && unlockCost === 0` (the free basic fly).
  - All ids are unique within each table. Every species' `location` exists and its `depth <= location.maxDepth`. Every `JUNK.value <= 0`.
  - Every location has at least one species with `depth === 0` and no `licenseCost`, so a fresh fly can always catch something.
  - Each `PATTERNS` class appears, and `maxDepth` follows dry `0` < nymph < streamer.

  `state.test.ts`:
  - `newGame()` → `money 0`, `location 'creek'`, `unlockedLocations ['creek']`, `unlockedPatterns [PATTERNS[0].id]`, `recipe { patternId: PATTERNS[0].id, materialIds: [] }`, `anglers.length 1` with `anglers[0].auto === false && phase === 'idle' && fly === null`, `basket []`, `licenses 0`, every `licenseLevels` value 0.
  - `newGame({ licenses: 5, licenseLevels: {...zero, startLocation: 2, startPattern: 1 }, licenseSpecies: ['x'] })` → `unlockedLocations ['creek','river','bigRiver']`, `location 'bigRiver'`, `unlockedPatterns` = the first `1 + startPatterns` patterns, carry fields preserved. (Set `LICENSE_UPGRADES` `perLevel` for `startLocation` and `startPattern` to 1 so this holds.)

- [ ] **Step 2: Run** `npx vitest run src/game` → FAIL.

- [ ] **Step 3: Fill in `data.ts`** with the v1 content: 5 locations; at least 6 patterns (2 per class); 5–6 materials, including at least one bead (`depthBonus: 1`); about 4 species per location across the tiers, plus 1 `licenseCost` legendary at each of the two lakes; 4–5 junk items (boot, can, tangled line, tire), including at least one with `value: 0`. Use first-guess numbers: Task 13 tunes them. Then implement `license.ts` and `newGame` in `state.ts`.

- [ ] **Step 4: Run** `npx vitest run src/game` → PASS.

- [ ] **Step 5: Commit** `feat(game): content tables, license effects, newGame`

---

### Task 3: Flies

**Files:**
- Create: `src/game/flies.ts`, `src/game/flies.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Recipe`, `Fly`, `PATTERNS`, `MATERIALS`, `licenseEffects`
- Produces:
  ```ts
  interface FlyStats { maxDepth: number; wear: number; oddsBonus: number; sizeBonus: number; tieCost: number }
  function flyStats(state: GameState, recipe: Recipe): FlyStats   // sums pattern + materials; wear += licenseEffects.extraWear
  function tieFly(state: GameState, recipe?: Recipe): boolean     // default state.recipe; pays tieCost, pushes Fly{wearLeft: stats.wear} to flyBox
  function basicRecipe(): Recipe                                   // { patternId: PATTERNS[0].id, materialIds: [] }
  ```

- [ ] **Step 1: Write failing tests:**
  - `flyStats` of nymph + bead → `maxDepth === nymph.maxDepth + bead.depthBonus`, and `tieCost === nymph.tieCost + bead.tieCost`.
  - With `licenseLevels.extraWear = 2`, wear is the base wear plus `2 * perLevel`.
  - `tieFly` with enough money → returns `true`, money drops by `tieCost`, `flyBox.length` becomes 1, and `wearLeft === stats.wear`.
  - `tieFly` with too little money → returns `false`, and money and `flyBox` are unchanged.
  - `tieFly(state, basicRecipe())` at `money 0` → `true` (it's free).

- [ ] **Step 2: Run** `npx vitest run src/game/flies.test.ts` → FAIL.
- [ ] **Step 3: Implement** in `flies.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): fly stats and tying`

---

### Task 4: Catch rolling (depth ladder)

**Files:**
- Create: `src/game/catch.ts`, `src/game/catch.test.ts`

**Interfaces:**
- Consumes: `flyStats`, `SPECIES`, `JUNK`, `LOCATIONS`, `TIERS`, `SIZE`, `licenseEffects`
- Produces: `function rollCatch(state: GameState, fly: Fly, rand: () => number): Omit<CatchItem, 'id'>`

Algorithm (spec "Depth is a ladder"):

```
depth  = min(flyStats(fly).maxDepth, location.maxDepth)
fish   = SPECIES where location === state.location && s.depth <= depth
         && (!s.licenseCost || state.licenseSpecies.includes(s.id))
weight(fish) = s.weight * (1 + oddsBonus) ** TIERS.indexOf(s.tier)
weight(junk) = j.weight * location.junkWeight
pick one by weight with rand()            // first rand call
fish:  size = 1 + rand() * (SIZE.spread + sizeBonus); value = baseValue * size * licenseEffects.valueMult
junk:  size = 1; value = j.value
```

- [ ] **Step 1: Write failing tests** (use `seqRand`):
  - A dry fly (`maxDepth 0`) never returns a species with `depth > 0`: run 500 rolls with `Math.random` and assert.
  - A streamer at the creek is capped by `creek.maxDepth`: no species deeper than that.
  - The ladder: at the same location, the set of species reachable by a streamer ⊇ the set reachable by a dry fly.
  - Higher `oddsBonus` raises the share of non-common tiers: compare 2,000 rolls each, with `rand` seeded via a simple LCG in the test.
  - A license species is never rolled unless its id is in `state.licenseSpecies`, and can be rolled once it is.
  - Junk returns `kind 'junk'`, `size 1`, `value <= 0`.
  - `valueMult` from `licenseLevels.valueMult` multiplies the fish value (same `seqRand`, compare values).

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): catch rolling with depth ladder`

---

### Task 5: Economy (sell, trash, unlocks, travel, recipe)

**Files:**
- Create: `src/game/economy.ts`, `src/game/economy.test.ts`

**Interfaces:**
- Consumes: `GameState`, data tables
- Produces:
  ```ts
  function spend(state: GameState, cost: number): boolean          // false and no change if money < cost
  function earn(state: GameState, amount: number): void            // money = max(0, money + amount); seasonEarnings += max(0, amount)
  function sellAll(state: GameState): number                       // sums basket values, earn(sum), clears basket, returns sum
  function trash(state: GameState, catchId: number): boolean
  function unlockPattern(state: GameState, id: string): boolean
  function unlockMaterial(state: GameState, id: string): boolean
  function unlockLocation(state: GameState, id: LocationId): boolean // only the next locked one in LOCATIONS order
  function travel(state: GameState, id: LocationId): boolean       // must be unlocked
  function setRecipe(state: GameState, recipe: Recipe): boolean    // pattern + all materials must be unlocked
  ```

- [ ] **Step 1: Write failing tests:**
  - `sellAll` with fish worth 10 and 5 and junk worth −3 → returns 12, money +12, basket empty, `seasonEarnings` +12.
  - **Review Focus 1:** money 2 and a basket of only junk worth −5 → `sellAll` leaves `money === 0` and `seasonEarnings` unchanged.
  - `trash` removes the item by id and doesn't change money. An unknown id → `false`.
  - **Review Focus 4:** `unlockPattern`, `unlockMaterial`, and `unlockLocation` with too little money → `false`, and the state is deep-equal to a `structuredClone` taken before the call.
  - `unlockLocation('bigRiver')` while `river` is still locked → `false`.
  - `travel` to a locked location → `false`. Travelling to an unlocked one sets `state.location`.
  - `setRecipe` with a locked material → `false`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): selling, trash, unlocks, travel`

---

### Task 6: Simulation: anglers, player cast/reel

**Files:**
- Create: `src/game/sim.ts`, `src/game/sim.test.ts`

**Interfaces:**
- Consumes: `rollCatch`, `tieFly`, `basicRecipe`, `TIMING`
- Produces:
  ```ts
  function tick(state: GameState, dtMs: number, rand: () => number): void  // dtMs clamped to TIMING.maxTickMs
  function castPlayer(state: GameState, rand: () => number): boolean        // only when anglers[0].phase === 'idle'
  function reelPlayer(state: GameState): boolean                            // only when anglers[0].phase === 'bite'
  ```
  (Task 7 extends `tick` with the bench, sorter, and buyer.)

Angler state machine:
- `idle` (auto angler): if `fly === null`, take `flyBox.shift()`. If there's still no fly, stay idle. Otherwise go to `waiting` with `timerMs = biteMinMs + rand()*(biteMaxMs-biteMinMs)`.
- `idle` (player): only `castPlayer` moves it. If `fly === null`, take from `flyBox`. If the box is empty, `tieFly(state)` with the recipe, and if that fails, `tieFly(state, basicRecipe())`. This is the spec's "never stuck" rule. Then go to `waiting` the same way.
- `waiting`: count down, then go to `bite`.
- `bite`: an auto angler goes straight to `reeling` (`timerMs = reelMs`). The player waits for `reelPlayer`.
- `reeling`: count down, then **land**: push `rollCatch` to the basket with `id = nextCatchId++`, `fly.wearLeft--`, set `fly = null` at 0, go to `idle`.

- [ ] **Step 1: Write failing tests:**
  - Player at `money 0` with an empty box: `castPlayer` → `true`, `phase 'waiting'`, and the player holds a basic fly (never stuck).
  - **Review Focus 5:** a second `castPlayer` while waiting → `false`, and the state is unchanged. `reelPlayer` while waiting → `false`.
  - Ticking to past `biteMaxMs` → `phase 'bite'`. `reelPlayer` → `'reeling'`. Ticking past `reelMs` → `basket.length 1`, `phase 'idle'`, and wear down by 1.
  - A fly with `wearLeft 1` → after landing, `anglers[0].fly === null`.
  - An auto angler (push `{auto:true, phase:'idle', timerMs:0, fly:null}`) with an empty box stays `idle` across 10 s of ticks. With one fly in the box it lands a catch on its own.
  - **Review Focus 3:** `tick(state, 3_600_000, rand)` advances at most `TIMING.maxTickMs`: an auto angler lands at most 1 catch in that call.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): angler simulation and player cast/reel`

---

### Task 7: Helpers (anglers, bench, sorter, buyer)

**Files:**
- Create: `src/game/helpers.ts`, `src/game/helpers.test.ts`
- Modify: `src/game/sim.ts` (`tick`, and landing for the sorter)

**Interfaces:**
- Consumes: `spend`, `sellAll`, `tieFly`, `HELPERS`, `BENCH_BOX_PER_ANGLER`, `licenseEffects`
- Produces:
  ```ts
  type HelperKind = 'angler' | 'bench' | 'sorter' | 'buyer'
  function helperCost(state: GameState, kind: HelperKind): number | null // null = one-off already owned
  function buyHelper(state: GameState, kind: HelperKind): boolean
  ```
  - Angler/bench cost = `baseCost * growth ** owned * (1 - helperDiscount)`, where owned is `anglers.length - 1` or `bench`. Buying an angler pushes an auto angler.
  - In `tick`: the bench accumulates `benchTimerMs`. Every `benchTieMs / bench` it calls `tieFly(state)` while `flyBox.length < anglers.length * BENCH_BOX_PER_ANGLER`, and skips silently if the player can't afford it. The buyer accumulates `buyerTimerMs` and calls `sellAll` every `buyerIntervalMs`. The sorter, when owned, sends landed junk nowhere (it's dropped instead of going to the basket).

- [ ] **Step 1: Write failing tests:**
  - The second angler costs `baseCost * growth`. With `helperDiscount` level 1 it costs less, by `(1 - perLevel)`.
  - **Review Focus 4:** `buyHelper` without the money → `false`, and the state is unchanged. Buying the sorter twice → the second call is `false` and `helperCost` returns `null`.
  - Bench 1, money enough, 1 auto angler: after `benchTieMs` the box has 1 fly. Ticking a long time never pushes the box past `anglers.length * BENCH_BOX_PER_ANGLER`.
  - Sorter owned plus a forced junk roll (a location where `seqRand` picks junk) → the basket stays empty after landing.
  - Buyer owned with a basket worth 10 → after `buyerIntervalMs`, money +10 and the basket is empty.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): helpers - anglers, tying bench, junk sorter, fish buyer`

---

### Task 8: Prestige: New Season + license shop

**Files:**
- Create: `src/game/prestige.ts`, `src/game/prestige.test.ts`

**Interfaces:**
- Consumes: `newGame`, `Carry`, `SEASON`, `LICENSE_UPGRADES`, `SPECIES`
- Produces:
  ```ts
  function licensesForSeason(state: GameState): number   // floor(sqrt(seasonEarnings / SEASON.licenseDivisor))
  function canStartSeason(state: GameState): boolean     // seasonEarnings >= SEASON.minEarnings
  function startNewSeason(state: GameState): GameState   // newGame({ licenses: licenses + earned, licenseLevels, licenseSpecies })
  function licenseUpgradeCost(state: GameState, id: LicenseUpgradeId): number | null // null at max level
  function buyLicenseUpgrade(state: GameState, id: LicenseUpgradeId): boolean
  function buyLicenseSpecies(state: GameState, speciesId: string): boolean          // species must have licenseCost
  ```
  The license shop can be used at any time, mid-season included.

- [ ] **Step 1: Write failing tests:**
  - `seasonEarnings = SEASON.licenseDivisor * 9` → `licensesForSeason === 3`.
  - Below `minEarnings`, `canStartSeason` is `false`.
  - `startNewSeason` resets money, basket, helpers, anglers (back to 1), unlocks, and `seasonEarnings`, keeps `licenseLevels` and `licenseSpecies`, and adds the earned licenses.
  - **Review Focus 4:** `buyLicenseUpgrade` with too few licenses → `false`, unchanged. At max level → `false`, and the cost is `null`.
  - `buyLicenseSpecies` on a species without `licenseCost` → `false`. On a legendary → `true`, the licenses are deducted, and the id is added to `licenseSpecies`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): New Season prestige and license shop`

---

### Task 9: Saving

**Files:**
- Create: `src/game/save.ts`, `src/game/save.test.ts`

**Interfaces:**
- Produces:
  ```ts
  const SAVE_KEY = 'flyfishing-save'
  function serialize(state: GameState): string
  function deserialize(raw: string | null): GameState      // newGame() on null / bad JSON / version !== SAVE_VERSION / missing or non-number money
  function saveToStorage(state: GameState): void           // try/catch; storage can throw (private mode, quota)
  function loadFromStorage(): GameState                    // try/catch → newGame()
  ```

- [ ] **Step 1: Write failing tests:**
  - Round-trip: a mid-game state (helpers, basket, flies, licenses) → `deserialize(serialize(s))` deep-equals `s`.
  - **Review Focus 2:** `deserialize(null)`, `deserialize('{oops')`, `deserialize(JSON.stringify({version: 999}))`, and `deserialize(JSON.stringify({version: 1, money: 'lots'}))` each return a state deep-equal to `newGame()` and don't throw.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(game): versioned save/load`

---

### Task 10: Phaser scene + main loop (playable fishing)

**Files:**
- Create: `src/scene/FishingScene.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `GameState`, `tick`, `castPlayer`, `reelPlayer`, `loadFromStorage`, `saveToStorage`, `LOCATIONS`, `SPECIES`
- Produces:
  - `class FishingScene extends Phaser.Scene`, constructed with `{ getState: () => GameState; onWaterClick: () => void }`.
  - `main.ts` exposes `let state: GameState` plus `act(fn: (s: GameState) => unknown)`, which applies a game action and then re-renders the UI. Task 11 passes `act` to the panel. Replacing the state (New Season) goes through `setState(s: GameState)`.

- [ ] **Step 1: Write the scene.** Use a fixed internal resolution (e.g. 480×270) with `pixelArt: true` and `scale: { mode: Phaser.Scale.FIT, autoCenter: CENTER_BOTH }`. In `update()`, draw from state each frame with one `Graphics` (cleared each frame):
  - The sky.
  - Water split into `location.maxDepth + 1` horizontal bands, darker with depth.
  - The bank on the left.
  - One angler rectangle per angler along the bank. The player is first, in a distinct color.
  - For any angler not `idle`, a line from the rod tip to a bobbing fly point at the depth of its fly. Use `min(flyStats.maxDepth, location.maxDepth)`.
  - A `!` text above the player during `bite`.
  - Ambient fish rectangles, colored by tier, drifting in their depth bands. Draw only the species catchable at the current location.

  `pointerdown` on the water calls `onWaterClick`.

- [ ] **Step 2: Write `main.ts`:**
  - Load with `loadFromStorage()`.
  - Create the Phaser game in `#game`. `onWaterClick` is `act(s => castPlayer(s, Math.random) || reelPlayer(s))`.
  - Loop: use `requestAnimationFrame` (it pauses with the tab), calling `tick(state, dt * speed, Math.random)` with `dt` from `performance.now()`.
  - Dev speed: `speed = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('speed') ?? 1) : 1`.
  - On `visibilitychange` → hidden: save and reset the last-frame timestamp, so nothing is caught up on return.
  - Autosave every 5 s and on `pagehide`.

- [ ] **Step 3: Verify in the browser** (the `run` or `mateo-test` skill, with `npm run dev`):
  - Click the water: the line goes out, `!` appears, and a click reels in.
  - After a reload the basket is still there (check through `localStorage` in devtools).
  - Switch tabs for 30 s and come back: no burst of catches.
  - `?speed=20` speeds things up.

  Run `npm run build` → succeeds.

- [ ] **Step 4: Commit** `feat: playable fishing scene and game loop`

---

### Task 11: HTML panels (shop, helpers, places, season, basket + trash)

**Files:**
- Create: `src/ui/panel.ts`, `src/ui/style.css`
- Modify: `src/main.ts` (mount the panel, re-render after `act` and every 250 ms)

**Interfaces:**
- Consumes: every action from Tasks 3, 5, 7, and 8, plus `formatNumber`, `flyStats`, and `helperCost`
- Produces: `function mountPanel(root: HTMLElement, getState: () => GameState, act: (fn: (s: GameState) => unknown) => void, setState: (s: GameState) => void): { render(): void }`

Layout follows the spec's option A: the canvas on the left; on the right a panel with the money (big, `formatNumber`), the fly (name, wear bar, box count, recipe picker limited to unlocked items, and a "Tie fly (cost)" button), the shop (patterns and materials), helpers, places (unlock next / travel), New Season, and licenses; along the bottom, the basket strip with "Sell all" and a 🗑️ trash can.

- Buttons carry `data-action` + `data-id`, with one delegated `click` listener on `root`. Unaffordable buttons are `disabled` but still show their price. Every button is a real `<button>` (keyboard accessible).
- Basket items are `draggable` and the trash can is a drop target. On drop, call `act(s => trash(s, id))`. Re-renders skip the basket while a drag is in progress (a `dragging` flag set on `dragstart` and cleared on `dragend`), so the drag isn't cancelled. Each basket item also has a keyboard/click "trash" button for accessibility.
- New Season shows the licenses you'd earn. It's enabled only when `canStartSeason` is true and asks for confirmation through an in-panel "Are you sure?" second click. No `window.confirm`.

- [ ] **Step 1: Implement** `panel.ts`, `style.css`, and the wiring in `main.ts`.
- [ ] **Step 2: Verify in the browser with `?speed=20`:**
  - Unlock a nymph and a bead, set the recipe, and tie: the money drops.
  - Drag a boot into the trash: it disappears.
  - Sell all: the money rises.
  - Buy an angler and a bench: the angler fishes on its own and the box refills.
  - Buy the sorter and the buyer: the game runs hands-off.
  - Unlock the river and travel there.
  - Disabled buttons can't be clicked while broke.

  Run `npm run build` → succeeds.
- [ ] **Step 3: Verify New Season end-to-end.** Set `seasonEarnings` past `SEASON.minEarnings` by editing the save in `localStorage` and reloading. Start a New Season. Check that money and helpers reset and licenses increase, that buying `startLocation` level 1 makes the next season start at the river, and that a bought lake legendary appears among that lake's ambient fish. Add a regression test in `src/game/` for any logic bug found.
- [ ] **Step 4: Commit** `feat(ui): shop, helpers, places, season and basket panels`

---

### Task 12: Pacing bot + first balance pass

**Files:**
- Create: `src/game/pacing.test.ts`
- Modify: `src/game/data.ts` (numbers only)

**Interfaces:**
- Consumes: the whole `src/game` API.

The bot plays the real rules headlessly. It ticks every `dt = 100` ms with a seeded LCG `rand`. On each tick it:
- casts or reels instantly (`castPlayer || reelPlayer`);
- trashes junk before selling and sells when the basket has at least 10 items, or lets the buyer do it;
- buys, cheapest affordable first, among: next pattern, next material, next location (then travels there), an angler, a bench (when `bench * 3 < hired anglers`), the sorter, and the buyer;
- sets the recipe to the deepest unlocked pattern plus every unlocked material;
- stops when `canStartSeason`.

The bot plays faster than a human, so its target is the **lower part** of the spec's 30–60 min window.

- [ ] **Step 1: Write tests** (`it(..., { timeout: 60_000 })`):
  - `first season, no licenses: bot reaches canStartSeason in 30–45 sim-minutes`
  - `second season after spending first season's licenses greedily (upgrades first) is faster than the first`
  - `no single purchase multiplies income per sim-minute by more than 10×`. Measure average earnings per minute over the 2 minutes before vs. after each purchase, and assert the ratio is at most 10. This guards the "overpowered upgrade" anti-goal.
  - `no gap longer than 8 sim-minutes between purchases in season 1`. This guards the "progress crawls" anti-goal.
- [ ] **Step 2: Run** `npx vitest run src/game/pacing.test.ts`. It will likely FAIL on the first-guess numbers.
- [ ] **Step 3: Tune only `data.ts`** until all four pass. Don't change any logic to make them pass.
- [ ] **Step 4: Run** `npx vitest run` (everything) → PASS, and `npm run build` → succeeds.
- [ ] **Step 5: Commit** `balance: first pacing pass, bot-verified season length`

---

## Spec coverage check

| Spec section | Task |
|---|---|
| Stack, browser, pixel art 2D, `base: './'` for a later Steam build | 1, 10 |
| Screen layout A | 10, 11 |
| Cast → bite → reel → basket → wear | 6, 10 |
| Patterns/classes/materials, one-time unlock + per-fly cost, fly box, never stuck | 2, 3, 5, 6 |
| Depth ladder, odds toward rarer, size roll, junk ≤ 0 | 4 |
| Basket, sell all incl. junk, drag to trash | 5, 11 |
| Helpers: angler, bench, sorter, buyer | 7, 11 |
| Five places, unlock + travel | 2, 5, 11 |
| New Season, licenses, minute-0 upgrades, license species | 2, 8, 11 |
| Pacing 30–60 min, later seasons shorter, content cap | 12 |
| Save autosave + version, pause when hidden, no catch-up | 6, 9, 10 |
| Balance data in one file, dev speed, number formatting | 1, 2, 10, 12 |
