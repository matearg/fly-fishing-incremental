# Shop upgrades: roadmap and progress

New bonuses, power-ups, helpers and shop items, agreed with the user on 2026-10-18 and split into five pieces. Each piece goes through the same steps as the visual overhaul: brainstorm, then design doc in `docs/superpowers/specs/`, then plan in `docs/superpowers/plans/`, then build. Work happens on `feat/shop-upgrades` (draft PR #9 to `develop`).

## Progress

| # | Piece | Status |
|---|-------|--------|
| 1 | Catch & Release (trashing fish adds a bonus to the next Sell all), Buyer pause button, descriptions kept on owned items | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 2 | Gear: rods and waders | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 3 | Power-ups: chum bucket and hatch | **Done**, merged to `develop` in PR #9 (`0189ae8`). Spec and plan deleted once done; in history up to `0189ae8` |
| 4 | New helpers: Taxidermist and Guide | **Done** on `feat/shop-upgrades-v2`. Spec `specs/2026-10-19-taxidermist-guide-design.md`, plan `plans/2026-10-19-taxidermist-guide.md` |
| 5 | Bonuses: species log and combo (basket set dropped) | In progress: rules and pacing done |

## Decisions already made (carry into later pieces)

- **Every shop item keeps its description once owned** (user's request). New items in pieces 2–5 follow the same rule.
- **Gear (piece 2):** settled in the gear spec (in history at `0189ae8`). Rods make the player's catches of their tiers sell for more, and you pick which owned rod to fish with. Waders give a shop discount (best pair owned) and no sale value; any owned pair can be worn as a look. Only the player's angler uses gear, and it resets at New Season. This replaces the earlier pitch where waders also raised sale value.
- **Power-ups (piece 3), as pitched:** the chum bucket costs money and raises rare odds for 60 s; the hatch is a random event at the current place where dry flies get more bites for 45 s, with insects on screen. Settled in the power-ups spec (in history at `0189ae8`): player only, both end on travel, switching to a dry recipe mid-hatch swaps the fly on the line.
- **Helpers (piece 4):** settled in `specs/2026-10-19-taxidermist-guide-design.md`. Both are one-off hires that reset at New Season, $300K each (see Pacing).
  - **Taxidermist:** mounts the first legendary of each species landed after hiring it, by anyone. The fish is kept and sold. Each trophy adds +10% to every fish sold; the bonus multiplies with Catch & Release and the Fish buyer's sales get it too. On a mount, a plaque pops up under the power-up titles with a fanfare. It replays if a menu or tab switch cuts it short, and never plays for trophies a loaded save already had.
  - **Guide:** hired anglers get +0.3 odds, the player gets nothing. A figure with a straw hat and a landing net stands on the bank once hired, with no animation.
  - **Layout:** the River and Mountain Lake banks are widened from shoreX 70 to 76 to fit the Guide.
  - **Relaxed anti-goal:** the Guide draws over the helper so its net shows, and the net covers the helper's shins. The spec said the Guide must not cover the helper; the user approved the preview showing it drawn this way.
  - **Later, the user's idea:** a trophies menu (a trophy wall). It's out of piece 4.
- **Bonuses (piece 5):** settled in `specs/2026-10-24-species-log-combo-design.md`. Only the player's own catches count.
  - **Species log:** the first catch ever of each non-legendary species pays a bounty of 4× its base value and pops a log card. Mounted legendaries enter the log with no card or bounty. The log carries over New Season.
  - **Combo:** each fish in a same-species streak is worth +10% more than the one before, up to +100%. Junk and travel don't break it.
  - **Basket set: dropped** (user's decision, 2026-10-24).
- **Pacing:** every piece keeps `pacing.test.ts` green. Before piece 1, season 1 was at 49.98 of 50 sim-min, so each piece retunes `data.ts` as needed. After piece 1: season 1 is 49.0 sim-min (max purchase gap 2.4 min, worst income jump 7.2×). Piece 1 set Catch & Release $1,500, Junk sorter $1,000 (from $450) and Mountain Lake $150K (from $200K); the release price alone could not make room, since season 1 moved within noise (50.0–50.5) for any price from $1K to $8K.
  - After piece 2: the user raised season 1's limit to 60 sim-min (2026-10-18). Season 1 is 52.0 sim-min (max purchase gap 1.9 min, worst income jump 8.5×); gear prices unchanged from the spec. The bot buys every rod and pair cheapest-first and fishes with `bestRod`. Across seeds 1–8 season 1 runs 49.5–52.0 min with gear and 47.0–49.7 without, so buying gear costs the bot about 3 min. That holds at any gear price from 0.3× to 2×, because the cheap early pairs and rods delay the first helpers. Owning all gear free from the start would finish in about 42 min, and switching rods is worth about 2 min of that.
  - After piece 3: season 1 is 51.9 sim-min (max purchase gap 1.9 min, worst income jump 7.9×). The bot never throws chum, and the hatch needed no retune. Chum bucket prices, set by the payback test (one minute alone at the place, plain rod, the first fly reaching its deepest non-licensed fish, seeds 1–8) to about 2.5× payback: Creek $78 (extra $195, 2.50×), River $540 ($1,359, 2.52×), Big River $4,600 ($11,612, 2.52×), Mountain Lake $46K ($114K, 2.48×), Great Lake $120K ($291K, 2.43×).
  - After piece 4: season 1 is 49.3 sim-min (max purchase gap 1.9 min, worst income jump 7.7×). The bonuses kept their spec values (+10% per trophy, Guide +0.3 odds), but the prices moved from the spec's starting $25K / $8K to **$300K each**. At the starting prices both hires come before the Mountain Lake, and helpers then land its deep legendaries with the Guide's odds, which pushes that unlock's income jump to 10–13× on 7 of seeds 1–8. Halving either bonus alone didn't fix it, and nor did raising the Mountain Lake to $300K. At $300K the bot buys both right after the Mountain Lake (taxidermist@41.9, guide@42.3), and seeds 1–8 run 47.1–50.0 min with a worst jump of 9.3×. Without the two hires they run 49.3–52.4, so the hires save the bot about 2.3 min. Side effect: in a season the bot's first trophy is the Glacier Trout; the Limay King only mounts if you go back to the Big River.
  - After piece 5: season 1 is 47.4 sim-min (max purchase gap 2.0 min, worst income jump 7.7×). The combo kept the spec's +10% a fish up to +100% (`COMBO = { pctStep: 0.1, maxSteps: 10 }`), which the user accepted in playback. The bounty moved from the spec's 5× base value to **4×** (`BOUNTY.mult`): at 5× seed 7 jumps 10.4× at the Mountain Lake unlock. Seeds 1–8 run 45.6–48.3 min (average 46.9) with a worst jump of 9.7×. Without either bonus they average 48.6, with the bounty alone 46.9 and with the combo alone 48.0, so the bounties save the bot about 1.7 min and the combo adds little on top (the bot doesn't fish for streaks). The Mountain Lake jump is noisy on its own: with neither bonus, seed 12 already jumps 10.4×, so seeds past 8 aren't a usable bar.
- **Rules for the panel (piece 1):** the panel shows sale totals through `saleValue(state, withBonus)` in `economy.ts`, never its own bonus math.

## Panel changes after piece 3 (user's requests, 2026-10-18)

- The Chum bucket's blocked reason ("No rare fish within reach of your fly") sits under its description; in the price slot it doesn't wrap and crushed the label.
- The money bar is sticky at the top of the side panel, so it stays in view while scrolling.
- The body font is Jersey 10 instead of Pixelify Sans (Silkscreen still does headings, money and prices). Jersey 10 draws small, so body text went from 15 to 20 px, labels from 13 to 17, descriptions from 12 to 16.
- Building piece 3 also taught the scene to recast when the fly on the line changes mid-wait (`trackCatch` in `choreo.ts`), and fixed a hatch ended by travel restarting on the next tick (the next gap is drawn when a hatch starts).

## Deferred minors (from piece 4's review)

- The plaque board image is created with the `'fig:guide'` texture as a placeholder. It's hidden until a plaque starts.
- An edited save with `trophies` but `taxidermist: false` still pays the trophy bonus.
- At $300K, the Taxidermist mostly pays off in later seasons. Season 1's bot buys it with about 7 sim-min left, and the Limay King needs a trip back to Big River.

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
Pieces 1–3 shipped to `develop` in PR #9. Shop-upgrades v2 runs on `feat/shop-upgrades-v2`. Piece 4 (Taxidermist and Guide) landed there on 2026-10-19. Next up is piece 5 (combo, species log, basket set), which has no spec yet: brainstorm it first. Start from the first piece not marked done: read its spec (or brainstorm it if there is none), then plan, then build. Update this table as pieces land.
