# Field-journal panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the HTML side panel and basket bar as a pixel "field journal", give every item a code-drawn icon, show owned unlocks as owned, stack the basket by kind, and add a bench cooldown bar.

**Architecture:** Icons are pixel grids in a new pure module `src/art/icons.ts`, tested in Node like the other art. A small DOM bridge, `src/ui/icons.ts`, turns bitmaps into cached data URLs for `<img>` tags inside the panel's HTML strings. Basket grouping is a pure module, `src/ui/basket.ts`, tested in Node. `panel.ts` keeps its string + `patch`/`morph` model; the basket becomes a patched section too.

**Tech Stack:** TypeScript, Vite, Vitest, plain DOM + CSS. The fonts are Google Fonts Silkscreen and Pixelify Sans.

**Spec:** `docs/superpowers/specs/2026-10-18-panel-journal-style-design.md`

## Global Constraints

- Presentation only. Game rules, balance, save format and `GameState` stay as they are. The one exception is extracting `benchFull` (Task 4). `pacing.test.ts` stays green untouched.
- Don't change the Phaser scenes, the corner menu button or Esc, and don't change the rule that the panel and basket are hidden in title mode.
- Art goes in `src/art/` as pure grids + palette, baked with `paint`, with no DOM. DOM conversion goes in `src/ui/`.
- Colors are `:root` custom properties in `src/ui/style.css`. The journal palette is: paper `#e8d8b0`, ink `#3a2a18`, bevel light `#f4e8c8`, bevel dark `#c8b488`, card `#f4ead0`, card shadow / dashed rule `#b09a70`, rust `#8a3a20`, owned text `#6a5a40`, stamp `#2a6a3a` with border `#1a4a2a`, money `#2a6a3a`, danger `#8a3434`. Nothing has a border-radius.
- Fonts: `<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600&family=Silkscreen&display=swap" rel="stylesheet">` in `index.html`. Silkscreen is for headings, prices and numbers; Pixelify Sans is for body text; both fall back to `monospace`.
- Icons and sprites render crisp: `image-rendering: pixelated`, at an integer scale. They're decorative `<img alt="">` because a text label is always present.
- Never swap a button under the cursor. Every new clickable carries `data-action`/`data-id`, so `morph` and the focus restore keep working.
- Work on branch `feat/panel-journal`, cut from `develop`. Commit messages are one short line with no trailers (the user's `mateo-commit` rule).
- `npm test` and `npm run build` pass after every task.

## Review Focus

- **A huge stack** (hundreds of Puyen): the tile shows the full count and total, and the open list shows the newest 50 plus "+N more". *Test: `basket.test.ts` "counts and totals a 120-catch stack, newest first".*
- **An open stack that empties** (Sell all, or trashing its last catch): the list closes, and no stale popover stays behind. *Test: `basket.test.ts` "keepOpen drops a key whose stack is gone".*
- **Junk stacks with negative value:** the total shows as `-$4`, not `$-4`. *Test: `basket.test.ts` "sums negative junk values"; the panel formats with the existing `<0 ? '-' : ''` pattern.*
- **Dragging a catch while the 250 ms re-render runs:** the dragged row must not be replaced. *Manual check in Task 7. The `dragging` guard must also skip the basket section patch.*
- **Fonts fail to load (offline), or the shop is at its longest:** the monospace fallback still fits the 340 px column, and long names wrap rather than overflow. *Manual check in Task 7, with the font link blocked in devtools.*

---

### Task 1: Fly and material icons + preview section (review stop)

**Files:**
- Create: `src/art/icons.ts`
- Create: `src/art/icons.test.ts`
- Modify: `src/preview.ts` (append a section)

**Interfaces:**
- Produces:
  - `export interface Icon { grid: Grid; palette: Record<string, number> }`
  - `export const FLY_ICONS: Record<string, Icon>`, keyed by `PATTERNS` id
  - `export const MATERIAL_ICONS: Record<string, Icon>`, keyed by `MATERIALS` id
  - `export function iconBitmap(icon: Icon): Bitmap`, which is `paint(icon.grid, icon.palette)`
  - `export const ICON_MAX = 16`

- [ ] **Step 1: Branch.** `git switch -c feat/panel-journal develop`

- [ ] **Step 2: Write the failing test** `src/art/icons.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { MATERIALS, PATTERNS } from '../game/data'
import { FLY_ICONS, MATERIAL_ICONS, ICON_MAX, iconBitmap, type Icon } from './icons'

function checkIcons(name: string, set: Record<string, Icon>, ids: string[]): void {
  it(`${name}: one icon per id`, () => expect(Object.keys(set).sort()).toEqual([...ids].sort()))
  it(`${name}: each paints, fits ${ICON_MAX}×${ICON_MAX}, has opaque pixels`, () => {
    for (const id of ids) {
      const b = iconBitmap(set[id])
      expect(b.w, id).toBeLessThanOrEqual(ICON_MAX)
      expect(b.h, id).toBeLessThanOrEqual(ICON_MAX)
      expect(b.data.some((v, i) => i % 4 === 3 && v === 255), id).toBe(true)
    }
  })
}

describe('icons', () => {
  checkIcons('flies', FLY_ICONS, PATTERNS.map(p => p.id))
  checkIcons('materials', MATERIAL_ICONS, MATERIALS.map(m => m.id))
})
```

- [ ] **Step 3: Run it and make sure it fails.** `npx vitest run src/art/icons.test.ts`. Expected: FAIL, "Failed to resolve import ./icons".

- [ ] **Step 4: Draw the icons in `src/art/icons.ts`.** Each one is about 16×16 with a thick ink outline (`0x3a2a18`) and stepped shading, and reads on paper `#e8d8b0`. Flies are tied on a visible hook and look as close to the real fly as possible:
  - **basicDry:** tail, body, an upright wing and a hackle collar.
  - **elkHair:** a tan elk-hair wing swept back over the hook, with palmered brown hackle.
  - **pheasantTail:** a slim reddish-brown body, a copper rib, a fine tail and a darker thorax.
  - **haresEar:** a shaggy tan-grey dubbed body, a gold rib and a buggy thorax.
  - **woollyBugger:** a long dark olive/black marabou tail and a chenille body with palmered hackle.
  - **zonker:** a rabbit-fur strip along the back and a flashy mylar body.

  Materials show the material itself: **copperWire** is a coil, **peacockHerl** is iridescent green-bronze fibres, **goldBead** is a gold bead with a hole, **marabou** is a plume, **flashabou** is flash strands, and **tungstenBead** is a dark gunmetal bead.

- [ ] **Step 5: Run the test and make sure it passes.** `npx vitest run src/art/icons.test.ts`. Expected: PASS.

- [ ] **Step 6: Add a preview section.** Append to `src/preview.ts`: a section titled "Panel icons (on paper, 3×)" that shows every `FLY_ICONS` and `MATERIAL_ICONS` entry through the existing `show(row, bitmap, caption, 3)`, captioned with the data name. Each canvas sits on background `#e8d8b0` (set `c.style.background` for this section only; the shared `canvas` CSS rule stays black for the other sections).

- [ ] **Step 7: Verify.** `npm test && npm run build`. Expected: everything passes.

- [ ] **Step 8: Commit.** `git add src/art/icons.ts src/art/icons.test.ts src/preview.ts && git commit -m "feat: add fly and material icons"`

- [ ] **Step 9: REVIEW STOP.** Run `npm run dev` and ask the user to open `/preview.html` and approve the flies and materials. Iterate on the grids until they approve. Don't start Task 2 before they do.

### Task 2: Place, helper, license and UI icons (review stop)

**Files:**
- Modify: `src/art/icons.ts`, `src/art/icons.test.ts`, `src/preview.ts`

**Interfaces:**
- Consumes: `Icon`, `iconBitmap`, `checkIcons` from Task 1.
- Produces:
  - `export const PLACE_ICONS: Record<LocationId, Icon>`
  - `export const HELPER_ICONS: Record<HelperKind, Icon>`
  - `export const LICENSE_ICONS: Record<LicenseUpgradeId, Icon>`
  - `export type UiIconId = 'coin' | 'fly' | 'season' | 'license' | 'basket' | 'trash'`
  - `export const UI_ICONS: Record<UiIconId, Icon>`

- [ ] **Step 1: Write the failing tests.** Add to the `describe` in `icons.test.ts`:

```ts
  checkIcons('places', PLACE_ICONS, LOCATIONS.map(l => l.id))
  checkIcons('helpers', HELPER_ICONS, ['angler', 'bench', 'sorter', 'buyer'])
  checkIcons('licenses', LICENSE_ICONS, LICENSE_UPGRADES.map(u => u.id))
  checkIcons('ui', UI_ICONS, ['coin', 'fly', 'season', 'license', 'basket', 'trash'])
```

- [ ] **Step 2: Run them and make sure they fail.** `npx vitest run src/art/icons.test.ts`. Expected: FAIL, because the exports are missing.

- [ ] **Step 3: Draw the icons.**
  - **Places** are small vignettes that reuse each place's `PLACE_LOOKS` colors (read them from `placeLook(id)` in `src/art/places.ts`): creek has grass and pebbles, river has sand and reeds, bigRiver has mud and a log, mountainLake has a rock and a pine, greatLake has a beach and a dock.
  - **Helpers:** angler is a figure in a hat, bench is a fly vise, sorter is a junk bin, buyer is a crate of fish or coins.
  - **Licenses:** pick motifs that read at a glance (for example a pattern card, a spool of thread, a coin stack, a price tag, a trail marker).
  - **UI:** coin, fly (a generic fly for the Fly heading), season (a sun over hills or a calendar page), license (a ticket), basket (a wicker creel) and trash (a metal bin).
  - Smaller grids are fine where they read well.

- [ ] **Step 4: Run them and make sure they pass.** `npx vitest run src/art/icons.test.ts`. Expected: PASS.

- [ ] **Step 5: Extend the preview.** Add these four sets to the same paper section from Task 1.

- [ ] **Step 6: Verify, then commit.** `npm test && npm run build`, then `git commit -am "feat: add place, helper, license and ui icons"`

- [ ] **Step 7: REVIEW STOP.** The user approves these on `/preview.html` before Task 3 starts.

### Task 3: Journal stylesheet, fonts and icon bridge

**Files:**
- Create: `src/ui/icons.ts`
- Modify: `index.html`, `src/ui/style.css`, `src/ui/panel.ts`

**Interfaces:**
- Consumes: the icon sets and `iconBitmap` (Tasks 1–2); `fishSideBitmaps(id)[0]` from `src/art/sprites/fish.ts`; `junkBitmap(id)` from `src/art/sprites/junk.ts`.
- Produces (in `src/ui/icons.ts`):
  - `export function img(key: string, make: () => Bitmap, scale = 2): string`. It returns `<img class="ico" src="data:…" alt="" width=… height=…>`, and caches the data URL per `key` in a `Map`. To build it, it puts the bitmap on a canvas and calls `toDataURL()`. It's built the first time it's asked for, never in the 250 ms loop.
  - `export const icon = (set: string, id: string, i: Icon, scale = 2) => img(`${set}:${id}`, () => iconBitmap(i), scale)`
  - `export function catchImg(kind: 'fish' | 'junk', defId: string): string`. It uses the side sprite for fish and `junkBitmap` for junk at scale 1, and returns `''` when the id has no art, so an unknown id from an old save renders without an image instead of throwing.

- [ ] **Step 1: Add the font `<link>`** from Global Constraints to the `<head>` of `index.html`.

- [ ] **Step 2: Write `src/ui/icons.ts`** with the interfaces above. There's no unit test, because it's DOM-only. The pure halves are already tested.

- [ ] **Step 3: Rewrite `src/ui/style.css` in the journal palette.**
  - Replace the `:root` tokens with the Global Constraints colors.
  - **Panel and basket bar:** paper background, 3 px ink border, bevel insets.
  - **`h2`:** Silkscreen in rust, with a 2 px dashed `#b09a70` underline, and flex so the heading icon sits on the left.
  - **`button`:** a card `#f4ead0` with a 2 px ink border, `box-shadow: 3px 3px 0 #b09a70` and no radius. `:hover` lightens it. `:active` shifts it 1 px and drops the shadow. `:disabled` uses opacity .5.
  - **`button b` (prices):** Silkscreen in rust.
  - **`button[aria-pressed="true"]`** (Selected): ink fill `#3a2a18`, paper text, no shadow. This is distinct from both owned and disabled.
  - **`button.danger`:** fill `#8a3434` with white text.
  - **`.owned`:** a non-button row with no fill, a 2 px dashed `#6a5a40` border and `#6a5a40` text.
  - **`.stamp`:** Silkscreen, white on `#2a6a3a`, 2 px `#1a4a2a` border, `transform: rotate(-6deg)`.
  - **`:focus-visible`:** a 2 px rust outline.
  - **`.ico`:** `image-rendering: pixelated; vertical-align: middle`.
  - **`.money`:** Silkscreen in green.
  - **`body`:** the body font is Pixelify Sans.

- [ ] **Step 4: Put icons into `panel.ts`.**
  - **Headings** in the `mountPanel` template: Fly gets `UI_ICONS.fly`, Shop gets `UI_ICONS.fly`, Helpers gets `HELPER_ICONS.angler`, Places gets `PLACE_ICONS.creek`, New Season gets `UI_ICONS.season`, Licenses gets `UI_ICONS.license`. Money gets `UI_ICONS.coin`. Basket head gets `UI_ICONS.basket`.
  - **The trash `div`** shows `UI_ICONS.trash` instead of 🗑️ and keeps its `role` and `aria-label`.
  - **Every 🎫** in the licenses section becomes `UI_ICONS.license` at scale 1.
  - **Item buttons get their icon:** shop patterns and materials, the recipe pattern and material buttons, the current fly name in the `fly` section, helpers, place travel and unlock buttons, license upgrades, and released species (`catchImg('fish', sp.id)`).

- [ ] **Step 5: Verify.** `npm test && npm run build` pass. Then `npm run dev`: the game shows the journal panel with crisp icons, and clicking buttons still works.

- [ ] **Step 6: Commit.** `git add index.html src/ui && git commit -m "feat: journal panel style with icons"`

### Task 4: Owned unlocks and bench bar

**Files:**
- Modify: `src/game/fishing/sim.ts:54-55`, `src/game/fishing/sim.test.ts`, `src/ui/panel.ts`

**Interfaces:**
- Produces: `export function benchFull(state: GameState): boolean` in `sim.ts`. It returns `state.flyBox.length >= state.anglers.length`, and `tick` uses `!benchFull(state)` in place of its inline condition.

- [ ] **Step 1: Write the failing test** in `sim.test.ts`:

```ts
describe('benchFull', () => {
  it('is true once the box holds one fly per angler', () => {
    const s = newGame()
    s.bench = 1
    expect(benchFull(s)).toBe(false)
    s.flyBox = [{ patternId: 'basicDry', materialIds: [], wearLeft: 3 }]
    expect(benchFull(s)).toBe(true)
  })
})
```



- [ ] **Step 2: Run it and make sure it fails.** `npx vitest run src/game/fishing/sim.test.ts -t benchFull`. Expected: FAIL, because `benchFull` is not exported.

- [ ] **Step 3: Extract `benchFull`** and use it in `tick`. Then run `npm test`. Expected: everything passes, including `pacing.test.ts`.

- [ ] **Step 4: Add `owned(iconHtml: string, label: string, stamp = 'OWNED'): string` in `panel.ts`.** It returns `<div class="owned">${iconHtml}<span>${label}</span><span class="stamp">${stamp}</span></div>`. It isn't a button, so it's inert.
  - **Shop:** every pattern and material in `data.ts` order. Owned ones render with `owned(...)`; the rest stay as buttons. "Everything unlocked." goes away.
  - **Helpers:** when `helperCost` returns `null`, render `owned(icon, label)`.
  - **Licenses:** a maxed upgrade renders `owned(icon, u.name, `MAX ${lvl}`)`, and a released species renders `owned(catchImg, sp.name, 'IN THE WATER')`.

- [ ] **Step 5: Add the bench bar to the `recipe` section** when `s.bench > 0`.
  - **Bar markup:** `<div class="bar${full ? ' paused' : ''}" role="progressbar" aria-label="Bench" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><span style="width:${n}%"></span></div><p class="label">${full ? 'Box full' : 'Tying…'}</p>`, where `full = benchFull(s)` and `n = Math.round(100 * s.benchTimerMs / benchCooldownMs(s))`.
  - **Shared `.bar` class:** rename the wear meter's class `wear` to `bar` so both bars share it.
  - **Bar CSS:** an ink border, a card background and a rust fill. `.paused` uses a hatched or faded fill.

- [ ] **Step 6: Verify.** `npm test && npm run build` pass. Then in the dev build with `?speed=20`, buy a bench: the bar fills, and it reads "Box full" once the box is full. Owned items show the stamp and don't react to clicks.

- [ ] **Step 7: Commit.** `git add src/game/fishing src/ui && git commit -m "feat: owned stamps and bench progress bar"`

### Task 5: Basket grouping module

**Files:**
- Create: `src/ui/basket.ts`, `src/ui/basket.test.ts`

**Interfaces:**
- Produces:
  - `export interface Stack { key: string; kind: 'fish' | 'junk'; defId: string; count: number; total: number; items: CatchItem[] }`. `key` is `${kind}:${defId}`, and `items` is newest first.
  - `export function stackBasket(basket: CatchItem[]): Stack[]`. Stacks are ordered by their first (oldest) catch in the basket.
  - `export function keepOpen(stacks: Stack[], key: string | null): string | null`. It returns `key` if a stack with that key still exists, otherwise `null`.
  - `export const STACK_LIST_MAX = 50`

- [ ] **Step 1: Write the failing tests** in `src/ui/basket.test.ts`. Use a helper `c(id, kind, defId, value)` that builds a `CatchItem` with `size: 1`.
  - **"groups by kind and defId in order of first catch":** for `[c(1,'fish','dace',2), c(2,'junk','boot',-2), c(3,'fish','dace',3)]`, the keys are `['fish:dace','junk:boot']`, the dace count is 2 and its total is 5.
  - **"counts and totals a 120-catch stack, newest first":** 120 dace with ids 1..120 at value 2 give count 120, total 240, `items[0].id === 120` and `items.length === 120`.
  - **"sums negative junk values":** two boots at −2 give total −4.
  - **"empty basket gives no stacks":** `stackBasket([])` equals `[]`.
  - **"keepOpen drops a key whose stack is gone":** `keepOpen(stackBasket([]), 'fish:dace')` is `null`. A present key is returned unchanged, and `null` stays `null`.

- [ ] **Step 2: Run them and make sure they fail.** `npx vitest run src/ui/basket.test.ts`. Expected: FAIL, "Failed to resolve import ./basket".

- [ ] **Step 3: Implement `src/ui/basket.ts`.** It's pure: one `Map` pass over the basket, then each stack's items reversed. It has no DOM and imports types only from `src/game/state`.

- [ ] **Step 4: Run them and make sure they pass.** `npx vitest run src/ui/basket.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.** `git add src/ui/basket.ts src/ui/basket.test.ts && git commit -m "feat: group basket catches into stacks"`

### Task 6: Stacked basket in the panel

**Files:**
- Modify: `src/ui/panel.ts`, `src/ui/style.css`

**Interfaces:**
- Consumes: `stackBasket`, `keepOpen` and `STACK_LIST_MAX` (Task 5); `catchImg` (Task 3); the existing `trash` action.

Decisions made here, which the spec left to the builder:
- **The open list is a popover** above the basket bar: a `div.stack-list` that is a direct child of the `footer` (which gets `position: relative`), absolutely positioned with `bottom: 100%`. This keeps the canvas row from resizing, and it isn't clipped by the scrolling tile list.
- **Tiles are in order of first catch.**

- [ ] **Step 1: Replace the chip rendering.** Delete `renderBasket`, the `chips` map and `MAX_CHIPS` together with its `shortcut:` comment. Add a patched section `basket` (the `ul.items` gets `data-sec="basket"`) and a sibling section `stackList` (a `div.stack-list` with `data-sec="stackList"`), both rendered from `stackBasket(s.basket)`, with `openStack = keepOpen(stacks, openStack)` worked out once per render.
  - **Tile:** `<li><button data-action="toggleStack" data-id="${key}" aria-expanded="${open}">${catchImg} ${name} <span class="ct">×${count} · ${money(total)}</span></button></li>`. It's not draggable and has no ✕.
  - **`money(n)`:** a local helper that keeps the existing `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}` form.
  - **`stackList`:** empty when nothing is open. Otherwise it's the open stack's `items.slice(0, STACK_LIST_MAX)` as `<div class="row-catch" draggable="true" data-catch-id="${id}">${name} <b>${money(value)}</b> ${btn('trash', id, '✕', { cls: 'x' })}</div>` (keep the existing `aria-label="Trash …"` on the ✕), plus `<p class="label">+${count - STACK_LIST_MAX} more</p>` when the stack is longer.

- [ ] **Step 2: Wire the events.**
  - **`toggleStack`** in the click `switch`: `openStack = openStack === id ? null : id; render()`.
  - **Drag:** move the `dragstart` listener from `list` to the `footer`, matching `[data-catch-id]`.
  - **Render while dragging:** in `render()`, skip the `basket` and `stackList` sections while `dragging` is true, replacing the old `if (!dragging) renderBasket(s)`.
  - **Leave `dragend`/`drop` as they are.**

- [ ] **Step 3: Style it.** Tiles are cards with the sprite on the left and the `.ct` count in Silkscreen. The open tile is shown with `aria-expanded="true"`, using the Selected look. The `.stack-list` popover has a paper background, an ink border and a dashed inner rule, `max-height: 240px` and `overflow-y: auto`. `.row-catch` uses `cursor: grab`.

- [ ] **Step 4: Verify.** `npm test && npm run build` pass. Then in the dev build with `?speed=20`:
  - **Stacking:** catches stack, and a tile opens and closes.
  - **Open while catching:** the list stays open as new catches land.
  - **Removing from an open stack:** ✕ removes one catch, and dragging a row onto the trash removes it.
  - **Emptying:** "Sell all" closes the list.
  - **Long stacks:** a stack over 50 shows "+N more".
  - **Keyboard:** Tab reaches the tiles and Enter toggles them.

- [ ] **Step 5: Commit.** `git commit -am "feat: stacked basket with expandable tiles"`

### Task 7: Final review stop and roadmap

**Files:**
- Modify: `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md`

- [ ] **Step 1: Check the Review Focus items by hand** in `npm run dev`:
  - Drag a catch and hold it across several re-renders; the row doesn't flicker or drop.
  - Block `fonts.googleapis.com` in devtools and reload; the fallback font still fits 340 px, and the longest shop line wraps.
  - In title mode the panel and basket are still hidden.

- [ ] **Step 2: REVIEW STOP.** The user looks at the restyled panel in the running game and approves it, or lists changes to make before merging.

- [ ] **Step 3: Update the roadmap.** Mark piece 4 done, note any deferred minors, and point "How to resume" at what comes next.

- [ ] **Step 4: Verify and commit.** `npm test && npm run build`, then `git commit -am "docs: record piece 4 progress"`
