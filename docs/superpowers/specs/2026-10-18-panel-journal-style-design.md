# Piece 4: field-journal panel, icons, stacked basket, bench bar

Piece 4 of the visual overhaul (`docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md`). Brainstormed with the user on 2026-10-18.

## Why

The user's words: the side panel "looks too plain and html, doesn't follow the whole pixel art style of the game". The basket also bothers them because it "shows fishes one by one". Piece 4 makes the HTML side panel and the basket bar feel like part of the pixel-art game, and makes the basket readable once it holds many catches.

## Goals

1. **Field-journal look for the whole HTML UI**: the side panel (money, fly, recipe/bench, shop, helpers, places, season, licenses) and the basket bar under the canvas. The user picked this from three mockups ("it has personality").
2. **A pixel icon for every item.** Each fly pattern, material, place, helper kind and license upgrade gets its own icon. The fly icons look as much like the real flies as possible.
3. **Owned things clearly look owned**, never like a disabled button.
4. **A stacked basket**: one tile per species or junk kind, which opens to list its catches.
5. **A bench cooldown progress bar.**

## Non-goals

- **No progress bar for the hired anglers.** The user considered it and dropped it.
- No per-stack "sell". "Sell all" stays as it is.
- No change to the game rules, balance, save format or `GameState`. This is presentation only. `pacing.test.ts` must stay green untouched.
- No change to the Phaser canvas scenes (title, fishing) or their art.
- No change to the corner menu button, Esc, or the rule that panel and basket are hidden in title mode.

## Anti-goals (a failure even if it "works")

- An owned item that reads as "greyed out / can't click". The owned look must read as an achievement, not as unavailable.
- Losing a valuable stack by accident: one click or one drag must never throw away a whole stack.
- Buttons swapped under the cursor mid-click, or an open stack snapping shut on the 250 ms re-render. The existing `patch`/`morph` guarantee in `panel.ts` must hold for the new markup.
- Blurry icons. Icons and sprites render with crisp pixels (`image-rendering: pixelated`, integer scale).

## The look: "field journal" (chosen)

The user picked option C from the mockup. Its CSS is in the brainstorm session at `.superpowers/brainstorm/*/content/panel-style.html`, which is gitignored. The values below are the reference:

- **Paper:** panel background `#e8d8b0`, with a 3 px ink border `#3a2a18` and a bevel (`inset 3px 3px 0 #f4e8c8, inset -3px -3px 0 #c8b488`). Text is ink `#3a2a18`.
- **Section headings:** a pixel font in rust `#8a3a20`, with a 2 px dashed rule underneath (`#b09a70`) and the section's icon on the left.
- **Item / button:** a light card `#f4ead0` with a 2 px ink border and a hard offset shadow (`3px 3px 0 #b09a70`). There is no border-radius anywhere. Prices are in rust, set in the pixel heading font.
- **Owned:** no fill and no shadow, a dashed ink-brown border, muted text `#6a5a40`, and a green "OWNED" stamp (white text on `#2a6a3a`, 2 px `#1a4a2a` border, rotated about −6°) where the price was.
- **Can't afford yet:** the normal card, faded (opacity about 0.5), still disabled as today.
- **Pressed / selected** (current place, chosen pattern or material in the recipe): the builder chooses it, but it must read as "selected" and stay clearly different from "owned" and from "disabled".
- **Danger** (the New Season confirm step): keep a red treatment (`#8a3434`) in the journal style.
- **Money:** large pixel numerals in green `#2a6a3a` with a coin icon.
- **Fonts (user approved):** Google Fonts **Silkscreen** for headings, prices and numbers, and **Pixelify Sans** for body text. Load them with a `<link>` in `index.html`, with a monospace fallback. This is the one outside asset in the project. The user accepted it explicitly. Both fonts are under the OFL, served from Google, so no credits file is needed.

All colors go in `:root` custom properties in `src/ui/style.css`, as today.

## Icons

- **Drawn in code**, like all other art: pixel grids (`string[]` + palette) in a new pure module under `src/art/` (for example `src/art/icons.ts`), baked with `paint`. They get a test that paints every icon, in the style of the existing `*.test.ts` art tests, so a ragged grid can't crash the panel at boot.
- **Style:** the same thick dark outline and stepped shading as the rest of the game's art. They have to read on paper `#e8d8b0`.
- **Size:** about 16×16 source pixels, shown at an integer scale. The flies need that room for detail. Smaller icons, such as the section and helper icons, may use a smaller grid if they read well.
- **Bitmaps into HTML:** `src/ui/` turns each `Bitmap` into an image once, for example canvas → `toDataURL`, cached by id. The panel then emits `<img>` tags in its HTML strings, so `patch`/`morph` keeps working. Icons are decorative (`alt=""`), because the text label is always present.

### The icon list

