# Fishing scene, visible bites, Patagonia look — design

Piece 3 of the visual overhaul (see `plans/2026-10-17-visual-overhaul-roadmap.md`). Pieces 1 (bench) and 2 (title + menu) are done; piece 4 (panel icons) comes after this.

## Intent

The fishing scene is still coloured boxes on stripes. The player should *see* fishing: a fish noticing the fly, swimming to it, biting, and being reeled in; junk drifting into the line; anglers casting and reeling on a bank that looks like the place they unlocked. And the whole game should feel like **Argentine Patagonia**: steppe, lupines, bardas, poplars, lenga forest, cobble beaches, glacial water, the Andes on the horizon. The places go deeper into the Andes as they unlock, so progress is something you see.

## Goals

- Real pixel art for the angler, the helper, fish (side view), junk, and each place's bank, water and sky.
- The catch you see is the catch you land.
- One Patagonia look per place, shared by the title screen and the fishing scene.
- One visible helper that acts out casting and reeling; a helper count in the top-left.
- Fish renamed to Patagonian species; two non-Patagonian species removed; legendaries get invented names.
- Art organised so a different style of angler, helper, fish or place can be swapped in later (future cosmetics).

## Non-goals

- Panel icons and owned-unlock styling (piece 4).
- The deferred iPhone fullscreen fix and the one-frame input fix after the title fade.
- Any change to timings or prices. The sim change below only moves *when* the catch is picked; odds change only through the two removed species.
- Showing helpers' fish. Their catches stay invisible; they only show up in the basket.
- Cosmetics themselves: no shop, no unlocks, no save field, no special abilities or bonuses. This piece only leaves the seam (see Styles).
- Changing ids, tiers, depths, weights or values of the species that stay (except a weight retune if the pacing test needs it).

## Anti-goals (would be a failure even if it works)

- A fish swims up and then something else lands.
- Saves from before this piece break, or get wiped by a version bump.
- Art from third-party packs, or a style that drifts from the title screen's (thick dark outlines, stepped gradients, chunky pixels on 480×270).

## What the player sees

### Layout (side view, 480×270)
- **Sky** across the top, with the place's Andes / hills / bardas / trees on the horizon (see Places).
- **Bank** on the left, drawn as a side cut: the place's ground on top, its props on and in it. The anglers stand on it. At the Great Lake they stand on a dock reaching out over the water.
- **Water** fills the rest. It uses the place's colours and **darkens smoothly with depth**. No visible depth stripes. Depth still decides what can be caught; it's just not drawn as bands.
- **Top-left:** helper count (e.g. "Helpers 3"): hired anglers only (`anglers.length - 1`), the ones that can stand on the bank; benches, sorter and buyer don't count. Hidden when there are none. *(Claude's call.)*
- **Top-right:** place name and the menu button, as today. Esc still goes to the menu.
- Ripples on the surface; ambient fish of the place's catchable species swimming at their depths, as today but as real sprites. The number per species comes from `TIER_SCHOOL` (merge the scene's duplicate `TIER_COUNT` into it).

### Your angler
- Stands on the bank, distinct colour (red, as today).
- **Cast:** a short rod swing, the fly flies out, lands and sinks to its depth (the fly's max depth capped by the place's, as today).
- **Waiting:** line in the water, fly bobbing gently.
- **Fish bite:** the catch is already picked (see Rules). If it's a fish, one fish of that species, from its school, leaves the school, **stops and turns to look at the fly, then swims to it and bites**. The other fish ignore the fly. *(Claude's call: other fish ignore it.)* The fish comes from its species' own depth, which may be above the fly; it swims to wherever the fly is.
- **Junk bite:** if it's junk, the item (Old Can, Tangled Line, Old Boot, Tire, each with its own sprite) **drifts in with the current at the fly's depth and the line snags on it**.
- **Bite:** the fly/line tugs and the "!" appears over your angler, as today. You click (or Space) to reel. The bite waits for you, as today.
- **Reel:** a reeling pose; the fish (tail still wiggling) or the junk is **pulled through the water to the bank**. It takes the existing reel time (0.8 s).
- **Landing:** nothing extra. It reaches the bank and disappears; the catch is in the basket.
- The approach must finish exactly when the bite happens. The scene knows the remaining wait (`timerMs`), so it schedules the notice → turn → swim (or the junk's drift) to end at the bite, compressing it when the wait is short (the wait can be as short as 1.5 s). *(Exact durations: builder's call, tuned at the animation review stop.)*

