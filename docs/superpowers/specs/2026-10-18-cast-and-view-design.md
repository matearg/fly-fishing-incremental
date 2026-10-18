# Cast animation, full-width view, basket and HUD: design

Piece 5 of the visual overhaul, agreed with the user on 2026-10-18.

## Why

- Casting is a single 300 ms rod swing today. A real fly cast loads the rod on a back cast before the line goes out, and the game should show that.
- The canvas uses `Scale.FIT`, so any window that isn't 16:9 gets black bars around the game.
- The basket footer grows with its content (`max-height: 96px`, rows added as catches arrive). Each new row shrinks the game cell, which rescales the canvas, so the view jumps while you fish.
- The place name and helper counter are browser-font `Phaser.Text` drawn at 480×270 and scaled up. They look blurry next to the pixel art.
- The fly on the line is a 2×2 yellow dot, whatever fly is tied on.

## Goals (as the user stated them)

1. **Three-motion cast**, for your angler and the visible helper:
   1. *Back cast:* the rod swings back, and the line trails behind it in a sideways U loop from the rod tip to the fly.
   2. *Straighten:* the loop unrolls until the line is straight out behind the angler.
   3. *Forward cast:* the rod comes forward, the line unrolls to the front, and the fly lands on the water, then sinks to its depth.
2. **Straight line in the water:** one straight line from the rod tip to the fly, at the same angle above and below the surface. Today it bends at the surface and drops almost vertically.
3. **Fly on the line looks like the selected fly:** each angler's line ends in a small sprite of the pattern tied on (`angler.fly.patternId`), matching that pattern's panel icon (`FLY_ICONS`).
4. **No black bars, ever:** the game always fills the area next to the side panel, on the title screen as well. When the window's shape differs from 16:9, it zooms in and crops instead of letterboxing.
   - Fishing view: the crop keeps the fisher's side. The left bank and the anglers are never cut. When the window is narrower than 16:9, the right side of the water is cut.
   - When the window is wider than 16:9, cut the top and bottom.
5. **HUD stays visible:** the helper count (top-left), the place name, and the menu button (top-right) sit in the corners of the visible area, whatever the crop.
6. **Basket fixed at 3 rows:** the basket is always the height of 3 rows of catch tiles, empty or full. A 4th row scrolls inside it. It never resizes because of its content.
7. **Crisp HUD text:** the place name, the helper counter, and the bite "!" use the pixel font (`SMALL` from `src/art/font.ts`, baked with `stylize`), like the title menu.

## Non-goals

- No change to the rules, catch timing, or pacing. The cast is a scene-only animation inside the existing `waiting` phase. `src/game/` is untouched, and `pacing.test.ts` stays as it is.
- Materials don't change the fly sprite. The sprite shows the pattern only, as the panel icon does.
- No casts for helpers working out of sight. They remain invisible, as today.

## Decisions (the builder's calls, the user has heard them)

- **Cast timing:** about 0.35 s back, 0.25 s straighten, 0.4 s forward (`CAST_MS` ≈ 1000 ms). The sink drops from 500 to 400 ms. Cast plus sink (1400 ms) must stay under `TIMING.biteMinMs` (1500), so a bite never arrives before the fly settles. A test asserts this.
- The fish's approach keeps working as today: it starts within the wait and heads for the fly's rest position, even mid-cast (`approachTarget`).
- **Vertical crop order (fishing):** cut sky first, up to a cap that keeps some sky above the anglers' hats. Past that cap, also cut deep water from the bottom.
- **Title crop:** centered on both axes, since the logo and menu are laid out around the center.
- **Zoom limit (approved by the user, "follow your call"):** each scene has a rectangle it must keep in view. Fishing keeps the left bank, both figures, both fly landing spots (the Great Lake dock is the widest, landing at about x 281), the back-cast loop, and the deepest fly depth with the fish at it. Title keeps the logo, the menu and PRESS START. On normal desktop and laptop windows the game covers the area fully. Only past the limit, on rare extreme shapes (portrait monitors, very narrow windows, ultrawide windows), thin bars come back on the cropped axis. Gameplay and menus never get hidden.
- **The underwater part of the line** is drawn a little fainter than the part above the surface.
- **New art, with a review stop:** a "rod back" pose for both figure styles, and one small on-line fly sprite per pattern (6 patterns). Both go on `/preview.html` for the user's approval before the scene uses them.
- **The "!" on a bite** switches to the pixel font as well (it's a `Phaser.Text` with the same blur).

## Constraints from the codebase

- The world stays 480×270 (`VIEW_W`, `VIEW_H`). All existing layout math (`depthY`, banks, title layout) keeps working in world coordinates.
- Pure timing and geometry goes in `src/scene/fishing/choreo.ts` with unit tests (house rule: logic worth testing is pulled out of the scenes).
- Art goes through the `src/art/` pipeline: grids plus palettes baked by `paint`/`stylize`, uploaded with `addBitmap`.
- `pixelArt: true` stays on.

## Left to the builder

- How the canvas fill is implemented. The suggested route: resize the game to the cell's aspect, cropped from 480×270 (`scale.setGameSize`), keep a scale mode that fills it exactly, scroll each scene's camera to pick the crop, and pin the HUD with `setScrollFactor(0)`. Update on any `#game` size change.
- The exact pixel art, the loop geometry, and the back-cast line length.
- Sharing the title's text-baking helper with the fishing scene.