| Group | Items | Notes |
|---|---|---|
| Flies (from `PATTERNS`) | Basic Dry, Elk Hair Caddis, Pheasant Tail, Hare's Ear, Woolly Bugger, Zonker | **As close to the real fly as possible**, each tied on a visible hook. Basic Dry: a classic dry fly with tail, body, upright wing and a collar of hackle. Elk Hair Caddis: a tan elk-hair wing swept back over the hook, with palmered brown hackle. Pheasant Tail: a slim reddish-brown body, copper rib, fine tail, darker thorax. Hare's Ear: a shaggy tan-grey dubbed body with a gold rib and a buggy thorax. Woolly Bugger: a long dark (olive/black) marabou tail and a chenille body with palmered hackle. Zonker: a rabbit-fur strip along the back and a flashy mylar body. |
| Materials (from `MATERIALS`) | Copper Wire, Peacock Herl, Gold Bead, Marabou, Flashabou, Tungsten Bead | Show the material itself: a coil of copper wire, iridescent herl fibres, a gold bead, a marabou plume, flash strands, a dark tungsten bead. |
| Places (from `LOCATIONS`) | Creek, River, Big River, Mountain Lake, Great Lake | Small vignettes that echo each place's `PLACE_LOOKS` palette and props: Creek has grass and pebbles, River has sand and reeds, Big River has mud and a log, Mountain Lake has a rock and a pine, Great Lake has a beach and a dock. |
| Helpers (`HelperKind`) | Hire angler, Tying bench, Junk sorter, Fish buyer | Angler: a figure in a hat. Bench: a fly vise. Sorter: a junk bin. Buyer: a crate or coins. |
| License upgrades (`LICENSE_UPGRADES`) | Extra pattern, Extra wear, Fish value +50%, Helpers cheaper, Start further | The builder chooses the motifs. |
| Releasable fish | Andes Tiger, Nahuelito | Use the existing fish side sprites (`fishSideBitmaps`). |
| UI | Money coin, Fly section, Season, Licenses (ticket), Basket, Trash | Section headings and the basket bar. The trash icon replaces the 🗑️ emoji, and the license ticket replaces the 🎫 emoji. |

- **Where the fly icons show:** in the shop (patterns and materials), on the recipe pattern and material buttons, and next to the current fly's name in the Fly section.
- **Review stop (required):** all icons go on `/preview.html` (`src/preview.ts`), shown on the paper color at panel scale. The user approves them there before they get wired into the panel. A second stop shows the restyled panel in the running game before the work counts as finished.

## Owned unlocks

Today, owned shop items disappear from the list, and maxed helpers or licenses show as plain text (`"Junk sorter: working"`, `"…: max (4/4)"`, `"…: in the water"`). In the new panel:

- **Patterns and materials you own stay listed** in the shop, in the Owned style, so the shop reads as a collection. The builder may sort owned items after the buyable ones, or keep `data.ts` order.
- **Single-buy helpers** (Junk sorter, Fish buyer) use the Owned style once bought. Countable helpers (Hire angler, Tying bench) stay buyable and show their count.
- **Maxed license upgrades** use the Owned style with their level (for example "MAX 4/4"). Released species use the Owned style ("in the water").
- **Unlocked places** are the travel buttons. The current place uses the Selected style.
- **Owned items are not buttons** (or are inert ones). Clicking them does nothing.

## Stacked basket

- **One tile per `kind` + `defId`.** The tile shows the sprite (fish side sprite or junk bitmap), the name, the count (`×12`) and the summed value. Negative totals show as `-$4`, as today.
- **Tile order:** the builder chooses. Order of first catch is a good default because it keeps tiles from jumping around.
- **Clicking a tile toggles it open.** An open tile lists its catches, one row each with its value and a ✕ (trash) button. Each row can also be dragged to the trash, as chips can today.
- **A closed tile can't be thrown away whole**: no ✕, and it can't be dragged. *(My call: this guards against losing a valuable stack. The user saw it and agreed.)*
- **An open tile stays open** across the 250 ms re-renders and new catches. It closes when it is clicked again or when its stack empties (on sell or trash). Only one tile is open at a time. *(My call.)*
- The open list may cover the canvas as a popover above the bar, because the basket sits at the bottom of the screen, or it may expand in place. The builder chooses. Either way it must not resize the canvas row on every open or close. *(Left to the builder.)*
- **Long stacks:** the open list shows the newest 50 catches plus a "+N more" line. *(My call. It replaces the old `MAX_CHIPS = 60` shortcut, which grouping makes unnecessary for the tiles.)*
- "Sell all (n) $total" and the trash drop target keep working as today. The trash target uses the new trash icon and keeps its accessible label.

## Bench progress bar

- **In the Fly/recipe section,** when `state.bench > 0`: a journal-style bar that fills with `benchTimerMs / benchCooldownMs(state)` (both already exist; `benchCooldownMs` is in `src/game/fishing/sim.ts`).
- **When the box is full** (`flyBox.length >= anglers.length`, the condition under which `tick` pauses the cooldown), the bar shows a paused state with a short label such as "Box full".
- **It's a `role="progressbar"`** (or `meter`) with an aria label, like the existing wear meter, which also gets restyled.
- **It updates on the panel's 250 ms re-render.** It doesn't need to be smoother than that.

## Constraints

- **Game rules stay pure:** `src/game/` doesn't change, except for a pure read-only helper if one is needed.
- **Art lives in `src/art/`,** as pure functions tested in Node. The DOM conversion lives in `src/ui/`.
- **`panel.ts` keeps its model:** HTML strings, `patch`/`morph`, `data-action` dispatch, and the focus restore. The basket moves from per-catch chips to grouped tiles, but drag and drop and the trash keep their behaviour for single catches.
- **Accessibility:** keyboard focus stays visible in the journal style. Tiles that open are buttons with `aria-expanded`. Owned and paused states are said in text, not only in color or style.
- **The layout keeps working** at the current widths: the 340 px side column and the basket bar under the canvas.
- **`npm test` and `npm run build` pass.**

## Left to the builder

The Selected style; the motifs for the license upgrade icons; tile order; popover versus in-place expansion; whether owned items sort last; the exact icon grid sizes; the exact font sizes and spacing.
