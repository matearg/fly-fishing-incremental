# Piece 3: Power-ups (chum bucket and hatch)

Part of the shop upgrades roadmap (`docs/superpowers/plans/2026-10-18-shop-upgrades-roadmap.md`). Agreed with the user on 2026-10-18.

## Why

The user wants short bursts that change how the next minute plays. The chum bucket is a frenzy you pay for: for 60 s the player's line pulls up rare and legendary fish. The hatch is a surprise from the water: insects swarm, and switching to a dry fly pays off right away. Both show a big title with waving letters, so the player knows at a glance that something is on.

## Goals

1. **Chum bucket**: paid each time it's thrown; for 60 s the player's catches lean hard toward rare and legendary fish.
2. **Hatch**: a random event at the current place; for 45 s the player gets faster bites while fishing a dry fly.
3. **A waving title on screen** for each while it's on: big letters, each bobbing on its own wave.
4. **Insects over the water** during a hatch.
5. **Switching the recipe to a dry fly during a hatch swaps the fly on the player's line immediately.**

## Non-goals

- **Helpers get nothing from either** (user's decision). Only `anglers[0]` is affected.
- The bucket **raises odds, it doesn't guarantee** rare fish (user's decision; "rare or better" includes legendaries).
- No offline progress: both timers only run in `tick`, like everything else.
- Nothing carries over New Season.
- No extra chum visuals in the water beyond the title (my call; the title is what the user asked for).
- The pacing bot does not use power-ups (my call, see Pacing).

## Anti-goals

- **A bucket must never feel like wasted money.** It can't be thrown when the player's fly can't reach any rare or legendary fish at this place (e.g. a dry fly at the Mountain Lake, whose only non-common/uncommon fish are deep legendaries), and the button says why.
- **The swap must never lose a fly or leave the player without one.**

## Chum bucket

### User's decisions

- Paid with money **each time it's thrown** (a consumable, not a one-time buy).
- Lasts **60 s**. During it, rare and legendary species weigh much more in the player's catch roll. Odds, not a guarantee.
- **Player only.**
- A big waving title (e.g. "CHUM!") shows on screen for the whole 60 s.

### My calls

- **How the odds rise:** in `rollCatch`, when the caster is the player and chum is on, rare and legendary species weights are multiplied by `CHUM.mult` (start around 10), on top of the fly's `oddsBonus`. Junk weights don't change. Target: with a fly that reaches them, rare-or-better are about half of the fish caught at each place (rough math: ×10 gives 40–60% from Creek to Great Lake). Tunable in `data.ts`.
- **When it applies:** at cast time, like the rod bonus. A catch picked before the bucket was thrown keeps its fish; a catch picked during the last second of the bucket keeps its rare fish after it ends.
- **One at a time:** the button is disabled while a bucket is running and shows the seconds left.
- **Belongs to the place:** travelling ends it (the chum is in that water).
- **Price is set per place** in `data.ts` (a `CHUM.cost` per location), so it stays a real decision all season. One formula like `k × cheapest base value` can't fit every place: the builder check estimated Big River pays back about 2× more per cheapest-fish unit than the other places, because the Limay King is worth 71× the Creole Perch. Goes through `price(state, base)`, so waders discount it like every other money purchase.
- **Payback test (sets the prices):** a headless test at each place plays the player alone (`castPlayer`/`reelPlayer` every tick, like the bot) for 60 s with and without a bucket over several seeds, plain rod. The fly is the first pattern, plus at most one material, in `data.ts` order that reaches the place's deepest non-licensed fish. At the Mountain Lake and Great Lake that means a bead, since their legendaries sit at depth 3 and no pattern reaches it alone. The extra sale value earned with the bucket is between 1.5× and 4× the place's price.
- **Can't throw** when no rare or legendary species at this place is within reach of the player's current fly (the fly on the line, or the recipe if none). The button is disabled with a short reason ("No rare fish within reach of your fly").
- **Panel:** a new **Power-ups** section right after Fly. One row: bucket icon, "Chum bucket", description ("Rare and legendary fish bite more for 60 s"), and a buy-style button with the price, or the seconds left while running. Uses the existing `buy`/`nope` cues on click, plus the new chum sound.

## Hatch

### User's decisions

- A **random event at the current place**, lasting **45 s**.
- When it starts, **insects appear over the water** and a waving title like **"HATCH! USE DRY FLIES"** shows.
- **Faster bites on dry flies, player only.**
- **During a hatch, changing the recipe to a dry fly changes the fly on the line immediately.**

### My calls

