# Piece 5: Bonuses (species log and combo)

Part of the shop upgrades roadmap (`docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`), second piece of shop-upgrades v2. Agreed with the user on 2026-10-24. Built on `feat/shop-upgrades-v2`.

## Why

Pieces 1–4 each added something to buy. Piece 5 adds rewards for *how* the player fishes. The species log is a "collect them all" goal: each new species is a small moment with a popup and a bounty, and the log stays across seasons. Filling the whole log needs the Taxidermist, which ties it to piece 4. The combo makes the choice of fly and place matter from cast to cast: a fly that reaches fewer species keeps a streak alive longer, and a long streak pays more.

## Goals

1. **Species log.** The first time the player ever catches a non-legendary species, a paper log card pops up with a sound and pays a small one-off bounty. The log is kept for the whole save and carries over New Season.
2. **Legendaries enter the log through the Taxidermist.** A mounted legendary shows as caught in the log, with no log card and no bounty.
3. **A species log list in the side panel.** A dropdown shows what's been caught, grouped by place.
4. **Combo.** Catching the same species several times in a row raises the value of each fish in the streak. A different species ends the streak.
5. **A combo counter on the game screen.** A "×N" readout in the top-right, under the place name.

## Non-goals

- **No basket set** (user's decision, 2026-10-24). The third bonus from the roadmap's pitch is dropped.
- **Helpers' catches don't count** (user's decision) toward the log, the bounty or the combo. The one exception is a legendary mounted from a helper's catch (see below).
- **No retroactive log for old saves.** The game never recorded what a save caught. An old save starts with an empty log, except for its mounted trophies (see Saves).
- **No log reset at New Season** (user's decision: "only the first time you catch them").
- **No trophy wall.** That stays a later idea of the user's.
- Nothing to buy. Both bonuses are free and always on.

## Anti-goals

- **No log card for a legendary** (user's decision: "the pop up should not show the same species the taxidermist does"). A legendary only ever gets the trophy plaque.
- **No phantom popups.** Loading a save, Continue, New Season, or adopting a save from another tab must not pop up cards for species already in the log. That's the same rule the trophy plaques follow.
- **A bounty is never paid twice** for one species in one save, across any number of seasons.
- **The combo must not touch the release bonus.** Trashing a combo fish adds the same release bonus as before (`releaseBonusOf` works from base value and size, not from `value`).

## Species log

### User's decisions

- The log entry, the card and the bounty come on the **first time ever** in the save. Never again, in any season.
- **Only the player's own catches** count.
- **Legendaries** (Limay King, Glacier Trout, Andes Tiger, El Cuero, Nahuelito) **give no log card and no bounty**. They show as caught in the log once the Taxidermist mounts them. Filling the whole log therefore means hiring the Taxidermist.
- The popup is **a tilted paper log card** with the fish on it (mockup option 1.B), plus a sound, in the same spot as the trophy plaques.
- **A small bounty** for each new species.
- The panel list is a **dropdown, grouped by place, with uncaught species shown as "???"** (mockup option 2.A). Places you haven't unlocked show "locked".

### My calls

- **State.** A new `speciesLog: string[]`: species ids in the order they entered the log. It goes in `Carry` (in `state.ts`) and in `startNewSeason`'s carry (in `prestige.ts`), next to `licenseSpecies`.
- **Rules.** In `sim.ts` `land()`, for the player's angler only (`!a.auto`), if the catch is a fish, its species isn't legendary, and it isn't in `speciesLog`: push it and `earn()` the bounty. In `mountTrophy` (`trophies.ts`), when a legendary is mounted, push it to `speciesLog` if it's missing, with no bounty. That covers helpers' catches too, since the Taxidermist mounts anyone's. A log entry is added on landing even when the fish is later trashed or sold. It never depends on the basket.
- **Mounts stay logged.** Trophies reset at New Season, but the log carries over, so a legendary mounted in an earlier season stays in the log. Mounting it again in a later season changes nothing in the log.
- **Bounty.** `BOUNTY = { mult: 5 }` in `data.ts` as a starting guess: the bounty is `mult × baseValue` of the species. That's raw base value, with no size, rod, license, trophy or combo multiplier. So $10 for a Puyen, $40 for a Brook Trout and $17,500 for a Steelhead. All 14 non-legendary species come to about $100K in total. Pacing sets the final number (see Pacing). It's paid through `earn()`, so it counts toward `seasonEarnings` like any income.
- **Log card art.** A tilted paper card with a punched hole, made from a grid run through `refine` and shown with `fineImage`, the same way the trophy shield is made in `art/sprites/plaque.ts`. The species' side sprite (`fishSideBitmaps`) goes on top. It should read lighter and smaller than the trophy shield. Two chunky text lines (`addText`, scale 1) sit under it: "NEW SPECIES: <NAME>" and "+$<bounty>", the second in its own colour, which the builder picks.
- **One queue for both popups.** Log cards and trophy plaques share the one popup slot, showing one at a time in the order they happened. They use the same timing (`PLAQUE_MS` hold, drop in, fade). `scene/fishing/plaque.ts` becomes a queue of `{ kind: 'log' | 'trophy', id }` entries, fed from both `speciesLog` and `trophies`. Whatever shape the builder gives it, it must keep the current rules: nothing already in the state when it's (re)adopted pops up, and cards cut short by the menu or a tab switch replay. A legendary that is mounted queues only its trophy plaque, never a card.
- **Sound.** A new synthesized `logged` sound in `audio/sounds.ts`: a short light chime, clearly smaller than the `trophy` fanfare. It plays when the card starts, the same way the trophy sound does.
- **Panel section.** A new "Species log" section at the bottom of the side panel, after Licenses, since it carries over like they do. It holds a single toggle button "Caught N of 19", where 19 is `SPECIES.length` and N is `speciesLog.length`. The button is `aria-expanded` like the basket stacks, closed by default. Whether it's open is panel state only and isn't saved. Open, it lists every place in `LOCATIONS` order, each headed "<PLACE> n/m" with that place's logged count over its species count. Under the heading, a logged species shows its `catchImg` and name, and a missing one shows "???".
  - **Locked places.** A place that isn't in `unlockedLocations` and has nothing logged shows "<PLACE> 0/m · locked" and no rows. Once any of a place's species is logged (from an earlier season, say), that place lists its rows normally, even while it's locked this season.
  - **Hinting at legendaries.** A missing legendary shows "??? (Taxidermist)", so the player can learn how those rows fill in.
  - License species are listed in their place like the others. They show "???" until logged.
- **Taxidermist description.** Unchanged. The log's "(Taxidermist)" hint is enough.
- **Art and sound review stop.** The log card with every non-legendary species, the popup layout with both text lines, and the `logged` sound all go on `/preview.html` for the user's review before the scene work.

## Combo

### User's decisions

- **The same species several times in a row** builds the streak. **A different fish breaks it.**
- **Only the player's catches** count.
- **A "×N" counter on the game screen, top-right under the place name** (mockup option C), with the species name in small text under it.
- Playback the user accepted ("looks fine"): junk doesn't break the streak, travel doesn't either, each fish in the streak is worth +10% more than the one before up to +100%, a New Season starts with no streak, the streak is saved, and a tick sound rises with the streak.

### My calls

- **State.** A new `combo: { defId: string | null; count: number }`, default `{ defId: null, count: 0 }`. It isn't in `Carry`, so New Season resets it.
- **Rules.** In `sim.ts` `land()`, for the player only, when the catch is a fish: if `defId` matches the catch, `count++`, otherwise `defId = catch; count = 1`. Then the catch's `value` is multiplied by `comboMult(count)` before it goes in the basket. Junk leaves `combo` untouched, whether or not the sorter drops it. A helper's catch never reads or changes `combo`. The streak includes legendaries like any species.
- **Multiplier.** `COMBO = { pctStep: 0.1, maxSteps: 10 }` in `data.ts` as a starting guess: `comboMult(count) = 1 + pctStep × min(count - 1, maxSteps)`. The 1st fish gets ×1, the 2nd ×1.1, and the 11th onward ×2. Pacing sets the final numbers. The bonus goes into the fish's stored `value` when it's caught, so the basket rows, Sell all and the Fish buyer all show and pay it with no new sale math. It multiplies with the rod and license values already baked in, and with Catch & Release and the trophies at sale time.
- **The value is set at landing, not at cast.** The catch is picked at cast (`pending`), but the combo multiplier is applied in `land()`. The streak can't change between the player's cast and land, since the player has one line and helpers don't touch it. Applying it at landing keeps `rollCatch` free of combo logic and means a re-pick on travel needs nothing extra.
- **Counter.** A HUD image in `FishingScene`, pinned under `placeText` at the top-right of the visible crop (`setScrollFactor(0)`, right-aligned like `placeText`). It shows "×N" in `TEXT_YELLOW` with the species name in `TEXT_WHITE` on a second line, both chunky text at scale 1 (`addText`). It's visible only while `count >= 2`. It updates when `count` changes and hides when the streak breaks (`count` back to 1) or on a New Season. The menu button stays clear of it.
- **Sound.** A new `combo` sound: a short tick played each time the counter goes up (count reaching 2 or more). Its pitch rises with the count and stops rising at `maxSteps`. It goes in `audio/sounds.ts`, and `audio/cues.ts` picks it from the frame-to-frame state diff, the way other catch cues are picked. The builder picks the exact notes.
- **No panel change** for the combo. The basket's rows already show each fish's higher value.
- **Review stop.** The counter's look (a still of the HUD at a few counts) and the `combo` sound go on `/preview.html` along with the log card.

## Saves

- `speciesLog` (`[]`) and `combo` (`{ defId: null, count: 0 }`) get defaults in `newGame()`, with `speciesLog` taken from `carry` when there is one. `SAVE_VERSION` stays 1, and `sanitize` fills both in for old saves.
- `sanitize` keeps only `speciesLog` ids that are in `SPECIES`, with duplicates dropped. A `speciesLog` that isn't an array loads as a fresh game, as the other array fields already do. It then adds any `trophies` the save already holds but `speciesLog` lacks, so an old save's mounted legendaries show as caught. Those don't pop up, by the no-phantom-popups rule.
- `sanitize` resets `combo` to the default if its `defId` isn't a species id or `null`, or if `count` isn't a non-negative integer.

## Pacing

- The bot is the player (`castPlayer`/`reelPlayer`), so it collects bounties and incidental streaks without any change to how it plays. It doesn't fish for streaks on purpose.
- Keep `pacing.test.ts` green: season 1 within 30–60 sim-min, no purchase gap over 8 min, no income jump over 10×. Bounties come early (four Creek species at once) and the combo raises income across the board, so expect season 1 to get shorter. If it falls under 30 or a jump goes over 10×, lower `BOUNTY.mult` and `COMBO.pctStep`/`maxSteps` before touching prices. If they have to shrink a lot, say so in the roadmap rather than quietly making them worthless.
- Record the results in the roadmap the way earlier pieces did: season 1 length, max gap, worst jump, and how much each bonus moves season 1.

## Left to the builder

- The exact shape of the shared popup queue, the log card's grid, the bounty line's colour, and the `logged` and `combo` notes, all within the rules above and judged at the review stop.
- Where the new `data.ts` constants sit, and whether the log and combo rules live in a new `progress/` module or next to `mountTrophy`.
