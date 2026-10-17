# Title screen and main menu — design

Piece 2 of the visual overhaul. Order agreed: (1) tying bench rework — done, (2) this, (3) fishing scene art + single helper + visible bites + per-place banks, (4) panel icons + owned-unlock styling.

## Intent

Right now the game opens straight into the fishing scene with plain boxes. The player should first get a welcome: a title screen that feels like a 16-bit arcade game (Sonic-era logo), with a living pixel-art river behind it, then a small menu. It sets the art style the rest of the overhaul follows.

## What the player sees

### Title (attract) state
- Full window, no side panel or basket bar. Same 480×270 pixel canvas as the fishing scene, scaled up crisp (`pixelArt: true`, FIT).
- **Background:** a top-down pixel-art river looping forever. Banks along the top and bottom edges, water between, current flowing left → right, ripples, drifting lily pads, fish of several kinds swimming across (mostly left → right, some against the current), small rocks/reeds on the banks.
- **Which river:** the place the save is currently at (`state.location`); with no save, the Creek. Each place has its own bank/water look (see "Per-place looks"). *(builder's/Claude's call, approved in principle by the user's "different places need different banks")*
- **Logo:** big arcade wordmark (mockup option B, chosen by the user). "FLY" huge on top, "FISHING" under it, yellow→orange stepped gradient, thick dark outline, drop shadow; "INCREMENTAL" small on a tag below. Gently bobs (≈2 px).
- **"PRESS START"** blinks under the logo.
- Any key, click or tap → menu state.

### Menu state
- Logo slides up a little; menu appears under it over the same river.
- Items:
  - **Continue** — only shown when a save exists. Returns to the game.
  - **New Game** — starts a fresh game. If a save exists, asks first: "This erases your progress. Are you sure?" with Yes / No. *(Claude's call: this replaces a "Reset progress" option in Settings.)*
  - **Settings** — opens a sub-menu: **Fullscreen** on/off, **Back**.
- Navigation: arrow keys (or W/S) + Enter/Space, or mouse hover + click, or tap. A small fish/fly cursor marks the selected item. Esc in a sub-menu or the confirm = back.
- Choosing Continue or New Game fades (≈300 ms) into the fishing scene, and the side panel and basket bar appear.

### Back to the menu
- In the fishing scene, **Esc** or a small menu button (top-right corner of the canvas) returns to the menu state (not the press-start state). The game is paused there; Continue resumes.

## Behaviour rules

- **Paused on the title/menu:** the simulation `tick` does not run, autosave does not run. On returning to the game, the frame clock restarts (no catch-up), same rule as hidden tabs today.
- **"Save exists"** means `localStorage[SAVE_KEY]` holds a save that `deserialize` accepts (not just any string). Corrupt saves count as no save.
- **New Game** = `newGame()` written to storage immediately (so other tabs adopt it via the existing `storage` listener), then enter the scene.
- **Every page load starts on the title screen**, even with a save.
- **Fullscreen** uses the document (`document.documentElement.requestFullscreen()`), not Phaser's canvas fullscreen, so the DOM side panel stays visible in game. The toggle reflects the real state (`document.fullscreenElement`), including when the player leaves with the browser's own Esc/F11.
- Space and Enter on the title/menu belong to the menu; the existing "Space casts the line" handler must not fire while the menu is up.
- **Saving around the menu** *(Claude's call)*: save once when the player leaves the game for the menu; write nothing while the title/menu is up. The `pagehide` and tab-visibility saves only write while the player is in the game, so a first-time visitor who never presses Continue/New Game leaves no save behind (and Continue does not appear on their next load).
- Existing save sync from other tabs keeps working: on the menu, an adopted save from another tab updates whether Continue is shown.
- In fullscreen, browsers take Esc to leave fullscreen, so the corner menu button is the reliable way back to the menu there.

## Per-place looks

Each of the 5 places gets its own bank and water palette so progress is felt. Used by the title backdrop now and by the fishing scene in piece 3. Proposed (builder may adjust within the spirit):
- **Creek:** narrow, light water, grass and pebbles.
- **River:** wider, sandy edge, reeds.
- **Big River:** darker water, mud banks, logs.
- **Mountain Lake:** clear blue-green water, rocky banks, pine trees.
- **Great Lake:** deep blue, sandy beach, a wooden dock.

## Art

- **Logo:** drawn from scratch as pixel art (a PNG or code-drawn sprite), not a font rendered at runtime. The mockup's thresholded-font letters are a placeholder only.
- **River tiles, bank decorations, fish:** CC0 packs (OpenGameArt, itch.io, Kenney) if a consistent set fits the 480×270 scale; otherwise drawn from scratch. Avoid mixing packs whose styles clash. Fish sprites chosen here are reused in piece 3, so they should have a top-down variant (here) and either a side variant or be redrawn to match for piece 3.
- **Menu font:** a CC0 pixel font if one fits; otherwise hand-made bitmap glyphs.
- **Licensing:** CC0 only by default. If a must-have asset needs attribution, stop and ask before using it. Record every third-party asset's source URL and license in `public/assets/CREDITS.md` (even CC0, for traceability).
- **Fish are generic** *(user's decision)*: a few base fish sprites, recolored per species, with size growing with rarity tier and price (common smallest, legendary biggest). No per-species artwork. The backdrop shows the current place's species this way. Piece 3 reuses the same approach in side view.
- Fish animation: 2-frame tail wiggle. Lily pads/ripples move with the current.

### Art review stops *(user's decision)*
Pause and show the user, wait for approval before continuing:
1. When the **logo** is drawn.
2. When the **Creek** backdrop (banks, water, fish) is done, before drawing the other four places.

## Goals
- A title screen the user is proud to show, in the chosen B-wordmark style.
- Continue / New Game / Settings working with keyboard, mouse and touch.
- Per-place backdrops.

## Non-goals
- Audio (no volume settings until there is audio).
- Restyling the side panels (piece 4).
- The fishing scene's art (piece 3).
- Save slots, export/import, credits screen.

## Anti-goals
- New Game wiping a save without confirmation.
- The sim running (or saves being written) while the player sits on the menu.
- Blurry scaling, or a logo that looks like a default font.

## Builder's calls
- Exact pixel art, palettes, animation timings, and the per-place details above.
- How the title is structured in Phaser (separate scene vs states), as long as the rules above hold and existing behaviour (save sync, pause on hidden tab) is preserved.
- Test coverage for the new logic (save-exists check, pause gating) following the repo's vitest style.
