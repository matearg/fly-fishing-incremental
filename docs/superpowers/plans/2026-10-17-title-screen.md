# Title Screen and Main Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boot into a Sonic-style pixel-art title screen (animated top-down river per place, arcade wordmark, PRESS START) with a Continue / New Game / Settings menu, pausing the game while it's up.

**Architecture:** A pure `Session` (mode + saving rules) replaces the loose state/save code in `main.ts`. A new Phaser `TitleScene` and the existing `FishingScene` are swapped with `scene.switch`, so the sleeping scene's input never fires. All art is code-drawn: pixel grids (`string[]` + palette) baked to RGBA buffers by pure functions in `src/art/`, then uploaded as canvas textures.

**Tech Stack:** TypeScript, Phaser 4.2.1, Vite, Vitest (node environment, no DOM).

**Spec:** `docs/superpowers/specs/2026-10-17-title-screen-design.md`

**Plan's own call:** all art is drawn from scratch in code, no CC0 packs. Generic recolored fish and five per-place palettes need palette control, and one hand-made set can't clash with itself. So there's no third-party asset and no `CREDITS.md`.

## Global Constraints

- Canvas stays 480×270, `pixelArt: true`, `Phaser.Scale.FIT`. No smoothing anywhere.
- Logo: "FLY" huge on top, "FISHING" under it, yellow→orange stepped gradient, thick dark outline, drop shadow; "INCREMENTAL" small on a tag below; bobs ≈2 px. Not a runtime-rendered font.
- Fish are generic: a few base sprites recolored per species; sprite size grows with tier (common < uncommon < rare < legendary). 2-frame tail wiggle.
- Menu: Continue (only when a valid save exists), New Game (confirm "THIS ERASES YOUR PROGRESS. ARE YOU SURE?" when a save exists), Settings (Fullscreen on/off, Back).
- Nothing is written to storage while on the title/menu; save once when leaving the game for the menu.
- Every page load starts on the title screen.
- Fullscreen uses `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`; label follows `document.fullscreenElement`.
- **Art review stops:** pause for the user's approval after Task 2 (logo) and after Task 4 (Creek backdrop). Show them via `npm run dev` plus a screenshot (`playwright-cli open --browser=chromium …`, then `screenshot`).
- Branch: `git switch -c feat/title-screen` from `feat/bench-cooldown` HEAD before Task 1.

## Review Focus

1. **Spamming Enter/click during the ≈300 ms fade** must enter the game once. TitleScene ignores input while a transition runs (Task 3, manual check in Task 6).
2. **Panels hidden/shown changes the canvas area.** After toggling title mode, call `game.scale.refresh()` so the canvas re-fits, with no letterbox stuck at the old size (Task 3, manual check in Task 6).
3. **Leaving fullscreen with the browser's own Esc/F11** must flip the Settings label to OFF (`fullscreenchange` listener, Task 3).
4. **Two tabs.** Tab A on the menu and tab B playing: A's Continue loads B's latest progress. Pinned by `continueGame re-reads the store` (Task 1).
5. **Storage blocked (private mode).** `hasSave()` is false, nothing throws, New Game still plays. Pinned by `blocked storage` (Task 1); `localStore` itself keeps the existing try/catch.

---

### Task 1: Session (mode and saving rules)

**Files:**
- Modify: `src/game/save.ts`: extract `parseSave`; replace `saveToStorage`/`loadFromStorage` with `localStore`
- Create: `src/session.ts`
- Test: `src/session.test.ts`, `src/game/save.test.ts`
- Modify: `src/main.ts`: use `Session` (still enters the game straight away; the title arrives in Task 2)

