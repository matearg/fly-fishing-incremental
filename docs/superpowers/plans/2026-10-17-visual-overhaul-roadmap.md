# Visual overhaul: roadmap and progress

Overhaul of menus, animations and assets, split into four pieces agreed with the user on 2026-10-17. Each piece goes through the same steps: brainstorm, then design doc in `docs/superpowers/specs/`, then plan in `docs/superpowers/plans/`, then build.

## Progress

| # | Piece | Status |
|---|-------|--------|
| 1 | Tying bench rework | **Done**, merged to `master` (`cc389c0`) |
| 2 | Title screen + main menu | **Done**, merged to `master` (`c8cc002`). Spec `specs/2026-10-17-title-screen-design.md`. Its plan was deleted once done; it's in git history up to `c8cc002` |
| 3 | Fishing scene art + single helper + visible bites + per-place banks | **Built, awaiting review stop 4** (the animations) on branch `fishing-scene`. Spec `specs/2026-10-17-fishing-scene-design.md`, plan `plans/2026-10-17-fishing-scene.md`. Final review's minors: `plans/2026-10-17-fishing-scene-minors.md` |
| 4 | Panel icons + owned-unlock styling | Not started |

## Decisions already made (carry into pieces 3 and 4)

### Art, for every piece
- All art is **drawn from scratch in code**: pixel grids (`string[]` + palette) baked by pure functions in `src/art/` (`paint`, `stylize`, `blit`, `scaleMask`), then uploaded with `addBitmap` (`src/scene/textures.ts`). No third-party packs, so no credits file.
- The style is the one the user approved at the title review stops: thick dark outlines, stepped gradients, chunky pixels on the 480×270 canvas.
- **Fish are generic:** a few base shapes, recolored per species (`FISH_COLORS` in `src/art/fish.ts`), with size growing by rarity tier, which also tracks price. The title uses the top-down shapes (`FISH_TOP`). Piece 3 needs **side-view** shapes in the same spirit, reusing `FISH_COLORS`.
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
- *Proposed:* show the bench cooldown as a progress bar.

### Bench (piece 1, as built)
- A 10 s cooldown, cut by 25% per extra bench. It ties 1 fly per cooldown. The box holds at most 1 fly per angler, you included. The cooldown pauses while the box is full. Big River was made cheaper (12,000) to keep the pacing test smooth. The first season now takes about 47 minutes for the test bot.

### Saving
- No manual save button. The user said "leave the save as it is": autosave every 5 s, plus saving on tab hide, page close, and going back to the menu. Nothing is saved while the title or menu is up.

## Deferred minors (from the title screen's final review)
- Settings → Fullscreen throws a TypeError on iPhone Safari (no `requestFullscreen`). Fix: show the item only when `document.fullscreenEnabled` is true.
- A Space or Esc pressed on the exact frame the title's fade ends can reach the fishing scene, causing one cast or an instant return to the menu. Fix: ignore input for one frame after `wake`.
- The Creek and the River share the same backdrop fish and pad layout, because `RiverBackdrop` seeds from the place id's length. Fix: seed from a hash of the id.
- `FishingScene` keeps its own `TIER_COUNT`, which duplicates `TIER_SCHOOL` in `src/art/fish.ts`. Merge them during piece 3.

## How to resume
Piece 3 is built on branch `fishing-scene` and waits on review stop 4 (the animations in the running game). After approval: fix the minors (`plans/2026-10-17-fishing-scene-minors.md`), do Task 6 Step 9 of the fishing scene plan (mark this row done, drop the two deferred minors piece 3 fixed: the backdrop seed and `TIER_COUNT`), and ask the user before merging to `master`.
