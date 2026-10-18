# Visual overhaul: roadmap and progress

Overhaul of menus, animations and assets, split into four pieces agreed with the user on 2026-10-17. Each piece goes through the same steps: brainstorm, then design doc in `docs/superpowers/specs/`, then plan in `docs/superpowers/plans/`, then build.

## Progress

| # | Piece | Status |
|---|-------|--------|
| 1 | Tying bench rework | **Done**, merged to `master` (`cc389c0`) |
| 2 | Title screen + main menu | **Done**, merged to `master` (`c8cc002`). Spec and plan deleted once done; in git history up to `3a27cc7` (spec) and `c8cc002` (plan) |
| 3 | Fishing scene art + single helper + visible bites + per-place banks | **Done**, merged to `master` (`cedadcc`). Spec, mockup and plans deleted once done; in git history up to `3a27cc7` |
| 4 | Panel icons + owned-unlock styling (grew: field-journal look, stacked basket, bench bar, bulk trash) | **Done**, merged to `develop` (`cb6c9a7`). Spec and plan deleted once done; in git history up to `cb6c9a7` |
| 5 | Cast animation, canvas fill without bars, fixed 3-row basket, pixel-font HUD, tied-fly sprite on the line | **Built** on `feat/cast-and-view`, not merged yet. Spec `docs/superpowers/specs/2026-10-18-cast-and-view-design.md`, plan `docs/superpowers/plans/2026-10-18-cast-and-view.md` |
| 6 | Sounds: synthesized fishing, menu, panel and purchase sounds, water ambience per place, volume/mute row in Settings | **Built** on `feat/sounds`, not merged yet. Spec `docs/superpowers/specs/2026-10-18-sounds-design.md`, plan `docs/superpowers/plans/2026-10-18-sounds.md` |

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

### Piece 5 (as built)
- **Canvas fill:** the world stays 480×270. `main.ts` sizes the game to a crop of it matching `#game`'s aspect (`viewSize` in `src/scene/view.ts`, ENVELOP scale mode), and each scene scrolls its camera (`viewScroll`). The HUD is pinned with `setScrollFactor(0)`.
- **Zoom limits:** fishing keeps world x 0–300 and y 50–262 in view (bank, figures, Great Lake landing spot, back-cast loop, deepest band); it cuts sky first, then deep water. Title keeps x 140–340, y 2–236, centered. Past a limit the game switches to FIT and thin bars return on that axis: e.g. 1280×1000 in game (cell 940×866) shows 10 px bars top and bottom, and 2560×900 shows side bars on both screens.
- **Cast timing:** back 350 ms, straighten 250 ms, forward 400 ms (`CAST_MS` 1000), sink 400 ms; `CAST_MS + SINK_MS < TIMING.biteMinMs` is tested. Geometry is `castLine` in `choreo.ts`. The forward loop unrolls from behind on a high arc and the `cast` pose holds the rod high, so the line passes over both hats (tested). The helper lands its fly further out (`tipX + 110`) so its line clears the bank face, and it draws under the player, as a step behind.
- **Art (approved 2026-10-18):** a `back` pose for both figures (sprites have 6 px left / 8 px top padding; place them at `x - BODY_X`), and a line-fly sprite per pattern (`src/art/sprites/flies.ts`, falls back to Basic Dry).
- **Basket:** always 3 tile rows tall (tiles 32 px), extra rows scroll; Sell all sits on the first row (user's request).
- **HUD text:** place name, helper count and bite "!" use the pixel font via `addText` (`src/scene/textures.ts`), shared with the title.
- **Deferred minors (final review):** the helper's back-cast line runs up to 21 px off the world's left edge at non-dock places; `fit()` calls `setGameSize` even when the size is unchanged (possible one-frame clear while dragging the window, not seen); `lineFlyBitmap`'s `in` check would also match prototype keys (unreachable after `sanitize`).

### Piece 6 (as built)
- **All Web Audio, no files:** `src/audio/` holds pure, Node-tested data and decisions (`settings.ts`, `sounds.ts` notes and ambience, `cues.ts` which sounds fire between two frames), plus `player.ts`, the only Web Audio code. Phaser's audio is off (`noAudio`); its console banner still says "Web Audio" because it checks device support first.
- **Sounds approved 2026-10-18** on `/preview.html`. The user asked for rod swooshes on the cast, so `Note` got optional `attack` (a swell) and `q` (bandpass noise).
- **Volume:** `flyfishing-sound` in `localStorage`, outside the save; 10 steps, 10% floor, mute keeps the level. Only on the title Settings page; `TitleScene.volumeRow` takes the icon and setting so the music row (`NOTES` icon) is a second call.
- **Cues:** only the player and the one visible helper sound (helper at `HELPER_GAIN`); cues reset when the state object is swapped or the scene wakes. `menuCue` tells BACK/NO apart by the transition (non-main page → main, no action).
- **"Nope" buzz:** a `pointerdown` on a disabled panel button. Works in Chromium; Firefox not checked.
- **Not checked live:** helper loudness, `?speed=20`, hidden-tab silence, and menu-mid-reel. The cue unit tests cover the logic.

### Saving
- No manual save button. The user said "leave the save as it is": autosave every 5 s, plus saving on tab hide, page close, and going back to the menu. Nothing is saved while the title or menu is up.

## How to resume
Pieces 1–4 are done; piece 5 is built on `feat/cast-and-view` and piece 6 on `feat/sounds`, both waiting to be merged into `develop`. Shipping still means merging `develop` into `master`.