**Interfaces:**
- Produces:
  - `parseSave(raw: string | null): GameState | null` in `save.ts` (the current validity check plus `sanitize`; null when invalid). `deserialize(raw)` becomes `parseSave(raw) ?? newGame()`.
  - `interface SaveStore { read(): string | null; write(raw: string): void }` and `localStore: SaveStore` in `save.ts` (localStorage under `SAVE_KEY`; both methods swallow exceptions; `read` returns null on throw).
  - `class Session` in `src/session.ts`:
    - `mode: 'title' | 'game'` (starts `'title'`), `state: GameState` (constructor: `deserialize(store.read())`)
    - `constructor(store: SaveStore)`
    - `hasSave(): boolean`: `parseSave(store.read()) !== null`
    - `continueGame(): void`: `state = deserialize(store.read())`, `mode = 'game'`
    - `startNewGame(): void`: `state = newGame()`, write it, `mode = 'game'`
    - `toMenu(): void`: if in game, write state; `mode = 'title'`
    - `save(): void`: writes only when `mode === 'game'`
    - `replace(s: GameState): void`: `state = s`, then `save()` (for the panel's New Season)
    - `adopt(raw: string | null): void`: `state = deserialize(raw)` (other tab, or tab becoming visible)

- [ ] **Step 1: Write failing tests** in `src/session.test.ts` with an in-memory store (`{ raw: null as string | null, read() { return this.raw }, write(r) { this.raw = r } }`):
  - `fresh store: no save, title mode, save() writes nothing`: `hasSave()` false, `mode === 'title'`, after `save()` the store's raw is still null.
  - `startNewGame writes a save and enters the game`: raw not null, `hasSave()` true, `mode === 'game'`, `state` equals `newGame()`.
  - `toMenu writes the current state once`: after `startNewGame()`, set `state.money = 123`, call `toMenu()`; `deserialize(raw).money === 123` and `mode === 'title'`; then `state.money = 5`, `save()` leaves the raw money at 123.
  - `corrupt save counts as no save`: raw `'{oops'` gives `hasSave()` false.
  - `continueGame re-reads the store`: a session built on a store with save A; then write save B (money 999) directly to the store; `continueGame()` gives `state.money === 999`.
  - `blocked storage`: a store whose `read()` returns null and whose `write` is a no-op (what `localStore` does when localStorage throws). `hasSave()` false; `startNewGame()` doesn't throw; `mode === 'game'`.
- In `save.test.ts` add `parseSave returns null for each corrupt case`, reusing the existing `it.each` table.

- [ ] **Step 2: Run** `npx vitest run src/session.test.ts src/game/save.test.ts`. Expected: FAIL (module/exports missing).

- [ ] **Step 3: Implement** `parseSave`, `SaveStore`, `localStore` and `Session` as specified. Delete `saveToStorage`/`loadFromStorage` (only `main.ts` uses them).

- [ ] **Step 4: Rewire `src/main.ts`** to one `const session = new Session(localStore)`:
  - panel: `getState = () => session.state`, `setState = s => { session.replace(s); panel.render() }`
  - for now call `session.continueGame()` at boot, so behaviour is unchanged until Task 2
  - rAF loop: when `session.mode !== 'game'`, set `last = null` and skip ticking (this is the "no catch-up on return" rule)
  - `visibilitychange`: hidden → `session.save(); last = null`; visible → `session.adopt(localStore.read()); panel.render()`
  - `storage` event → `session.adopt(e.newValue)`
  - `pagehide` and the 5 s interval → `session.save()`

- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit`. Expected: all pass. Then `npm run dev`, play 10 s, reload: progress persists.

- [ ] **Step 6: Commit** `git commit -m "refactor: session owns mode and saving rules"`

---

### Task 2: Pixel art core, fonts, logo, minimal TitleScene → **ART REVIEW STOP 1**

**Files:**
- Create: `src/art/pixels.ts`, `src/art/font.ts`, `src/art/logo.ts`, `src/scene/TitleScene.ts`, `src/scene/textures.ts`
- Test: `src/art/pixels.test.ts`, `src/art/logo.test.ts`
- Modify: `src/main.ts`: register `TitleScene` first; boot into it

**Interfaces:**
- Produces:
  - `pixels.ts`:
    - `type Grid = string[]` (one char per pixel, `'.'` = transparent)
    - `interface Bitmap { w: number; h: number; data: Uint8ClampedArray }` (RGBA)
    - `paint(grid: Grid, palette: Record<string, number>): Bitmap` (palette values `0xRRGGBB`; an unknown char throws)
    - `interface TextStyle { top: number; bottom: number; outline: number; outlineW: number; shadow?: number }`
    - `stylize(mask: { w: number; h: number; on: Uint8Array }, style: TextStyle): Bitmap`: fill colour steps from `top` to `bottom` in 4 bands down the mask's inked rows; ring of `outlineW` px in `outline`; optional 2 px down-right `shadow`; canvas grows to fit
  - `font.ts`:
    - `BIG: Record<string, Grid>`: chunky glyphs for `F L Y I S H N G`, cap height 14–16 px, strokes ≥3 px
    - `SMALL: Record<string, Grid>`: 5×7 glyphs for `A–Z 0–9 . , ? : ! -` and space
    - `textMask(text: string, glyphs: Record<string, Grid>, spacing = 1)`, returning `{ w, h, on }` (an unknown char throws)
  - `logo.ts`: `bakeLogo(): Bitmap`. "FLY" with BIG scaled ×2 (nearest-neighbour) over "FISHING" with BIG ×1, then the INCREMENTAL tag in SMALL; total ≤ 300 px wide, stacking as in the mockup (option B in `.superpowers/brainstorm/*/content/title-screen.html`). Colours from the mockup: top `0xffe45c`, bottom `0xff5a1f`, outline `0x2a0a3d`, shadow at 35% alpha, the INCREMENTAL tag `0xd42a7a` on `0x2a0a3d`
  - `textures.ts`: `addBitmap(scene: Phaser.Scene, key: string, bmp: Bitmap): void`, which uploads via `scene.textures.createCanvas(key, w, h)` + `putImageData` + `refresh()`; skips if the key exists
  - `TitleScene` (key `'title'`): `constructor(hooks: TitleHooks)`, where `interface TitleHooks { session: Session; enterGame(kind: 'continue' | 'new'): void }`. In this task: logo centred with bob, blinking `PRESS START` (SMALL, white with black outline), placeholder flat water `0x2a7499`; any key/pointer → `hooks.enterGame('continue')`.

- [ ] **Step 1: Write failing tests**
  - `paint maps palette chars and leaves '.' transparent`: grid `['a.', '.b']` gives pixel (0,0) RGBA = palette a with alpha 255, and pixel (1,0) alpha 0.
  - `paint throws on unknown char`.
  - `stylize outlines every inked pixel`: for a 1-pixel mask with `outlineW: 2`, all 8 neighbours at distance 1 and 2 are the outline colour.
  - `stylize gradient: first inked row is top colour, last is bottom`.
  - `textMask width = sum of glyph widths + spacing`, and it throws on an unknown char.
  - `bakeLogo fits the canvas`: `w <= 300 && h <= 110`.
  - `every SMALL glyph is 5 wide and 7 tall`.

- [ ] **Step 2: Run** `npx vitest run src/art`. Expected: FAIL.

- [ ] **Step 3: Implement** `pixels.ts`, `font.ts`, `logo.ts`, `textures.ts`, `TitleScene` as specified. In `main.ts`: `scene: [title, fishing]` (the first one runs), `enterGame` does `session.continueGame(); game.scene.switch('title', 'fishing')`, and the boot-time `continueGame()` from Task 1 is removed.

- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: pass.

- [ ] **Step 5: Commit** `git commit -m "feat(title): code-drawn logo and press start"`

- [ ] **Step 6: ART REVIEW STOP 1.** Run `npm run dev`, take a screenshot, and show the user the logo. Iterate on glyphs/colours until they approve. Do not start Task 3 before approval.

---

### Task 3: Menu, settings, title mode, back to menu

**Files:**
- Create: `src/scene/menu.ts`
- Test: `src/scene/menu.test.ts`
- Modify: `src/scene/TitleScene.ts`, `src/scene/FishingScene.ts`, `src/main.ts`, `src/ui/style.css`

**Interfaces:**
- Consumes: `Session` (Task 1), `TitleHooks`/`SMALL`/`textMask`/`stylize`/`addBitmap` (Task 2)
- Produces:
  - `menu.ts` (pure):
    - `type MenuPage = 'attract' | 'main' | 'settings' | 'confirmNew'`
    - `interface MenuState { page: MenuPage; index: number }`
    - `interface MenuCtx { hasSave: boolean; fullscreen: boolean }`
    - `type MenuKey = 'up' | 'down' | 'select' | 'back' | 'any'`
    - `type MenuAction = 'continue' | 'newGame' | 'toggleFullscreen'`
    - `menuItems(page: MenuPage, ctx: MenuCtx): { id: string; label: string }[]`
    - `menuInput(m: MenuState, key: MenuKey, ctx: MenuCtx): { next: MenuState; action?: MenuAction }`
  - `TitleHooks` gains `toggleFullscreen(): void` and `isFullscreen(): boolean`; `enterGame` stays.
  - `SceneHooks` (FishingScene) gains `onMenu(): void`.

Exact labels: main `CONTINUE` (only if `hasSave`), `NEW GAME`, `SETTINGS`; settings `FULLSCREEN: ON` / `FULLSCREEN: OFF`, `BACK`; confirmNew prompt `THIS ERASES YOUR PROGRESS.` / `ARE YOU SURE?` with items `NO` (index 0, default) and `YES`.

- [ ] **Step 1: Write failing tests** in `menu.test.ts`:
  - `attract: any key opens main at index 0`.
  - `main without save has no CONTINUE`; `with save CONTINUE is first`.
  - `up/down wrap around`.
  - `select CONTINUE → action continue`.
  - `select NEW GAME with save → confirmNew at index 0 (NO), no action`; `without save → action newGame`.
  - `confirmNew: select YES → newGame; select NO or back → main`.
  - `settings: select FULLSCREEN → toggleFullscreen and the page stays settings; label follows ctx.fullscreen`.
  - `back from settings → main; back on main does nothing`.

- [ ] **Step 2: Run** `npx vitest run src/scene/menu.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `menu.ts`.**

- [ ] **Step 4: TitleScene menu UI.**
  - On leaving attract, the logo tweens up (≈20 px, 250 ms), and the items render under it in SMALL text with a small fish cursor (a Grid in `TitleScene` or `art/fish.ts` once Task 4 lands; a 7×4 placeholder grid is fine here) left of the selected one.
  - Keys: ↑/W → up, ↓/S → down, Enter/Space → select, Esc → back, anything else on attract → any.
  - Pointer: hover sets the index, click selects.
  - `create()` and every `wake` event reset the page: attract on first boot, main when coming back from the game.
  - Actions:
    - `continue` → `enterGame('continue')`
    - `newGame` → `enterGame('new')`
    - `toggleFullscreen` → hooks
  - A `busy` flag ignores all input from the moment an enter action fires until the scene sleeps.
  - Enter fades: `cameras.main.fadeOut(300)`, then the hook switches scenes; FishingScene `fadeIn(300)` on wake.

- [ ] **Step 5: main.ts and CSS.**
  - `enterGame(kind)`: kind `'new'` → `session.startNewGame()`, else `session.continueGame()`; then `document.body.classList.remove('title-mode')`, `panel.render()`, `game.scale.refresh()`, `game.scene.switch('title', 'fishing')`.
  - `onMenu`: `session.toMenu()`, add `title-mode`, `game.scale.refresh()`, `game.scene.switch('fishing', 'title')`.
  - Fullscreen hooks use the document API; on `fullscreenchange`, the TitleScene re-renders its items.
  - `index.html` body starts with class `title-mode`.
  - CSS: `.title-mode .side, .title-mode .basket { display: none }` and `.title-mode #game { grid-column: 1 / -1; grid-row: 1 / -1 }`.

- [ ] **Step 6: FishingScene back button.** Add a 12×12 code-drawn "≡" button at the top-right corner (move `placeText` left of it) that calls `hooks.onMenu()`; its pointerdown must not also cast, so the water handler ignores pointers over the button. Esc → `onMenu()`.

- [ ] **Step 7: Run** `npx vitest run && npx tsc --noEmit`. Then use `npm run dev` to manually check: first load shows attract; with no save, CONTINUE is absent; New Game enters the game, Esc returns to the menu, CONTINUE is now present and resumes the same money; New Game asks to confirm, NO goes back, YES resets; fullscreen toggles, and the browser's Esc flips the label; panels hide/show and the canvas re-fits.

- [ ] **Step 8: Commit** `git commit -m "feat(title): main menu, settings, back to menu"`

---

### Task 4: Fish sprites, Creek look, river backdrop → **ART REVIEW STOP 2**

**Files:**
- Create: `src/art/fish.ts`, `src/art/places.ts`, `src/scene/RiverBackdrop.ts`
- Move: `lcg` from `src/game/testutil.ts` to `src/game/rand.ts` (testutil re-exports it)
- Test: `src/art/fish.test.ts`, `src/art/places.test.ts`
- Modify: `src/scene/TitleScene.ts`: replace the placeholder water with `RiverBackdrop`

**Interfaces:**
- Consumes: `paint`, `Grid`, `addBitmap` (Task 2); `SPECIES`, `TIERS`, `LocationId` from `data.ts`
- Produces:
  - `fish.ts`:
    - `FISH_TOP: Record<Tier, [Grid, Grid]>`: top-down, 2 frames, palette chars `o` outline, `b` body, `a` accent (back/spots), `f` fins, `e` eye. Sizes about common 10×5, uncommon 13×6, rare 16×7, legendary 20×9.
    - `FISH_COLORS: Record<string, { b: number; a: number; f: number }>`: one entry per species id in `SPECIES`
    - `fishBitmaps(speciesId: string): [Bitmap, Bitmap]`
    - `TIER_SCHOOL: Record<Tier, number> = { common: 3, uncommon: 2, rare: 1, legendary: 1 }`: moved from FishingScene's `TIER_COUNT`, which now imports it
  - `places.ts`:
    - `interface PlaceLook { water: number[]; ripple: number; bank: number; edge: number; riverH: number; decor: { grid: Grid; palette: Record<string, number>; perBank: number }[] }`
    - `PLACE_LOOKS: Record<LocationId, PlaceLook>` (this task fills `creek` only; the others temporarily point at creek's look)
    - `riverH` is the water height in px (Creek narrow, about 150)
  - `RiverBackdrop`: `new RiverBackdrop(scene: Phaser.Scene, location: LocationId)`, `update(timeMs: number)`, `destroy()`. It draws banks top and bottom with seeded decor (`lcg`), water bands, ripples and lily pads drifting with the current (left → right), and a school per species at that location: those without `licenseCost`, or bought in `session.state.licenseSpecies`, with counts from `TIER_SCHOOL`. Fish swim mostly with the current (≈20% against), bob ±2 px, and wiggle at about 4 Hz.

- [ ] **Step 1: Write failing tests**
  - `every species has colours` (all `SPECIES` ids are in `FISH_COLORS`).
  - `fish sprites grow with tier`: the width of `FISH_TOP[tier][0]` strictly increases along `TIERS`, and both frames have equal size.
  - `within a place, pricier fish are never drawn smaller`: for each location, sort species by `baseValue`; the tier index never decreases. This guards the "size matches rarity and price" rule against data edits.
  - `every place has a look with ≥3 water colours and riverH between 100 and 230`.
  - `paint accepts every decor grid with its palette` (no throw).

- [ ] **Step 2: Run** `npx vitest run src/art`. Expected: FAIL.

- [ ] **Step 3: Implement** `fish.ts`, `places.ts` (Creek: light water, grass banks, pebbles, small tufts) and `RiverBackdrop`; TitleScene builds one for `session.state.location` on create/wake (destroying the previous one).

- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: pass.

- [ ] **Step 5: Commit** `git commit -m "feat(title): animated creek backdrop with generic fish"`

- [ ] **Step 6: ART REVIEW STOP 2.** Show the user the Creek title (screenshot plus the dev URL so they can watch it move). Iterate until approved. Do not start Task 5 before approval.

---

### Task 5: The other four places

**Files:**
- Modify: `src/art/places.ts`
- Test: `src/art/places.test.ts`

- [ ] **Step 1: Add the test** `no two places share a look`: the `water[0]` + `bank` pairs are all distinct.
- [ ] **Step 2: Run it.** Expected: FAIL (they all point at creek).
- [ ] **Step 3: Fill in the looks** with their own decor grids, matching the Creek's approved style:
  - `river`: wider, sandy edge, reeds
  - `bigRiver`: darker water, mud banks, logs
  - `mountainLake`: clear blue-green, rocky banks, pines
  - `greatLake`: deep blue, beach, wooden dock
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`, then check each place in the browser (dev console: set `location` in the save, reload) and screenshot all five for the user.
- [ ] **Step 5: Commit** `git commit -m "feat(title): per-place river looks"`

---

### Task 6: Final verification

- [ ] `npx vitest run`, `npx tsc --noEmit` and `npm run build` all pass.
- [ ] Manual pass in Chromium (`playwright-cli open --browser=chromium` against `npm run dev`). Walk the Review Focus list: spam Enter on Continue (enters once); resize the window on the title and in the game; leave fullscreen with Esc; two tabs (play in B, Continue in A shows B's money); reload on the menu (no new save written when there was none).
- [ ] Report to the user with screenshots; the branch is ready for review.
