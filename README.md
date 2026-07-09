# ZORK vNEXT

> You are standing in an open field west of a white house, with a boarded front door.

A loving, modern, mobile-first reimagining of **Zork I: The Great Underground Empire** —
the 1977 classic by Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling
([source historically released by Activision](https://github.com/historicalsource/zork1)).

The classic parser game you remember lives in the bottom third of the screen.
The top two-thirds is something new: a living, procedurally painted scene for
every location — fireflies over the meadow at dusk, torchlight flickering in
the great dome, the thief's stiletto glinting in his lair — plus a fully
procedural ambient soundtrack synthesized in your browser. No assets, no
downloads, works offline once loaded.

## Play

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (dist/)
npm run preview  # serve the production build
```

Open it on your phone (or a narrow browser window) for the intended layout:
scene on top, scrolling transcript + command bar pinned to the bottom, with
quick-command chips for the exits available in the room you're standing in.

## What's in the port

- **The classic core of Zork I**: the white house, the cellar and troll,
  the maze and Cyclops, Flood Control Dam #3, the Loud Room, the Dome and
  Torch rooms, the Temple, the thief's treasure room, the rainbow…
- **Ten treasures** to find and stow in the trophy case, with the original
  take/case scoring model, ranks, and a proper victory.
- **The puzzles you remember**: the rug and the trap door (and the thing that
  bars it behind you), the rope and railing, `ECHO`, the dam's yellow button
  and wrench, praying at the altar, `ULYSSES`, waving the sceptre at the
  falls, feeding a very hungry cyclops, the skeleton key and the grating.
- **Grues.** It is pitch black. Bring the lamp; watch the battery.
- **Classic verbs & synonyms** (`take`, `x`, `i`, `put x in y`,
  `attack troll with sword`, `xyzzy`…), plus `SAVE` / `RESTORE`
  (localStorage) and `RESTART`.

## The modern flair

- **Scene renderer** (`src/scenes/`): every room maps to a hand-tuned
  procedural painting — layered silhouettes, volumetric light shafts, fog,
  particles (fireflies, embers, dust, mist, sparkles), all canvas 2D, all
  seeded so each room always looks like itself. Scenes react to the world:
  the rainbow turns solid, the reservoir drains to mud, the trap door yawns
  open, the troll's eyes go out, and darkness is… watching.
- **Sound engine** (`src/audio/`): Web Audio synthesis only. Ambient beds
  per region (birdsong in the forest, drips in the caves, the roar of the
  Loud Room) crossfade as you travel; effects (treasure chimes, sword
  clashes, the grue's growl, a victory fanfare) are synthesized per event.
- **Mobile-first UI**: safe-area aware, 16px input (no iOS zoom), exit
  chips, typewriter transcript (tap to skip), landscape/desktop layout
  that moves the console to a side panel.

## Toward native

The app is plain TypeScript + Vite with zero runtime dependencies, so it
wraps cleanly with [Capacitor](https://capacitorjs.com) or Tauri whenever
you want app-store builds: `npx cap init && npx cap add ios android` against
the `dist/` output is all it takes to start.

## Credits

Original game © 1977–1981 Infocom / Activision; source released for
historical preservation at
[historicalsource/zork1](https://github.com/historicalsource/zork1).
This project is an independent fan tribute: a fresh TypeScript engine and
new art/sound inspired by the original's text.
