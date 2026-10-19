# Piece 2: Gear (rods and waders)

Part of the shop upgrades roadmap (`docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`). Agreed with the user on 2026-10-18.

## Why

The user wants gear you can see: buying a rod or a pair of waders should change how the player's angler looks, and each should do something different. Rods make fish sell for more, each rod for its own tiers. Waders make the shop cheaper. Owning several rods and picking one to fish with makes the choice of rod matter.

## Goals

1. **5 rods** to buy with money. Fish the player catches with a rod sell for more, but only fish of that rod's tiers. The player picks which owned rod to fish with.
2. **5 pairs of waders** to buy with money. The best pair owned gives a small discount on purchases. Any owned pair can be worn as a look.
3. **The equipped rod and the worn waders show on the player's angler**, each with its own colors.
4. A new **Gear** section in the panel (layout A, chosen by the user from a mockup).

## Non-goals

- Helpers don't use gear (user's decision). They keep the plain rod and waders, look and rules.
- Rods don't change odds, wait times or depth; they only add sale value (user's decision for waders, my call for rods: flies already handle odds, and two things doing the same job would blur the choice).
- Waders don't add sale value (user's decision); the roadmap's earlier "waders sell for more" is dropped.
- Nothing carries over New Season; gear isn't in `Carry`.
- No new animations, sounds beyond existing cues, or power-ups (later pieces).

## Anti-goals

- **No rod should make the others pointless.** Every rod has to be the right pick at some point in a season, so the choice of which rod to fish with stays a real choice.
- **Gear must not change the release bonus.** Trashing a fish gives the same bonus whatever rod caught it. `releaseBonusOf` already works from `species.baseValue × size`, not `CatchItem.value`, so this holds as long as rods only change `value`. A test pins it.

## Rods (user's decisions)

- **5 rods, bought with money, in any order** (layout A). Once bought, a rod stays owned for the season.
- **Equipped:** the player chooses which owned rod to fish with; only one at a time.
- **Each rod adds a percentage to the sale value of fish of its tiers** (common, uncommon, rare, legendary), and nothing to others. Some rods favor common fish, others rare ones; numbers are balanced so none dominates.
- **Only the player's angler** (`anglers[0]`) uses the rod.
- **Look:** the equipped rod is drawn on the angler in its own colors.

### My calls

- **Starter gear:** every season starts with a plain rod and plain waders, free, no bonus, looking like today's sprite. The 5 rods and 5 pairs are on top of those.
- **A newly bought rod is equipped on purchase**, since buying one and seeing nothing change would feel broken; the player can switch back.
- **What "right pick" means (my call, after the builder check found two rods in my first table that were never worth using):** with all five rods owned, each rod is the single best one (by more than 5%) for some place and fly depth. Which rod to fish with then depends on where you fish and how deep your fly goes, so switching is a real choice. A unit test checks this over every place, every depth up to the place's limit, and fly odds bonuses 0, 0.2 and 0.4, from expected sale value per catch (species weight × the fly's odds factor per tier × base value, licensed species left out, junk ignored).
- **One generalist and four specialists.** Starting numbers, all tunable in `data.ts`; names and colors are placeholders the art review can change:

  | Rod | Tiers | Bonus | Rough price |
  |-----|-------|-------|-------------|
  | Willow Rod | common, uncommon | +25% | $500 |
  | Bamboo Cane | common | +40% | $3K |
  | Fiberglass | uncommon | +45% | $15K |
  | Graphite | rare | +40% | $60K |
  | Carbon Spey | legendary | +40% | $500K |

  - A search over bonuses during brainstorming found these numbers pass, as do neighbors (Willow 20–30%, Bamboo 30–50%, Fiberglass 40–55%), so pacing has room to tune.
  - Examples: Willow is best at the Creek with a nymph, Bamboo at Mountain Lake with a dry fly (only commons reach it), and Graphite and Carbon Spey with deep flies at Big River and the Great Lake.
  - Prices follow when each tier starts to matter: uncommons from the River, rares from Big River, legendaries from Big River and Mountain Lake.
  - Final numbers come from pacing. They may change as long as the "right pick" test still passes.
- **When the bonus is applied:** in `rollCatch`, when the catch is picked at cast time (`angler.pending`). A fish already on the line or in the basket keeps the value it was caught with; switching rods only affects later casts. It multiplies alongside the license `valueMult`.
- **Description line** (kept once owned, per the roadmap rule): e.g. "+35% on common fish", "+30% on uncommon and rare fish".

