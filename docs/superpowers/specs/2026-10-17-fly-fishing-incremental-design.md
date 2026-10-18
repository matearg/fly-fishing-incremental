# Fly Fishing Incremental: Design

Date: 2026-10-17
Working title: none yet (builder may use a placeholder)

Marked **(Mateo)** = decided by Mateo. Marked **(Claude's call)** = a default chosen during design that Mateo has not explicitly confirmed; change freely if they object.

## Intent

An incremental game in the spirit of *Scritchy Scratchy* (scratch lottery tickets, buy better tickets, automate), re-themed around **fly fishing** (Mateo). What hooks Mateo is **the numbers getting huge and the game gradually playing itself** (Mateo). Hands-on play is the on-ramp to automation, not the point.

The Scritchy mapping: the lottery ticket becomes **the fly**, scratching becomes **casting and reeling**, and the odds of a winning ticket become **the odds of a bigger, rarer, more valuable fish**.

Mateo has worked with TypeScript, Java, and Python but has never built a game. The project should stay approachable for them to read and modify.

## Goals

- A satisfying manual loop (cast, reel, sell) that steadily gets automated away.
- Numbers that grow to absurd sizes over a run and across runs.
- Prestige ("New Season") that makes every run faster and opens new fish.
- Easy, frequent rebalancing while the game is developed.

## Non-goals

- **No oceans.** Rivers and lakes only (Mateo).
- **No idle/offline progress.** The game only progresses while it is open; closing the tab and coming back gives nothing (Mateo: "I don't want an idle game").
- **No isometric view.** 2D side view (Mateo dropped isometric).
- No Steam build yet. Browser first; Steam is a "maybe later" (Mateo). Don't make choices that block wrapping it as a desktop app later.
- Mobile/touch support, multiplayer, accounts, cloud saves, and save export/import are out of scope for v1 (Claude's call).

## Anti-goals

- **Unbalanced feel** (Mateo): an overpowered upgrade that trivializes everything, or a stretch where progress crawls. These are the things Mateo says make players quit this genre. Tuning will happen iteratively during development (Mateo), so the build must make tuning cheap (see Balance).

## Constraints and stack

- **Runs in the browser** (Mateo).
- **2D pixel art, side view** (Mateo).
- **Free art assets** for now (Mateo). Asset licenses must allow commercial use, since a Steam release is possible (Claude's call). Placeholder shapes are fine until assets are picked.
- **TypeScript + Vite + Phaser** (Claude's call). Phaser renders the scene (water, angler, fish, line, animations) with pixel-art settings (no smoothing, integer scaling). The shop, fly panel, helpers, basket, and trash can are **HTML/CSS layered over the canvas** (Claude's call), because that's easier to build and read for someone new to games.
- Plain JS `number` for currency (reaches about 1e308). No big-number library unless the balance actually exceeds that (Claude's call).
- UI language: English (Claude's call).

## Screen layout (Mateo picked option A, "side view, under the surface")

(The original wireframe was a throwaway mockup. This text is the source of truth.)

- **Scene (left/main):** the angler stands on a bank on the left. The water is shown in cross-section, so fish are visible swimming at different depths. Money is shown large in a corner.
- **Right panel:** the current fly (name and wear bar), the shop (materials, patterns), helpers, location travel, and New Season.
- **Bottom strip:** the catch basket with a **Sell all** button, and a **trash can** next to it.

Hired anglers appear on the bank beside the player, each with their own line in the water, so automation visibly fills the screen (Claude's call).

## Core loop

1. **Cast** (Mateo): the player clicks to cast. The fly lands and sinks to the depth its pattern allows.
2. **Bite:** after a short wait a fish (or junk) from the reachable depths bites.
3. **Reel** (Mateo): the player clicks or holds to reel it in. The exact reel interaction is up to the builder. It should be quick and pleasant, not a hard skill minigame (Claude's call), because the game is about numbers, not dexterity.
4. The catch goes into the **basket**. The fly loses 1 wear.
5. When wear hits 0 the fly is gone. The player **ties a new one** (Mateo: flies wear out).

## Flies (the "ticket")

- **Patterns** (Mateo: "fly shapes") set the **depth** the fly reaches, following real fly fishing (Claude's call): **dry fly = surface, nymph = mid-water, streamer = deep**. More patterns can exist within each class.
- **Materials** (Mateo) shift the odds toward **bigger, better, more expensive fish** (Mateo), and can also add depth (e.g. a bead sinks deeper), add wear, or raise the size roll.
- **Tying** (Mateo): the player picks a pattern and materials and ties the fly.
- **Economy (Claude's call):** unlocking a pattern or material is a one-time purchase. **Each fly tied costs money** for its materials, the way each Scritchy ticket costs money. This keeps a constant money sink and makes "is this better fly worth it" a real decision.
- **Fly box (Claude's call):** tied flies go into a shared stock (the fly box). The player can tie ahead. Every angler, player included, has one fly on the line with its own wear, and when it breaks they take the next fly from the box. A hired angler with an empty box stands idle until a fly is tied. The fly panel shows the player's current fly plus the box count.
- **Never stuck (Claude's call):** a basic dry fly is always tieable for free (or near free), so a player with no money and no fly can always keep fishing.
- Depth is the main visible odds lever: rarer fish live deeper, so a better fly visibly reaches where the valuable fish swim (Claude's call).
- **Depth is a ladder (Mateo):** a fly reaches every band from the surface down to its maximum depth and can catch anything there. A deeper fly is a straight upgrade. Within a class, patterns differ by stats (max depth, wear, odds bonus, cost), not by which band they target. Depth-adding materials (beads) raise the maximum depth.

## Catches

- Each location has a **catch table**: species by depth band, with a rarity tier (e.g. common → uncommon → rare → legendary), each worth many times the tier below.
- Each catch rolls a **size**, and value scales with it.
- **Junk** (Mateo): old boots, cans, tangled line, worth **0 or negative** money.
- **Basket** (Mateo): catches pile up. **Sell all** sells everything in it, junk included, so junk's negative value hits the total. The player can **drag junk to the trash can** to discard it for free. Keeping or trashing junk is the player's choice (Mateo). There's no basket capacity limit and junk causes no penalty other than its sale value (Mateo).

## Automation (helpers)

Each manual action gets a helper. All of this is Claude's call except the idea of automation itself (Mateo):

- **Hired angler:** casts and reels automatically into the shared basket. Buy many; cost scales up.
- **Tying bench / apprentice:** automatically ties replacement flies using the player's chosen pattern and materials (still paying material costs).
- **Junk sorter:** automatically trashes junk (shown in the layout mockup).
- **Fish buyer:** automatically sells the basket on an interval. It completes the "game plays itself" goal.
- Helpers fish with the fly setup the player has currently selected, and each consumes wear from tied flies (needs the bench to sustain).
- Helper speed, count, and efficiency upgrades are part of the shop.

## Places

- **Rivers and lakes, no ocean** (Mateo, "the places idea is great"). Proposed order (Claude's call): **creek → river → big river → mountain lake → great lake**.
- Unlocked by paying money. Each has its own catch table, maximum depth, and higher-value fish.
- Some legendary species exist only after they're unlocked with Fishing Licenses (see prestige).

## Prestige: "New Season" (Mateo)

- The player can **start a New Season** once they've progressed far enough (threshold is the builder's call).
- Resets money, flies, helpers, unlocked patterns and materials, and places.
- Grants **Fishing Licenses** (Mateo), based on how far the run got (formula is the builder's call; diminishing returns like sqrt of lifetime earnings is typical).
- Licenses buy permanent:
  - **Minute-0 upgrades** (Mateo): e.g. start with a better fly, cheaper helpers, more wear per fly, start at a later location.
  - **New, better fish species** unlocked into the water (Mateo).
- Each season should get further, faster.

## Pacing and length

- **First season with no license upgrades: about 30–60 minutes** to reach the point where a New Season is worth starting (Mateo).
- **Later seasons get shorter** as license upgrades accumulate (Mateo).
- **Content cap (Claude's call):** v1's content ends at the great lake plus the license-only legendary species. New Seasons stay repeatable with no hard ending, but no content exists beyond that cap in v1. Content volume (patterns, materials, species, upgrades) should be sized to fill that first 30–60 minute season and a handful of faster ones after it.
- Check plain `number` against this. If the planned curves stay under about 1e300 across the planned seasons, no big-number library is needed.

## Saving and time

- Autosave to `localStorage` every few seconds and on page hide. Include a version number in the save so later changes can migrate old saves (Claude's call).
- Progress happens only while the game runs. When the tab is hidden the simulation pauses, and **no catch-up is applied on return** (Claude's call, consistent with Mateo's "only with the game open").

## Balance (supports the anti-goal)

- **All tuning numbers in one data module** (Claude's call): prices and cost growth, catch tables and odds, fish values, wear, helper rates, license formula, location unlock costs. Game logic reads from it; rebalancing means editing data, not logic.
- A **dev-only speed multiplier** to fast-forward and feel pacing quickly (Claude's call).
- Number formatting: plain up to a few thousand, then suffixes (K, M, B, T…), then scientific notation (Claude's call).

## Left to the builder

- Exact numbers and curves (they'll be tuned by playing anyway).
- Which free asset packs to use, as long as the licenses fit.
- The reel interaction details, animations, sound (optional).
- Game name (a placeholder is fine).
- Code structure and milestone order. A sensible first milestone is one location (creek) with cast → reel → basket → trash → sell → tie a new fly. Then add helpers, then places, then New Season.
