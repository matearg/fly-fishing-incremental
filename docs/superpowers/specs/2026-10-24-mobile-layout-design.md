# Mobile layout

## Intent

Make the game playable on a phone, held upright or sideways. **Only the layout changes**: same rules, numbers, pacing and save. On a small screen the river should get the room; the side panel and basket get out of the way until you ask for them.

## Goals

- A phone layout for upright (portrait) and sideways (landscape) phones.
- With the menu closed you see the river and your money; everything else is one tap away in a full-screen menu.
- Desktop and tablets keep today's layout. The only desktop change is that fish stay in the visible water (below).
- Every catch plays out on screen, start to finish, on every device.

## Non-goals

- Any change to game rules, balance, timing or saves (`src/game/` is untouched; `pacing.test.ts` stays as is).
- A tablet layout, an installable app/PWA, native wrappers.
- New art. Nothing here needs `/preview.html` review.
- Redesigning the title screen (it already re-fits to any window; see "Builder's calls").

## Anti-goals (a failure even if it technically works)

- The cast, the fish swimming to the fly, the bite or the reeling happening off-screen.
- Small, fiddly tap targets.
- Any visible desktop change beyond the fish staying in view.

## When the phone layout applies

Whenever the window is too small for the 340px side panel beside the river, regardless of device. Phones in both orientations get it; tablets (e.g. 768×1024 upright) keep the desktop layout; a narrow desktop window may get it too, which is fine. *(user decided)*

