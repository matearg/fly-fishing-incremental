# Background music: design

Piece 7 of the visual overhaul, agreed with the user on 2026-10-18. It builds on piece 6 (sounds), which is not merged yet, so the branch `feat/music` is cut from `feat/sounds`.

## Why

The game now has effects and water ambience but no music. A season is 30–50 minutes of mostly watching the water, and music makes that time feel calm and rewarding. Each place already looks different, and its music should feel different too, so moving upstream feels like progress.

## Goals (the user's words, then the agreed details)

- **"Calm chiptune, slow and relaxing, different per place."**
- **Six tunes:** one for the title and menu ("its own tune"), plus one for each place: Creek, River, Big River, Mountain Lake, Great Lake.
- **"Avoid annoying repetition."** This is the main risk the user named. A player should be able to fish a whole season to one tune without it starting to grate.
- Music plays **on top of the existing water ambience**, which stays as it is.
- **Its own volume row** in the title Settings page, as already decided in the sounds design: the same kind of row as the sound row (icon, 10-step bar, percent or OFF, click the icon to mute, click a segment to set the level), using the approved two-beamed-eighth-notes icon (`NOTES` in `src/art/soundIcons.ts`). The row goes right below the sound row.

## Non-goals

- No audio files and no third-party music. Everything is synthesized in code, the same way the effects are.
- No change to rules, timing, or pacing. `src/game/` gets no audio code.
- No music controls in the side panel or the fishing HUD (same as the sound row: Settings stays on the title).
- No music for events (catch stingers, season fanfare). The existing effects cover those.
- No change to the water ambience or the effects.

## Anti-goals (would be a failure even if it works)

- **A loop you can hear repeating.** Listening for ten minutes should not give you the feeling of "here it comes again".
- Music that fights the effects: a catch jingle or bite blip must still stand out.
- Busy, bouncy, or loud music. Calm and slow beats catchy.
- Music playing in a hidden tab, or a burst of backlogged notes when you come back.
- A music setting that resets on reload, New Game, or New Season.

## Constraints

- Phaser 4.2.1, TypeScript, Vite, Vitest. Phaser audio stays off; `src/audio/player.ts` stays the only Web Audio code.
- Pure, Node-tested data and decisions in `src/audio/`, the way `sounds.ts` and `cues.ts` work today.
- Audio can only start after the first user gesture (`SoundPlayer.unlock()`). Music starts then, with no error before.
- The music setting comes from `localStorage`, a trust boundary: a missing, corrupt, or out-of-range value falls back to the default and never throws (reuse `parseSound`'s rules).
- **House rule:** new sounds go through a user review stop on `/preview.html` before they are wired into the game. Here that means the user listens to every tune there and approves it.

## How it avoids repetition (agreed with the user as the approach)

Each tune is a handful of short **phrases** (a few bars each, with a melody part and a bass part), not one long fixed loop. As it plays, the game keeps picking the next phrase with a bit of randomness:

- It never plays the same phrase twice in a row.
- Now and then a phrase plays with the melody resting (bass only), so the music breathes.
- Now and then a single melody note drops out.

You keep hearing the same character and the same tune, but never the exact same minute twice.

## Calls I made (the user heard and accepted these in the playback)

- **Crossfade** of about 1.5 s when the tune changes (title ↔ game, travel between places), instead of a hard cut.
- **Hidden tab:** music stops with everything else (`SoundPlayer.pause()` suspends the context) and picks up again on return, without a burst of queued notes.

## Calls I made (not discussed, flagged in the hand-off)

- **Branch:** `feat/music` from `feat/sounds`, since it reuses the settings row and player from piece 6.
- **Parts:** a soft square-wave melody and a triangle bass, both quiet next to the effects, plus **a gentle beat** (the user's change at review, 2026-10-18: "keep melody and bass, add a gentle beat"). No other parts.
- **The beat:** soft and sparse, made from the noise channel (a light hat or brush) and a low, quiet thump. It has a few patterns per tune and follows the same anti-repetition rules as the melody: it can change pattern between phrases, and now and then it rests for a phrase. It must never get busy or loud enough to fight the "calm and slow" goal.
- **Tempo:** slow, roughly 60–80 BPM.
- **Character per place** (a starting point to tune at the review stop): Title, warm and welcoming. Creek, light and playful but unhurried. River, flowing, with a running bass. Big River, warmer and lower. Mountain Lake, sparse and spacious, with more rests. Great Lake, the slowest and widest, almost a lullaby.
- **Size:** each tune has at least 6 phrases of about 4 bars each, so it takes a few minutes before any combination comes back.
- **Music volume is separate from the sound volume.** The sound row keeps controlling effects and water; the music row controls only music. Both go straight to the speakers, so muting one never affects the other.
- **Music setting storage:** its own `localStorage` key, `flyfishing-music`, same shape and rules as `flyfishing-sound` (10 steps, 10% floor, mute keeps the level). Default **50%**, unmuted, a bit below the effects' 70% so the music sits in the background.
- **Changing the music volume** plays the menu "move" blip, the same as the sound row (heard at the effects volume).
- **Title tune** plays on the title and every menu page, including the "press start" attract screen once audio is unlocked.
- **Each tune starts from its first phrase** (written as the tune's opening) every time it comes in, then goes random. Coming back to a tune restarts it rather than resuming.
- **Menu text fallback** for the row reads `MUSIC 50%` / `MUSIC OFF`, like the sound row's.

## Left to the builder

- **Composing the tunes:** keys, melodies, chord choices, exact tempo and gains. Iterate them at the review stop.
- **Data format:** suggestion: write phrases as compact strings, one token per eighth note (a pitch name like `E5`, `-` to hold, `.` for a rest; the beat can use its own letters, e.g. `h` hat, `k` thump), parsed by a pure function that throws on a bad token or a phrase whose parts have different lengths, like `paint` does for pixel grids. Tests check that every phrase of every tune parses and has the expected length.
- **Phrase picking:** a pure function taking the tune, the previous phrase, and an injected `rand`, so the rules above (no immediate repeat, melody rests, dropped notes) are unit-tested with `seqRand`/`lcg`.
- **Scheduling:** Web Audio needs notes scheduled ahead of time. A common pattern is a short timer that queues the next phrase a second or so before the current one ends, using `AudioContext.currentTime`. Because a suspended context's clock stops, a hidden tab won't queue up notes, but the timer must not schedule into the past when the tab returns. Reuse `SoundPlayer`'s note-to-oscillator code (`notes()`), routed into a music gain node instead of the effects master.
- **Wiring:** `main.ts` already calls `sound.ambience(...)` every frame from the session mode and location; a matching call can pick the tune (`title` or the current location). `TitleScene.volumeRow` already takes an icon and a setting, so the music row is a second call with `NOTES`; `menu.ts` needs a `music` row and actions in its existing style and tests.
- **Review stop:** `/preview.html` gets a music section with a play button per tune and a stop button.
- **Roadmap:** add piece 7 to `docs/superpowers/plans/2026-10-17-visual-overhaul-roadmap.md` and keep it updated.
