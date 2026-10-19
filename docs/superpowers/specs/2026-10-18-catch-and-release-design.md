# Piece 1: Catch & Release, Buyer pause, hints on owned items

Part of the shop upgrades roadmap (`docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`). Agreed with the user on 2026-10-18.

## Why

The user wants throwing away good fish to be a real choice: give up fish you could sell now so the rest sells for more. Today trashing a fish is pure loss. The Fish buyer sells everything every 5 s, which would make any "until you sell" bonus useless, so it needs a pause. And owned shop items lose their description, so the player forgets what they bought.

## Goals

1. **Catch & Release**, a new one-off helper. Once owned, every fish the player trashes by hand adds a bonus percentage to their next Sell all.
2. **Pause button for the Fish buyer**, free with the Buyer.
3. **Descriptions stay on owned items** across the shop, helpers and licenses.

## Non-goals

- No change to how junk, the Junk sorter or Bulk trash work, beyond Bulk trash's "Trash all" counting as trashing by hand.
- No other new items: gear, power-ups, new helpers and bonuses are later pieces.
- The pacing bot does not release fish (see Pacing).

## Anti-goals

- The bonus must not be a dominant "always trash a lot" strategy. That's why it's capped.
- The Buyer must never use up or pay out the bonus behind the player's back.

## Catch & Release (user's decisions)

- **It's bought first** (user's request): a one-off helper like Bulk trash, sorter and Buyer. Before buying it, trashing a fish does what it does today.
- **Which throw-aways count:** fish trashed by hand, with a row's trash button or with Bulk trash's "Trash all". Junk never counts. The Junk sorter's automatic throw-aways never count.
- **Bigger for rarer and bigger fish** (user's request), **measured by price against the place's cheapest fish** (user's decision after the builder check). One trashed fish adds `pctPerUnit × (species.baseValue × size) / cheapest`, where `cheapest` is the lowest `baseValue` among the species of the fish's own location (`SPECIES` with that `location`, licensed or not) and `size` is the catch's size multiplier. Starting value, tunable in `data.ts`: 2% per unit. So a size-1 Puyen ($2, the Creek's cheapest) adds 2%, a size-1 Brown Trout ($30) adds 30%, and a size-1 Pejerrey at the Great Lake adds 2%.
  - Why: a rarity-only percentage made commons always the cheapest fish to throw away, per point of bonus, so the routine would be "trash commons up to the cap" and rare fish would never be worth releasing. Measured by price, every fish costs the same per point at a given place, so the choice is how much to give up, not which species.
  - `valueMult` (the license upgrade) is left out on both sides, so it doesn't change the bonus.
- **It stacks and is capped at +100%** (my call, accepted by the user). Without a cap, trashing a third of a big basket and selling the rest always wins, and the win grows with the basket.
- **It lasts until the player's next Sell all**, even if the basket is empty in between. Then it goes back to 0.

### My calls (the user didn't decide these)

- **Name and place:** "Catch & Release", in the Helpers list after the Fish buyer, about $1,500 (tune with pacing). Description: "Trashed fish add to your next Sell all, up to +100%".
- **What the bonus multiplies:** only the fish in the sale, never junk (a −$10 tire doesn't get worse).
- **A sale with no fish in it** (only junk) doesn't use up the bonus.
- **The Buyer's sales** pay no bonus and leave it untouched (user's decision). `sellAll` gets a way to say whether the bonus applies; only the panel's Sell all applies it.
- **New Season** resets the bonus to 0 (it's not in `Carry`).
- **Bonus money is real money:** it goes through `earn()` and counts toward `seasonEarnings` (and so toward the season's licenses), like any sale.
- **Trashing past the cap** is allowed (Bulk trash's "Trash all" doesn't stop at +100%); the extra just adds nothing.
- **Owned patterns and materials** keep the "tie $X" part of their line; only the unlock price goes.
- **Display:** the Sell all button shows the total with the bonus included, plus the bonus, e.g. `Sell all (12) $459 +35%`. With no bonus it looks as today.

## Buyer pause (user's decisions)

- **Free with the Buyer** (user's decision): a toggle that appears once the Buyer is owned.
- *My calls:* it sits next to Sell all in the basket head, as a pressed/unpressed toggle (`aria-pressed`) showing whether the Buyer is paused. While paused the Buyer's timer doesn't advance. The pause state is saved (`GameState.buyerPaused`, default `false`, so old saves resume as today). New Season starts unpaused.

## Hints on owned items (user's request)

- Today `owned()` in `src/ui/panel.ts` shows only icon, name and a stamp. Owned items keep the same description they show before buying, with no price.
- **Covers:** patterns and materials (their existing `<small>` line), helpers, license upgrades at MAX, and licensed species.
- Helpers have no descriptions today, so this piece writes one per helper and shows it both before and after buying. *My calls* for the text:
  - Hire angler: "Fishes on its own with flies from the box"
  - Tying bench: "Ties flies from your recipe; more benches tie faster"
  - Bulk trash: "Adds Trash all to an open stack"
  - Junk sorter: "Throws junk away before it reaches the basket"
  - Fish buyer: "Sells the basket every 5 s; can be paused"
  - Catch & Release: as above
- License upgrades already name their effect ("Fish value +50%"), so at MAX they keep that name; licensed species keep "Release X at Place" as the hint.
- Every new item in later pieces follows the same rule.

## Junk sorter reprice (user's request at design approval)

- The Junk sorter costs enough that Bulk trash is clearly the earlier buy: the player should have Bulk trash for a good while before the sorter is affordable. *My call:* from $450 to about $1,000 (over 3× Bulk trash's $300, above the Buyer's $800); the exact number is set with pacing.

## Constraints

- Rules stay in `src/game/` (pure, Node-tested); the panel only shows and dispatches. New `GameState` fields (`catchRelease`, `buyerPaused`, the bonus) get defaults in `newGame()` so `sanitize` fills them for old saves; `SAVE_VERSION` stays 1.
- `trash` and `trashStack` keep returning `boolean`.
- **Art review stop:** Catch & Release needs a `HELPER_ICONS` icon, and the pause toggle may need a small icon. Show them on `/preview.html` and get the user's approval before continuing.
- **Pacing:** the bot buys Catch & Release like the other one-off helpers (`pacing.test.ts` `purchaseOptions`) but never trashes fish or pauses the Buyer. Season 1 is already at 49.98 of 50 sim-min; the extra purchase will likely push it over, so the build retunes `data.ts` (helper price or other numbers) to keep the pacing test green.
- **Tests:** unit tests cover the bonus formula (including that two fish of different species at one place give the same bonus per dollar given up), the cap, what counts as trashing by hand, the Buyer neither paying nor using up the bonus, and the pause stopping the Buyer.
- Sounds: the pause toggle uses the existing `select` cue; buying Catch & Release goes through `hire`, so it already gets `buy`/`nope`.

## Left to the builder

- Field names and how `sellAll` is told to apply the bonus.
- Exact layout of the pause toggle and the bonus text in the basket head.
- Final numbers after pacing.
