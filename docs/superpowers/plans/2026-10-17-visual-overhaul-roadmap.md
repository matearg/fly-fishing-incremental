# Visual overhaul: roadmap and progress

Overhaul of menus, animations and assets, split into four pieces agreed with the user on 2026-10-17. Each piece goes through the same steps: brainstorm, then design doc in `docs/superpowers/specs/`, then plan in `docs/superpowers/plans/`, then build.

## Progress

| # | Piece | Status |
|---|-------|--------|
| 1 | Tying bench rework | **Done**, merged to `master` (`cc389c0`) |
| 2 | Title screen + main menu | **Done**, merged to `master` (`c8cc002`). Spec and plan deleted once done; in git history up to `3a27cc7` (spec) and `c8cc002` (plan) |
| 3 | Fishing scene art + single helper + visible bites + per-place banks | **Done**, merged to `master` (`cedadcc`). Spec, mockup and plans deleted once done; in git history up to `3a27cc7` |
| 4 | Panel icons + owned-unlock styling (grew: field-journal look, stacked basket, bench bar, bulk trash) | **Built** on `feat/panel-journal`, approved by the user 2026-10-18; not merged yet. Spec `docs/superpowers/specs/2026-10-18-panel-journal-style-design.md`, plan `docs/superpowers/plans/2026-10-18-panel-journal-style.md` |

## Decisions already made (carry into pieces 3 and 4)

### Art, for every piece
- All art is **drawn from scratch in code**: pixel grids (`string[]` + palette) baked by pure functions in `src/art/` (`paint`, `stylize`, `blit`, `scaleMask`), then uploaded with `addBitmap` (`src/scene/textures.ts`). No third-party packs, so no credits file.
- The style is the one the user approved at the title review stops: thick dark outlines, stepped gradients, chunky pixels on the 480×270 canvas.
- **Fish are generic:** a few base shapes, recolored per species (`FISH_COLORS` in `src/art/sprites/fish.ts`), with size growing by rarity tier, which also tracks price. The title uses the top-down shapes (`FISH_TOP`). Piece 3 needs **side-view** shapes in the same spirit, reusing `FISH_COLORS`.
- **Each place has its own look** (`PLACE_LOOKS` in `src/art/places.ts`): Creek has grass, pebbles and flowers; River has sand and reeds; Big River has mud and logs; Mountain Lake has rocks and pines; Great Lake has a beach and a dock. Piece 3 should give the side-view fishing scene the same palettes, so the player feels the progress.
- The user wants **art review stops** (approve before continuing) for new art.

### Piece 3: fishing scene (user's requirements)
- **Real art** for your angler, the helper, and the fish. No more boxes.
- Show **only one helper** on the bank, with its line in the water whenever flies are available. Put a **helper count** in the top-left corner.
- **Fish visibly swim to your fly and bite it.** This happens for your angler only; helpers' catches stay invisible.
- *Proposed, not yet confirmed:* keep the side view with depth bands, because fly depth decides what you can catch; animate casting and reeling, the fish tail wiggle, and the line and fly bobbing; when there are no flies, the helper stands idle with no line.
- The fishing scene already has the corner menu button (top-right) and Esc to go back to the menu. Keep them.

### Piece 4: panels (user's requirements)
- **Add icons** to the shop, helpers, places, season and basket panels.
- **Owned unlocks should clearly look owned**, not just like a disabled button.
- Bench cooldown progress bar: confirmed. No bar for the hired anglers (user dropped it).
- Brainstorm 2026-10-18 added: whole panel and basket in a "field journal" pixel style (Silkscreen + Pixelify Sans from Google Fonts, approved by the user as the one outside asset), a unique icon per item with flies drawn like the real patterns, and a basket stacked by kind that opens to list catches. Details in the spec.

### Piece 4 (as built, plus the user's changes at the final review)
- The trash drop target and drag-and-drop are gone. Each row of an open stack has a trash-can button instead of ✕.
- New one-off helper **Bulk trash** ($300, `state.bulkTrash`, rule `trashStack` in `progress/economy.ts`): it adds "Trash all" to an open stack. It never appears on a closed tile, so one click still can't throw away a stack. It reuses the approved trash-can icon.
- The Junk sorter went from $300 to $450 to make room. The pacing bot buys Bulk trash too; season 1 is now 49.98 sim-min against the 50 limit (it was 48.71), so the next rebalance has almost no slack there.

### Bench (piece 1, as built)
- A 10 s cooldown, cut by 25% per extra bench. It ties 1 fly per cooldown. The box holds at most 1 fly per angler, you included. The cooldown pauses while the box is full. Big River was made cheaper (12,000) to keep the pacing test smooth. The first season now takes about 47 minutes for the test bot.

### Saving
- No manual save button. The user said "leave the save as it is": autosave every 5 s, plus saving on tab hide, page close, and going back to the menu. Nothing is saved while the title or menu is up.

## Deferred minors (from the title screen's final review)
- Settings → Fullscreen throws a TypeError on iPhone Safari (no `requestFullscreen`). Fix: show the item only when `document.fullscreenEnabled` is true.
- A Space or Esc pressed on the exact frame the title's fade ends can reach the fishing scene, causing one cast or an instant return to the menu. Fix: ignore input for one frame after `wake`.

## Deferred minors (from the fishing scene's minors review)
- `MENU_BUTTON` (`src/scene/fishing/FishingScene.ts`) and `CURSOR` (`src/scene/title/TitleScene.ts`) are the only pixel grids with no test. `paint` now throws on ragged rows, so a bad edit to either crashes the game at boot. Fix: one test that paints both, or move them into tested art modules.
- The scene code that hides a landed fish (`Chosen.lastPhase` passed to `releaseOffscreen`) is only checked by a manual run, because the scene has no unit-test harness.

## Deferred minors (from piece 4's final review)
- When the box is full and the bench timer sits at 0, the bench bar is an empty outline; only the "Box full" label shows the paused state.
- Season 1 pacing is 0.02 sim-min under the 50-minute limit (see Piece 4 above).

## How to resume
Piece 4 is built on `feat/panel-journal` and approved. Next: merge it into `develop`, then delete its spec and plan as with earlier pieces. All four pieces of the overhaul are then done.