## Waders (user's decisions)

- **5 pairs, bought with money, in any order.**
- **The discount comes from the best pair owned**, never the one worn. It grows pair by pair, about 10% at most.
- **Every owned pair is a look:** the player can wear any of them (or the plain pair); wearing only changes the sprite.
- **Only the player's angler** shows them.

### My calls

- **Starting discounts:** 2% / 4% / 6% / 8% / 10%, prices roughly $300 / $4K / $40K / $400K / $3M. Names (placeholders): Rubber, Canvas, Neoprene, Breathable, Guide Pro. Tunable in `data.ts`.
- **What the discount covers:** every purchase paid with money from the panel: patterns, materials, places, helpers (anglers, benches, one-off helpers), rods and waders. **Not** fly tying costs (a running cost, not a purchase) and **not** license upgrades or licensed species (paid in licenses). A pair's own price uses the discount you have before buying it.
- **It stacks with the license `helperDiscount`** by multiplying (`base × (1 − helperDiscount) × (1 − wadersDiscount)`) on helpers.
- **Shown prices include the discount**, so the price on a button is always what you pay. All money purchases should get their price from one function in `src/game/progress/` (e.g. `price(state, base)`), and the panel reads it, never its own math (same rule as `saleValue` in piece 1).
- **Description line:** "5% off the shop" style, kept once owned. The Gear section also shows the current discount ("Discount now: 4%").
- **Newly bought waders are worn on purchase**, like rods.

## Panel: Gear section (layout A, user's choice)

- A new section **Gear**, placed after Shop and before Helpers. Sub-labels "Rods" then "Waders".
- Every rod and pair is always listed, with a color swatch/icon, name, description line and price.
- **Not owned:** a buy button with the price (disabled when you can't afford it), like other shop rows.
- **Owned:** a toggle button (`aria-pressed`) that equips the rod / wears the pair, with a stamp-like word on the right: "FISHING" / "WEARING" when active, "OWNED" otherwise. Clicking an owned, inactive one equips/wears it. The plain starter rod and waders are listed first as owned, so the player can go back to them.
- *My call:* buying uses the existing `buy`/`nope` cues; equipping uses `select`.

## Art

- Rods: recolor `r` (blank) and `k` (cork grip), plus a new wrap color on every few pixels of the blank for the better rods (as in the mockup). The rod polyline per pose stays as is.
- Waders: recolor `p`/`P` (and optionally `w` boots for the top pair).
- `figures.ts` already has `FigureStyle` as "seam for future cosmetics"; the angler's palette becomes a combination of the base, the rod's colors and the waders' colors, so the scene rebuilds the player's textures when gear changes.
- Panel swatches or small icons for each rod and pair.
- **Art review stop:** show all 6 rods and 6 waders (including plain) on the angler, and the panel icons, on `/preview.html`, and get the user's approval before continuing.

## Constraints

- Rules stay in `src/game/` (pure, Node-tested); the panel only shows and dispatches; the scene only reads state.
- New `GameState` fields (owned rods, equipped rod, owned waders, worn waders) get defaults in `newGame()` (plain gear owned and equipped), so `sanitize` fills them for old saves; `SAVE_VERSION` stays 1. `sanitize` drops gear ids no longer in `data.ts`, and an equipped/worn id that isn't owned falls back to plain.
- Buy/equip functions return `boolean` like the rest.
- **Pacing:** the bot buys rods and waders (`purchaseOptions` in `pacing.test.ts`) and fishes with whichever owned rod pays best for its current place and fly. It uses the same expected-value calculation as the "right pick" test, kept in `src/game/` so the test and the bot share it. `pacing.test.ts` must stay green (season 1 now 49.0 of 50 sim-min, so the extra income and discounts likely help, but extra purchases can stretch gaps); retune `data.ts` as needed and record the result in the roadmap.
- **Tests:** no rod is beaten by another everywhere (see Rods); rod bonus applies only to its tiers and only to the player's catches; switching rods doesn't change fish already caught; the release bonus is the same with any rod; the discount uses the best pair owned, not the worn one; prices shown equal prices paid; save sanitizing of gear fields; the angler sprite changes with rod and waders and helpers stay plain.

## Left to the builder

- Field and function names; how the scene learns the player's gear changed.
- How `rollCatch` learns which angler is casting (it is shared by the player and helpers); `helperCost` and the bot's `purchaseOptions` move to the new price function.
- Exact pixel colors and wrap spacing (through the art review).
- Final numbers after pacing.
