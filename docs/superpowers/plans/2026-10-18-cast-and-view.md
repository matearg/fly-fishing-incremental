# Cast and View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-motion fly cast, a straight line ending in the tied fly's sprite, a canvas that fills its cell without bars, a fixed 3-row basket, and crisp pixel-font HUD text.

**Architecture:** The world stays 480×270. `main.ts` sizes the game to a crop of that world that matches `#game`'s aspect ratio, and each scene scrolls its camera to choose which part is shown. Pure crop math goes in `src/scene/view.ts`, and pure cast geometry in `choreo.ts`, both unit-tested. New art goes through `src/art/` and a review stop.

**Tech Stack:** TypeScript, Phaser 4.2, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-cast-and-view-design.md`

## Global Constraints

- `src/game/` is untouched, and `pacing.test.ts` stays green without edits.
- `VIEW_W = 480`, `VIEW_H = 270`, and `pixelArt: true` stay as they are.
- Cast timing: back 350 ms, straighten 250 ms, forward 400 ms (`CAST_MS = 1000`), sink 400 ms. `CAST_MS + SINK_MS < TIMING.biteMinMs`.
- New art (back pose, line flies) is shown on `/preview.html`, and the user approves it before Task 5 starts.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Switching title ↔ game must resize the canvas right away. The cell goes from the full window to window minus panel and basket, and `ResizeObserver` on `#game` catches both. Check this by hand in Task 6.
2. Clicks must land where they look, even with the camera scrolled. The menu button is pinned with `setScrollFactor(0)`, and title items are world objects that the camera scroll applies to. Check by hand in Task 6.
3. A save with a fly pattern id that has no line-fly art must not throw: `lineFlyBitmap` falls back to `basicDry`. A test covers this in Task 4.
4. Past the zoom limit, the bars must be on the cropped axis, not a further crop. `viewSize` returns `clamped`, and `main.ts` uses `FIT` then. Tests cover it in Task 1.
5. A basket with zero catches is the same height as a full one. Check by hand in Task 2.

---

### Task 1: Crop math and canvas fill

**Files:**
- Create: `src/scene/view.ts`, `src/scene/view.test.ts`
- Modify: `src/main.ts`, `src/scene/fishing/FishingScene.ts`, `src/scene/title/TitleScene.ts`

**Interfaces:**
- Produces: `interface Rect { x0: number; y0: number; x1: number; y1: number }`. `viewSize(cellW: number, cellH: number, keep: Rect): { w: number; h: number; clamped: boolean }`. `viewScroll(w: number, h: number, keep: Rect, anchor: [number, number]): [number, number]`. `FISHING_KEEP: Rect = { x0: 0, y0: 50, x1: 300, y1: 262 }`, anchor `[0, 1]`. `TITLE_KEEP: Rect = { x0: 140, y0: 2, x1: 340, y1: 236 }`, anchor `[0.5, 0.5]`. All exported from `view.ts`.