Starting point for the rule *(builder's call to tune)*: `(max-width: 700px), (max-height: 500px)`. Upright = taller than wide.

## Upright phone

Three stacked bands filling the screen, no black bars *(user decided, from mockup v3)*:

1. **Top strip: info.** Fills all the space above the river. Paper style of the side panel (paper background, 3px ink border, the bevel inset shadows, Silkscreen / Jersey 10 fonts, existing CSS variables). Shows:
   - money, large, money color (as the panel's `.money`);
   - under it, the info the scene draws in its corners on desktop: helper count, place name, combo streak (`×N` + species name) while a streak of 2+ runs;
   - the HATCH / CHUM titles while those power-ups are active, as plain panel-style text.
2. **Middle: the river.** Zoomed out a little from a tight crop so that it shows the helpers and Guide behind you, your angler, and the spot where your fly lands; the empty water further right is cut off. Full world height (sky to riverbed) is the default. *(user: "zoom a little less"; exact crop is the builder's call within that rule)*
3. **Bottom strip: the Menu button.** The **entire** strip is one button, same paper style, labelled Menu. Tap opens the full-screen menu. *(user decided)*

While upright, the scene's own corner texts (helper count, place name, combo, the waving HATCH/CHUM banners) are hidden since the top strip shows them. Things that happen *in* the river stay in the canvas: the `!` bite marker, hatch insects, the legendary plaque pop-up, catch popups.

Mockup: `.superpowers/brainstorm/*/content/portrait-v3.html` (local, gitignored). Strip proportions there are illustrative.

## Sideways phone

The river fills the whole screen like on desktop, without side panel or basket strip. Money and a Menu button sit over the scene in corners. *(user agreed in principle; exact corners are my call: money bottom-left, Menu bottom-right, so they don't collide with the scene's top-left helper count, top-right place/combo, or the top-centre banners. The user should see this on a real phone before it's final.)* The scene's corner texts stay as on desktop. Same paper style for the two overlays, sized as comfortable tap targets.

## Full-screen menu (both orientations)

*(user picked full-screen over a partial sheet)*

- Opening it covers the whole screen. Header: money, a Title screen button, and a ✕ close button.
- Below: a row of tabs, one per section: **Basket**, Fly, Power-ups, Shop, Gear, Helpers, Places, New Season, Licenses, Species log. The basket (sell button, catch tiles, stack list) becomes the Basket tab. *(tabs are my call; the user saw them in the mockup and didn't object)*
- It's the same panel content and the same `data-action` buttons as desktop, laid out for a phone, not a second implementation.
- The game keeps running behind it, as it does while you use the side panel on desktop. Closing it returns to the river.

## Fish stay in the visible water (desktop and phone)

*(user decided: "every catchable fish appears on the visible portion of water; it can't be caught until it's there; desktop too")*

- Every swimmer in the school (all of them are catchable species, `placeSpecies`) swims only within the water the camera currently shows: from `max(worldView.x, waterLeft)` to `worldView.right`. That range changes with the crop (window aspect, rotation, phone vs desktop) and the school follows it.
- So the fish that goes for the fly is always on screen when its approach starts, and the whole notice → swim → bite → reel plays in view. `nearest()` already prefers in-view swimmers; with the school confined, the off-screen fallback never triggers.
- **How the school stays inside** *(my call)*: fish turn around at the edges of the visible water instead of swimming off and wrapping, so none is ever off-screen even briefly. Today's `wrapX` (30-unit off-screen margin) is what lets them leave.
- **Catch timing does not change** *(my reading of "can't be caught until it's visible")*: the catch and its bite time still come from `tick` at cast time. Because every catchable fish is always visible, the condition always holds without touching `src/game/`. Delaying the bite until a fish is visible would change pacing, which "only the layout changes" rules out.
- Unchanged: junk still drifts in from off-screen right (it's not a fish), and a *stray* (a fish hooked before travelling, spawned at the fly) keeps its current behaviour since it already appears at the fly.
- The water's drifting ripple dots keep wrapping as today.

This is the one deliberate visible change on desktop: on a full-width window almost nothing changes; on a narrower desktop window the school no longer swims through the cropped-off water.

## Unchanged on phone

- Tapping the river casts (the scene's `pointerdown` already handles touch).
- Esc still goes to the title menu. The scene's top-right title-screen icon is a ~20px target right beside the water you tap to cast, so on phone it's hidden and the full-screen menu's header gets a **Title screen** button next to ✕ instead (same `onMenu` path). *(my call)*
- Sound, music, autosave, cross-tab adoption.

## Constraints from the codebase

- `src/game/` must not change. No `GameState` or save changes.
- Scenes read state through hooks and own no rules; the HTML side owns the strips and menu (they're DOM, so the panel's CSS applies directly).
- `panel.ts` patches HTML in place every 250 ms; the new strips and menu must go through the same `patch`/`morph` path so a button under a finger isn't replaced mid-tap.
- `main.ts` `fit()` sizes the game to `#game`'s box with `viewSize`/`viewScroll` from `src/scene/view.ts` (re-run by a `ResizeObserver` on `#game`, so rotation is already handled). Today the fishing crop always keeps `FISHING_KEEP` (x 0–300), which is what forces bars upright; the phone-upright crop needs a narrower keep. Note the Great Lake has a dock: the player stands further right (`figureSpots`), so the keep is per place or computed from `figureSpots` + `playerFlyX` (`FishingScene` place setup), not one constant.
- Pure logic worth testing (crop/keep selection in `view.ts`, the turn-at-the-edges swim position, which belongs in `src/scene/swim.ts` beside the other shared water motion, any layout decision function) gets Vitest tests like the existing `view`/`swim` tests. The scenes have no test harness.

## Builder's calls

- The exact media query and the single place it lives (CSS and JS must agree, e.g. JS sets a body class from `matchMedia` and CSS keys off the class).
- How the middle band's height is decided (e.g. `#game` aspect-ratio from the phone crop) so the canvas fills it without bars and the strips split the rest.
- The phone-upright keep rectangle per place, within "helpers + angler + fly landing spot, cast never off-screen".
- Tab bar layout (wrapping vs scrolling) and which tab opens first (suggest Basket).
- Touch polish: `touch-action: manipulation` to avoid double-tap zoom, no reliance on hover.
- The title screen stays as is; upright it shows its existing letterbox. A follow-up if it looks bad.

## Done when

- On a phone-sized viewport (upright ~390×750 and sideways ~750×340 in devtools) the layouts above appear; on desktop and at 768×1024 the layout is unchanged.
- At any window size, no school fish is ever outside the visible water, and every approach starts on screen.
- Upright: no black bars, the fly's landing spot is on screen at every place, info strip and full-strip Menu work.
- The full-screen menu can do everything the side panel and basket can.
- `npm test` and `npm run build` pass.