### The helper
- **One** helper figure on the bank next to your angler, a different colour from you. Not shown when you have no helpers.
- It **mirrors one real helper: `anglers[1]`** *(Claude's call)*. Its phases drive the figure: cast when that helper starts waiting, line in while waiting, reeling pose and line coming in while reeling, then idle until its next cast. No fish or junk is ever drawn on its line.
- When that helper has no fly it stands **idle with no line**.
- All other helpers keep working out of sight.

### Motion (all looping, cheap)
Cast and reel for both figures; fish tail wiggle (two frames, as on the title, ≈4 Hz); fly bob; ambient fish swimming; junk drifting with the current; surface ripples.

## Places: the Patagonia look

One look per place in `PLACE_LOOKS` (`src/art/places.ts`), replacing today's palettes and props. Both screens use it: the title's top-down `RiverBackdrop` banks/water, and the fishing scene's side view (which also needs a sky/horizon the title doesn't). The mockup the user approved, in order of unlock:

| Place | Look |
|---|---|
| Creek | Steppe arroyo. Golden coirón grass tufts, purple/pink lupines, low ochre hills, the Andes small and far away. Light clear-blue water. |
| River | Clear water over cobbles, a cobble bank, ochre layered cliffs (bardas), a row of poplars, distant snowy peaks. |
| Big River | Wide and slow, darker water. Tall bardas, poplars and willows, driftwood logs on a muddier bank. |
| Mountain Lake | Turquoise glacial water. Lenga forest (dark green with some autumn red), rocks, snowy peaks close and tall. |
| Great Lake | Deep blue water. The Andes fill the sky, dark forest at their foot, a cobble beach and a long wooden dock the anglers stand on. |

- Starting point: `2026-10-17-fishing-scene-patagonia-mockup.html` next to this doc. The user approved the *direction*; exact colours are settled at art review stop 1.
- On the title (top-down), the lily pads don't fit Patagonia. *(Claude's call: replace them with something that drifts and fits, e.g. foam or fallen leaves; settled at the art review stop.)*
- Fix the deferred bug: `RiverBackdrop` seeds its random layout from `location.length`, so Creek and River share a layout. Seed from a hash of the id instead.

## Fish names

Every non-legendary fish gets a real Patagonian name (native or long-established there). There aren't enough real ones to fill every slot, so **two species are removed**: `smallmouthBass` (River) and `lakeTrout` (Mountain Lake). The five legendaries get invented names drawn from Patagonian lakes and legends. Ids, tiers, depths, weights and values of the kept species don't change; ids stay so saves keep working.

| Place | id → new name |
|---|---|
| Creek | dace → Puyen · brookTrout → Brook Trout · creekChub → Otuno · brownTrout → Brown Trout |
| River | grayling → Peladilla · rainbowTrout → Rainbow Trout · pike → Bigmouth Perch · ~~smallmouthBass~~ removed |
| Big River | perch → Creole Perch · walleye → Chinook Salmon · catfish → Velvet Catfish · **muskie → Limay King** (legendary) |
| Mountain Lake | cutthroat → Big Puyen · goldenTrout → Landlocked Salmon · ~~lakeTrout~~ removed · **arcticChar → Glacier Trout** (legendary) · **tigerTrout → Andes Tiger** (legendary, licence) |
| Great Lake | whitefish → Pejerrey · cisco → Steelhead · steelhead → Sea-run Brown Trout · **lakeSturgeon → El Cuero** (legendary) · **ghostSturgeon → Nahuelito** (legendary, licence) |