- [ ] **Step 1: Write the failing tests** in `view.test.ts`:
  - `viewSize(1600, 900, FISHING_KEEP)` → `{ w: 480, h: 270, clamped: false }`
  - `viewSize(1026, 618, FISHING_KEEP)` → `w === 448` (rounded `270 * aspect`), `h === 270`, not clamped
  - `viewSize(2000, 900, FISHING_KEEP)` → `w === 480`, `h === 216`, not clamped
  - `viewSize(3000, 900, FISHING_KEEP)` → `h === 212` (the keep height), `clamped: true`
  - `viewSize(300, 900, FISHING_KEEP)` → `w === 300`, `clamped: true`
  - `viewScroll(480, 230, FISHING_KEEP, [0, 1])` → `[0, 40]` (sky cut first)
  - `viewScroll(480, 212, FISHING_KEEP, [0, 1])` → `[0, 50]` (cap reached; the rest comes off the bottom)
  - `viewScroll(448, 270, FISHING_KEEP, [0, 1])` → `[0, 0]` (fisher side kept)
  - `viewScroll(400, 250, TITLE_KEEP, [0.5, 0.5])` → `[40, 2]` (centered, but the logo's top keeps the crop from going lower)
- [ ] **Step 2: Run** `npx vitest run src/scene/view.test.ts`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement `view.ts`.** `viewSize`: if the cell is wider than 16:9, `w = 480` and `h = round(480 / aspect)`, else `h = 270` and `w = round(270 * aspect)`. Then raise `w` to at least the keep width and `h` to at least the keep height, setting `clamped` when either one is raised. `viewScroll` on each axis: `clamp(anchor * (world - size), keep.max - size, keep.min)`, then clamp to `[0, world - size]`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Wire it up.**
  - `main.ts`: a `ResizeObserver` on `#game` calls `fit()`. `fit()` picks `TITLE_KEEP` or `FISHING_KEEP` from `session.mode`, sets `game.scale.scaleMode = clamped ? Phaser.Scale.FIT : Phaser.Scale.ENVELOP`, then calls `game.scale.setGameSize(w, h)`. `titleMode()` calls `fit()` after toggling the class. ENVELOP covers the rounding gap; FIT shows the bars past the limit.
  - Each scene's `update()` calls `this.cameras.main.setScroll(...viewScroll(this.scale.width, this.scale.height, KEEP, ANCHOR))`.
  - FishingScene HUD (helper text, place text, menu button) gets `setScrollFactor(0)`, and its x is set every update from `this.scale.width`, so the right-hand items sit at `width - 4` and `width - 22`.
  - The world-sized statics (horizon, water, bank) already cover 480×270.
- [ ] **Step 6:** Run `npm test && npm run build`. Expected: all pass.
- [ ] **Step 7: Commit:** `feat: fill the game cell by cropping instead of letterboxing`

### Task 2: Basket fixed at 3 rows

**Files:** Modify `src/ui/style.css`.

- [ ] **Step 1:** In `.items`, replace `max-height: 96px` with a fixed `height` of 3 tile rows plus 2 gaps. Give `.items button` a fixed `height` so rows don't vary by fish sprite. Measure the tallest tile in the dev server (legendary and special fish) and use that height. 3 rows must fit exactly, and a 4th row scrolls.
- [ ] **Step 2:** Check by hand on `npm run dev`: an empty basket, 1 row, and 4+ rows all render at the same footer height, and the canvas doesn't resize.
- [ ] **Step 3: Commit:** `feat: fixed 3-row basket`

### Task 3: Pixel-font HUD text

**Files:** Modify `src/scene/textures.ts`, `src/scene/title/TitleScene.ts`, `src/scene/fishing/FishingScene.ts`.

**Interfaces:**
- Produces: `addText(scene: Phaser.Scene, label: string, style: TextStyle): string` in `textures.ts`. It bakes `stylize(textMask(label, SMALL), style)` under the key `txt:${hex of style.top}:${label}`, reuses the texture if one exists, and returns the key. `TEXT_WHITE` and `TEXT_YELLOW` are exported from `textures.ts`, moved from TitleScene's `WHITE` and `YELLOW`.

- [ ] **Step 1:** TitleScene's private `text()` becomes `addText(this, label, sel ? TEXT_YELLOW : TEXT_WHITE)`.
- [ ] **Step 2:** In FishingScene, `placeText`, `helperText` and `biteText` become `Image`s. Each update calls `setTexture(addText(this, label.toUpperCase(), …))`: white for the name and `HELPERS n`, yellow for `!`. Keep the same origins and positions as today.
- [ ] **Step 3:** Run `npm test && npm run build`. Expected: pass. Check on the dev server that the text is crisp.
- [ ] **Step 4: Commit:** `feat: pixel-font HUD text`

### Task 4: Art — back pose and line flies (review stop)

**Files:**
- Modify: `src/art/sprites/figures.ts`, `src/art/sprites/figures.test.ts`, `src/preview.ts`
- Create: `src/art/sprites/flies.ts`, `src/art/sprites/flies.test.ts`

**Interfaces:**
- Produces:
  - `Pose = 'idle' | 'back' | 'cast' | 'reel'`.
  - Every pose grid gets `PAD_L = 6` columns on the left and `PAD_T = 8` rows on top, so the back-cast rod fits. `export const BODY_X = PAD_L`: scenes place sprites at `x - BODY_X`. `FEET_Y` and `ROD_TIP` include the padding.
  - In `flies.ts`: `LINE_FLIES: Record<string, Grid>`, about 7×5 per `PATTERNS` id, using the keys of `FLY_ICONS[id].palette`. `LINE_FLY_EYE: Record<string, [number, number]>` is where the line ties on. `lineFlyBitmap(patternId: string): Bitmap` falls back to `basicDry` for unknown ids.

- [ ] **Step 1: Write the failing tests.**
  - `figures.test.ts`: add `'back'` to `POSES`. The existing tests (even rows, tip pixel is rod, feet row) then cover it. Add: `ROD_TIP.back[0] < BODY_X + 6`, so the tip is behind the head.
  - `flies.test.ts`: every `PATTERNS` id has a grid that paints without throwing. Each `LINE_FLY_EYE` is inside its grid. `lineFlyBitmap('nope')` equals the `basicDry` bitmap in size.
- [ ] **Step 2: Run** `npx vitest run src/art`. Expected: FAIL.
- [ ] **Step 3: Implement.** The `back` pose has the hand raised near the shoulder and the rod pointing up and back over the head. `figureBitmaps` returns all 4 poses. Draw the line flies to read as their patterns: dry with an upright wing, caddis with a tent wing, nymphs slim, streamers long. Add the `back` pose and a "Line flies" section to `preview.ts`, at 4×.
- [ ] **Step 4: Run** `npm test`. Expected: PASS. Then fix FishingScene's sprite x (`- BODY_X`) so the scene doesn't shift.
- [ ] **Step 5: Commit:** `feat: back-cast pose and line-fly sprites`
- [ ] **Step 6: REVIEW STOP.** Show the user `/preview.html` and wait for approval. Iterate on the art if asked.

### Task 5: Cast choreography, straight line, fly sprite

**Files:** Modify `src/scene/fishing/choreo.ts`, `src/scene/fishing/choreo.test.ts`, `src/scene/fishing/FishingScene.ts`.

**Interfaces:**
- Consumes: `Pose` and `BODY_X` (Task 4), `lineFlyBitmap` and `LINE_FLY_EYE` (Task 4).
- Produces in `choreo.ts`:
  - `BACK_MS = 350`, `STRAIGHT_MS = 250`, `FORWARD_MS = 400`, `CAST_MS = 1000`, `SINK_MS = 400` (moved from the scene), and `BACK_LEN = 34`.
  - `type Pt = [number, number]`.
  - `castPose(sinceMs: number): 'back' | 'cast' | null` replaces the boolean `castPose(waitMs, remainingMs)`.
  - `castLine(sinceMs: number, tip: Pt, land: Pt): Pt[] | null`: a polyline from `tip`, whose last point is the fly, or `null` once `sinceMs >= CAST_MS`.

- [ ] **Step 1: Write the failing tests**, replacing the old `castPose` test:
  - `CAST_MS + SINK_MS < TIMING.biteMinMs`.
  - `castPose(0) === 'back'`, `castPose(BACK_MS + STRAIGHT_MS - 1) === 'back'`, `castPose(BACK_MS + STRAIGHT_MS) === 'cast'`, `castPose(CAST_MS) === null`.
  - `castLine(0, tip, land)` ends at `tip`.
  - At `BACK_MS / 2`, the polyline's min x is less than `tip[0]`, and it has points at two different y values behind the tip (the U).
  - At `BACK_MS + STRAIGHT_MS - 1`, it ends within 1 px of `[tip[0] - BACK_LEN, tip[1] + 2]`, and all points are within 1 px of the segment from tip to that point (straight).
  - At `CAST_MS - 1`, it ends within 2 px of `land`. `castLine(CAST_MS, …)` is `null`.
- [ ] **Step 2: Run** `npx vitest run src/scene/fishing/choreo.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `castLine`.** `e = ease(k)`, with k from 0 to 1 within each motion, and the back point `B = [tip.x - BACK_LEN, tip.y + 2]`:
  - **Back:** the loop front is `L = lerp(tip, B, e)` and the gap is `g = 6`. The fly leg comes back toward the tip by `(1 - k) * |L.x - tip.x|`. The polyline is `[tip, L, [L.x - 2, L.y + g/2], [L.x, L.y + g], fly]` with `fly = [L.x + (1 - k) * (tip.x - L.x), L.y + g]`.
  - **Straighten:** the same shape at `L = B`, with `g = 6 * (1 - k)` and the fly at `[B.x, B.y + g]`.
  - **Forward:** the front is `F = lerp(tip, land, e)`, lifted by `sin(π e) * 12`, with `g = 6 * (1 - e)`. The polyline is `[tip, F, [F.x + 2, F.y + g/2], [F.x, F.y + g], fly]` with `fly = lerp(B, F, e * e)`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Scene.**
  - `pose()` uses `castPose(tr.castMs - a.timerMs)` while waiting.
  - `flyPos` returns the last point of `castLine` during the cast, then sinks over `SINK_MS`.
  - `drawLine(points)` draws the cast polyline. After the cast, it draws one straight line from the tip to the fly, split where it crosses `WATER_Y`: alpha 0.8 above, 0.45 below.
  - Each visible angler gets an `Image` (`Z.line + 0.5`) with texture `linefly:${fly.patternId}`, placed so `LINE_FLY_EYE` sits on the fly point. It is hidden while no line is out. This replaces the yellow 2×2 dot.
- [ ] **Step 6:** Run `npm test && npm run build`. Expected: pass.
- [ ] **Step 7: Commit:** `feat: three-motion cast with straight line and tied-fly sprite`

### Task 6: Verify in the browser and update the roadmap

**Files:** Modify `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md`.

- [ ] **Step 1:** On `npm run dev`, check at 1600×900, 1280×1000 and 2560×900 windows:
  - no bars where the crop is within limits;
  - the anglers, the landing spots and the deepest band are visible;
  - the HUD sits in the corners;
  - the menu button and the title items are clickable;
  - title ↔ game switches resize right away;
  - the cast plays back → straight → forward → sink, the line is straight underwater, and the fly sprite matches the selected pattern.
- [ ] **Step 2:** Add piece 5 to the roadmap progress table, and its decisions (crop limits, cast timing) to the decisions list.
- [ ] **Step 3: Commit:** `docs: record piece 5`
