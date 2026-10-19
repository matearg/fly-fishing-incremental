# Detailed places: finer pixels and realistic banks, water and skylines

Piece 8 of the visual overhaul (see `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md`). Brainstormed with the user on 2026-10-18.

## Intent

Today each place reads like a diagram: a striped sky, flat-colour mountains with one outline, the bank a plain brown block with white speckles, the water one smooth gradient with nothing in it, trees as thin repeated spikes, tiny props. The user wants each place to look like **a real spot**: "better dirt, wood, trees, spikier mountains, all with better graphics and designs". They named the means themselves: **variation in colour and shadow to create depth, and smaller pixels to give more detail**.

They chose this from a three-way mockup of Mountain Lake (same pixels / finer pixels for the place only / finer pixels for everything) and picked **finer pixels for everything**. Their only correction to the mockup: the mountains should be **a little less jaggy**.

Success: switching places feels like arriving somewhere real and distinct, the bank looks like ground you could stand on, and nothing on screen (angler, fish, line) looks chunky or pasted-on against the new background.

## What changes

### Pixel size (user's decision)
- Everything in the world, in both the fishing scene and the title backdrop, is drawn with **pixels half the size of today's**: the 480×270 world shows 960×540 art pixels.
- This covers the places (sky, skyline, bank, water, props, dock), the angler and helper in all poses, every fish (side and top view), the flies on the line, the junk, the fishing line and the ripples.
- **Stays chunky (user's decision):** the logo, the menu text, and the HUD text (place name, helper count, bite "!"), plus the menu button. They keep today's pixel font and size, for readability.
- The HTML side panel is not restyled.

### Fishing scene (side view), for every place
- **Sky:** a stepped gradient with dithered transitions instead of hard stripes, plus a few shaded clouds.
- **Mountains:** lit faces (sun from the left) and shaded faces, snow above an uneven snowline that reaches further down the gullies, and rock texture. The far ranges fade into haze. **Less jagged than the mockup** (user): keep the peaks, but use rounder ridges and fewer needle spikes.
- **Hills, bardas, forest:** the same layers each place has today (`PLACE_LOOKS` horizon layers), redrawn with light and shadow. Trees are individual crowns (lit side, shaded side, leafy edge) forming a canopy, not repeated spikes. Bardas show their layered ochre bands with shaded gullies.
- **Bank surface: each place keeps its own ground (user's decision):**
  - Creek: dry steppe grass and coirón tufts on ochre ground.
  - River: loose grey cobbles.
  - Big River: wet mud with puddles and driftwood.
  - Mountain Lake: green turf, with blades hanging over the edge (as in the mockup).
  - Great Lake: a pebble beach, plus the dock.
- **Bank cut (shared by every place, recoloured per place):** under the surface, a dark topsoil band with roots poking out of the cut, then layered strata with wavy bands and speckle, and shaded stones set into the cut. The face has a dark edge. The part of the bank below the waterline is tinted by the water, less heavily than the mockup, so the soil still reads as soil.
- **Props on the bank:** redrawn bigger and with shading, each place keeping its character: coirón and lupines (Creek), cobbles and poplars (River), willows and driftwood logs (Big River), a lenga tree, rocks and a fallen log (Mountain Lake), the dock in wood with plank grain, seams and posts (Great Lake). Logs show bark, an end-grain cut with rings, and moss.
- **Water:** the depth gradient is dithered. It adds a reflection of the far shore near the surface, surface glints, light shafts fading with depth, floating specks, weeds, and a stony bed at the bottom.

### Title backdrop (top-down), for every place
- **Water:** shifts colour toward mid-river and shows stones on the bottom, with moving sun glints and foam.
- **Banks:** the same per-place ground as the side view, seen from above: steppe grass and coirón (Creek), cobbles (River), mud and puddles (Big River), turf (Mountain Lake), a pebble beach (Great Lake). Each gets texture, light and shadow, and a detailed shoreline where it meets the water.
- **Props:** lupines, coirón, poplar, willow and lenga crowns, logs, rocks and the dock get light and shadow so they read as 3D seen from above.
- **Fish and drift:** the swimming fish (top view) and the drift (foam, leaves, twigs) get the finer pixels too.

### Sprites
- **Angler and helper:** redrawn at the finer size in all four poses (idle, back, cast, reel), with a thin outline and shading. They keep today's look (felt hat, shirt, belt, waders, boots), and the helper still looks different from the player.
- **Fish:** side and top shapes redrawn at the finer size, still a few base shapes recoloured per species (`FISH_COLORS`), still growing with tier, plus El Cuero's and Nahuelito's own shapes.
- **Flies on the line and junk:** redrawn at the finer size.

## Must not change
- **Game rules and balance:** nothing in `src/game/` changes.
- **Where things are in the world:** waterline, ground row, bank widths, where each angler stands, where flies land, depth bands, the cast and reel choreography, the keep-in-view rectangles, and the zoom and crop behaviour. The art gets finer; positions stay the same.
- **Readability of the fishing:** fish must stay clearly visible at every depth band. The lake bed, weeds and light shafts sit behind the fish and must not hide them. The deepest band must stay above the bed.
- **Each place keeps its own palette and character** (roadmap decision), so progress is still felt.
- **Art is drawn in code**, with no asset files (roadmap decision). It is deterministic per place (seeded from the place id), as today.
- The existing art and figure invariants keep holding: the rod tip on an opaque pixel, feet on the bottom row, every fish mouth on an opaque pixel, the fly tie-on point and the junk snag point on opaque pixels, and fish sizes growing with tier and price.

## Anti-goals
- A mixed look, where any world sprite (figure, fish, fly, junk, line) still has the old chunky pixels next to the fine background.
- Mountains as jagged as the mockup's.
- A busy background that makes fish hard to spot.
- Silent changes to gameplay or timing.
- Third-party art.

## Review stops (user's standing rule)
New art is shown on `/preview.html` and approved before work continues. Suggested stops, in order:
1. Mountain Lake side view at the finer size, in the real fishing scene (proves the rendering change end to end).
2. The other four places' side views.
3. Angler and helper, all poses.
4. Fish (side and top), flies and junk.
5. Title backdrop for all five places.

## Builder's calls (made by Claude, not by the user)
- **How the finer pixels are done:** keep the 480×270 world and all its coordinates. Render the game canvas at twice the resolution, zoom the camera ×2, and bake art at twice the resolution, displayed at half scale. The chunky text and logo are displayed at full scale. This keeps `view.ts`, `choreo.ts` and their tests as they are. Watch for pixel rounding on half-unit positions (Phaser `roundPixels`), and for the line and ripples needing half-unit widths.
- **The basket in the side panel** shows the fish and junk sprites (`src/ui/icons.ts`). It will show the new finer sprites at the same on-screen size, since the new art replaces the old.
- The mockup on the brainstorm page (`.superpowers/brainstorm/…/pixel-size-v2.html`, option C) is the reference for the look and the detail level, not for exact shapes.
- Animation stays as it is today (ripples, fish wiggle, drift) plus the title's moving glints. No new animation in the fishing scene.

## Left to the builder
Exact palettes per place within each place's existing colours, generator shapes, noise functions, how the art code is split across files, prop counts, and test updates for the doubled sprite sizes.