- **Faster bites:** while a hatch is on and the player's fly is a dry pattern (`cls: 'dry'`), the wait after a cast is drawn from 1.5–2 s (`TIMING.biteMinMs` to `HATCH.waitMaxMs`) instead of 1.5–4 s. Applied when the wait starts. The minimum stays at 1.5 s because the cast animation (back cast, forward cast, sink) takes 1.4 s, and a shorter wait would bite before the fly lands (found while planning). Nothing else changes; dry flies still only reach depth-0 fish, so the hatch trades depth for speed.
- **How often:** the next hatch comes a random 3–6 min of play after the last one ended (or after the game starts / a new season). Tunable in `HATCH`. The countdown runs in `tick` only.
- **Travelling ends a hatch** (it belongs to that water); the countdown to the next one keeps running.
- **Overlaps with the chum bucket** are fine; both titles show, stacked.
- **The swap, exactly:**
  - When `setRecipe` sets a dry pattern while a hatch is on and the fly on the player's line isn't dry: the old fly goes to the front of the box, and the player gets a dry fly: the first dry fly already in the box if any, else one tied from the recipe (paying its tie cost), else the free basic fly (which is a dry fly). Nothing is lost; helpers take the returned fly from the box as usual.
  - If the player is **waiting**, the pending catch is re-picked for the new fly and the wait restarts with the hatch's shorter range.
  - If the player is in **bite** or **reeling**, that fish lands first; the swap happens before the next cast.
  - When a hatch is on and the recipe is dry, `castPlayer` applies the same rule when it picks up a fly, so a dry fly that wears out mid-hatch is replaced by a dry one.
  - The box may briefly hold more than one fly per angler after a swap; the bench just pauses until it drains (existing `benchFull` rule).
- **Panel:** the Power-ups section shows a hatch line while one is on ("Hatch! Dry flies bite faster: 32 s"). No button; the player reacts through the existing recipe controls.

## On screen (both)

- **Waving titles:** the title's letters are separate images, each offset vertically by a sine wave with a phase per letter, so the word ripples. Shown at the top center of the view for the whole duration; chum and hatch each get their own color. When both are on, they stack. They hide when the effect ends.
- **Letters:** `BIG` in `src/art/font.ts` only has the logo's letters today. The builder either draws the missing big letters or uses `SMALL` at 2×; the art review decides.
- **Insects:** small pixel insects (drawn in code like everything else) flutter above the water across the current place during a hatch, a dozen or two, using `lcg` for stable but lively motion.
- **Sounds:** a splash for throwing the bucket and a short buzz or chime when a hatch starts, synthesized in `sounds.ts`, fired through `cues.ts`.
- **Review stop:** the titles, insects and both sounds go on `/preview.html` for the user's approval before they're wired into the scene.

## Constraints

- Rules stay in `src/game/` (pure, Node-tested); the panel only shows and dispatches; the scene only reads state.
- New `GameState` fields (chum time left, hatch time left, time until next hatch) get defaults in `newGame()`; `sanitize` fills them for old saves; `SAVE_VERSION` stays 1. A save loaded mid-effect resumes it.
- Functions return `boolean` like the rest (e.g. `throwChum(state)`).
- Tunables live in `data.ts` (`CHUM`, `HATCH`).
- **Pacing:** the bot ignores both power-ups, so `pacing.test.ts` measures the season without them; their payoff is upside for an active player. The bot fishes dry flies only while its deepest pattern is a dry one (Basic Dry, Elk Hair), and never swaps during a hatch since it sets the recipe every tick to the same pattern; it does get the hatch's faster bites in that early stretch, which shortens its early game a little. The hatch countdown may also consume `rand` and shift the bot's runs. `pacing.test.ts` must stay green, retune `data.ts` if needed, and record the result in the roadmap.
- **Tests:** chum raises rare/legendary odds only for the player and only while on; chum ends on travel and after 60 s; can't throw while running, when unaffordable, or when no rare fish is within reach; the payback test above; hatch starts on its countdown and ends after 45 s or on travel; faster waits only for the player on a dry fly; the swap keeps every fly (box + line count unchanged except a newly tied one), re-picks a waiting catch, and waits out bite/reel; save sanitizing of the new fields.

## Left to the builder

- Field and function names; how `rollCatch` learns the caster is the player (piece 2 already passes the rod).
- Whether the swap lives in `setRecipe` or a wrapper the panel calls.
- Exact title colors, letter size, wave speed and insect look (through the art review).
- Final `CHUM` and `HATCH` numbers within the targets above.
- **Marked as my calls after the builder check:** per-place chum prices instead of one formula, and the payback test's fly choice.
