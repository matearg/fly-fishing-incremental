# Shop upgrades: roadmap and progress

New bonuses, power-ups, helpers and shop items, agreed with the user on 2026-10-18 and split into five pieces. Each piece goes through the same steps as the visual overhaul: brainstorm, then design doc in `docs/superpowers/specs/`, then plan in `docs/superpowers/plans/`, then build. Work happens on `feat/shop-upgrades` (draft PR #9 to `develop`).

## Progress

| # | Piece | Status |
|---|-------|--------|
| 1 | Catch & Release (trashing fish adds a bonus to the next Sell all), Buyer pause button, descriptions kept on owned items | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 2 | Gear: rods and waders | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 3 | Power-ups: chum bucket and hatch | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 4 | New helpers: Taxidermist and Guide | Not started. Moved to shop-upgrades v2 |
| 5 | Bonuses: combo, species log, basket set | Not started. Moved to shop-upgrades v2 |

## Decisions already made (carry into later pieces)

- **Every shop item keeps its description once owned** (user's request). New items in pieces 2–5 follow the same rule.
- **Gear (piece 2):** settled in the gear spec (in history at `0189ae8`). Rods make the player's catches of their tiers sell for more, and you pick which owned rod to fish with. Waders give a shop discount (best pair owned) and no sale value; any owned pair can be worn as a look. Only the player's angler uses gear, and it resets at New Season. This replaces the earlier pitch where waders also raised sale value.
- **Power-ups (piece 3), as pitched:** the chum bucket costs money and raises rare odds for 60 s; the hatch is a random event at the current place where dry flies get more bites for 45 s, with insects on screen. Settled in the power-ups spec (in history at `0189ae8`): player only, both end on travel, switching to a dry recipe mid-hatch swaps the fly on the line.
- **Helpers (piece 4), as pitched:** the Taxidermist mounts your first legendary of each species as a trophy worth a permanent +% for the season; the Guide raises your hired anglers' odds. Details not brainstormed yet.
- **Bonuses (piece 5), as pitched:** combo (same species in a row raises a multiplier), species log (the first catch of each species pays a bounty), basket set (selling one of every species of a place pays a bonus). Details not brainstormed yet.
- **Pacing:** every piece keeps `pacing.test.ts` green. Before piece 1, season 1 was at 49.98 of 50 sim-min, so each piece retunes `data.ts` as needed. After piece 1: season 1 is 49.0 sim-min (max purchase gap 2.4 min, worst income jump 7.2×). Piece 1 set Catch & Release $1,500, Junk sorter $1,000 (from $450) and Mountain Lake $150K (from $200K); the release price alone could not make room, since season 1 moved within noise (50.0–50.5) for any price from $1K to $8K.
  - After piece 2: the user raised season 1's limit to 60 sim-min (2026-10-18). Season 1 is 52.0 sim-min (max purchase gap 1.9 min, worst income jump 8.5×); gear prices unchanged from the spec. The bot buys every rod and pair cheapest-first and fishes with `bestRod`. Across seeds 1–8 season 1 runs 49.5–52.0 min with gear and 47.0–49.7 without, so buying gear costs the bot about 3 min. That holds at any gear price from 0.3× to 2×, because the cheap early pairs and rods delay the first helpers. Owning all gear free from the start would finish in about 42 min, and switching rods is worth about 2 min of that.
  - After piece 3: season 1 is 51.9 sim-min (max purchase gap 1.9 min, worst income jump 7.9×). The bot never throws chum, and the hatch needed no retune. Chum bucket prices, set by the payback test (one minute alone at the place, plain rod, the first fly reaching its deepest non-licensed fish, seeds 1–8) to about 2.5× payback: Creek $78 (extra $195, 2.50×), River $540 ($1,359, 2.52×), Big River $4,600 ($11,612, 2.52×), Mountain Lake $46K ($114K, 2.48×), Great Lake $120K ($291K, 2.43×).
  - After piece 4: season 1 is 49.3 sim-min (max purchase gap 1.9 min, worst income jump 7.7×). The bonuses kept their spec values (+10% per trophy, Guide +0.3 odds), but the prices moved from the spec's starting $25K / $8K to **$300K each**. At the starting prices both hires come before the Mountain Lake, and helpers then land its deep legendaries with the Guide's odds, which pushes that unlock's income jump to 10–13× on 7 of seeds 1–8. Halving either bonus alone didn't fix it, and nor did raising the Mountain Lake to $300K. At $300K the bot buys both right after the Mountain Lake (taxidermist@41.9, guide@42.3), and seeds 1–8 run 47.1–50.0 min with a worst jump of 9.3×. Without the two hires they run 49.3–52.4, so the hires save the bot about 2.3 min. Side effect: in a season the bot's first trophy is the Glacier Trout; the Limay King only mounts if you go back to the Big River.
- **Rules for the panel (piece 1):** the panel shows sale totals through `saleValue(state, withBonus)` in `economy.ts`, never its own bonus math.

## Panel changes after piece 3 (user's requests, 2026-10-18)

- The Chum bucket's blocked reason ("No rare fish within reach of your fly") sits under its description; in the price slot it doesn't wrap and crushed the label.
- The money bar is sticky at the top of the side panel, so it stays in view while scrolling.
- The body font is Jersey 10 instead of Pixelify Sans (Silkscreen still does headings, money and prices). Jersey 10 draws small, so body text went from 15 to 20 px, labels from 13 to 17, descriptions from 12 to 16.
- Building piece 3 also taught the scene to recast when the fly on the line changes mid-wait (`trackCatch` in `choreo.ts`), and fixed a hatch ended by travel restarting on the next tick (the next gap is drawn when a hatch starts).

## Deferred minors (from piece 3's review)

- The hatch swap runs in `tick`, so it also fires when a hatch starts while the recipe is dry and a non-dry fly is on the line (intended, same rule as `castPlayer`).
- A successful chum throw plays only the `chum` sound; the spec said the buy cue plus the chum sound.
- The Power-ups heading and the Chum bucket row reuse the basket icon; the spec asked for a bucket icon.
- Saved power-up timers have no upper clamp, so an edited save can set a very long bucket.

## Deferred minors (from piece 2's review)

- The late waders (Breathable $400K, Guide Pro $3M) are bought near the end of a season and barely pay back.
- A save whose `rods` or `waders` is not an array loads as a fresh game, as the other array fields already do.
- The Gear section heading reuses the Shop's fly icon.

## How to resume
Piece 3 landed on 2026-10-18 on `feat/shop-upgrades`, which ends there: PR #9 shipped pieces 1–3 to `develop`. The user moved pieces 4 and 5 to a separate shop-upgrades v2 (its own branch and PR, after #9). Next up there is piece 4 (Taxidermist and Guide), which has no spec yet: brainstorm it first. Start from the first piece not marked done: read its spec (or brainstorm it if there is none), then plan, then build. Update this table as pieces land.