- El Cuero and Nahuelito are creatures from Patagonian lake legends (Nahuelito is the Nahuel Huapi lake monster). *(Claude's call: all fish, legendaries included, use the generic side-view shapes with their own palettes; unique shapes for these two only if the user asks at review stop 3.)*
- Each species gets a `FISH_COLORS` palette that fits its new fish.
- **Removing the two species:** with them gone, River has nothing at depth 1 and Mountain Lake nothing at depth 2. That's fine: depth is a ladder, so those depths still catch the shallower fish. The pacing test must still pass; if removing them shifts it, retune weights rather than re-adding species.
- **Saves with removed species:** the save's `licenseSpecies` already drops unknown ids. Fish of a removed species already sitting in a basket stay there and sell for their stored value, so no money is lost (the panel already falls back to showing the id). *(Claude's call.)*
- Junk names stay as they are.

## Styles (seam for future cosmetics)

The user may later add cosmetics, some with abilities or bonuses. This piece only makes the art swappable:

- Each art kind (angler, helper, fish, place) is a **named style**: plain data (grids, palettes, per-place props) in one record per kind, with a single `default` entry today. The current per-species `FISH_COLORS` and per-place `PLACE_LOOKS` become the `default` fish and place styles.
- The title and the fishing scene get their art through **one lookup per kind** that takes a style id, and always pass `default` for now. Adding a cosmetic later = adding an entry + choosing which id to pass; no scene code changes.
- Nothing else: no style field in the save, no menu to pick styles, no gameplay effects. Those belong to the future cosmetics piece.

## Art

- Drawn from scratch in code, like pieces 1–2: pixel grids (`string[]` + palette) baked by pure functions in `src/art/`, uploaded with `addBitmap`. No third-party assets.
- **Fish, side view:** a few base shapes, sized by tier like `FISH_TOP` (bigger = rarer), recoloured per species with the existing `FISH_COLORS`. Two tail frames each.
- **Junk:** one sprite per `JUNK` entry (can, tangled line, boot, tire). New junk added to `data.ts` needs a sprite; a missing one should fail a test, not crash the scene.
- **Figures:** angler and helper in the same style, with at least idle, cast and reel poses, and a rod.

### Art review stops (the user approves before continuing)
1. The five Patagonia places, both views (title top-down and fishing side view).
2. Angler and helper figures with their poses.
3. Side-view fish (all tiers, a few species) and the four junk sprites.
4. The animations in the running game: approach, bite, reel, junk snag, helper cycle.

## Rules (sim and save)

- **The catch is picked at cast**, not at landing. `startWaiting` rolls it with `rollCatch` and stores it on the angler; landing puts that stored catch in the basket. This applies to every angler (helpers too), so odds and the sim stay one code path. The random sequence shifts, but odds don't; the pacing test must still pass.
- **Sorter** still drops junk at landing, as today.
- **Travel** while an angler is `waiting`: its stored catch is re-picked for the new place, so a Creek fish never surfaces at the Great Lake, and the visible approach restarts within the remaining wait (no timer change). In `bite` or `reeling` the catch is already on the line: it stays and lands as is. *(Claude's call.)*
- **Anything else that changes mid-wait** (licences, recipe, a new fly in the box) does not re-pick. The catch belongs to the fly already on the line.
- **Old saves:** no `SAVE_VERSION` bump (that would wipe saves). A loaded angler that is mid-wait/bite/reel with no stored catch gets one picked on load (in `sanitize`), or at landing as a fallback. *(Claude's call.)*

## Constraints

- Phaser 4, TypeScript, Vite, Vitest; 480×270 canvas, `pixelArt: true`.
- Keep the scene's existing hooks (`SceneHooks`), the menu button, Esc, and the "click on the menu button is not a cast" rule.
- The scene reads sim state; it never changes it. Animation timing comes from `phase` and `timerMs`.
- Pure art functions get the same kind of tests as `fish.test.ts` / `places.test.ts` (sizes, every species/junk/place has art, palettes resolve).

## Left to the builder

- Exact sprite sizes, poses, frame counts and animation durations (settled at the review stops).
- How the scene tracks which school fish is the "chosen" one and how it rejoins / respawns after landing.
- How the side-view horizon is built (one baked bitmap per place, or layers).
- Where in the code the stored catch lives (a field on `Angler` is the obvious place).
