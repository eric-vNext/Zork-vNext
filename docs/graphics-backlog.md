# Graphics Backlog — Zork vNext

Working backlog for pushing the scene renderer from "atmospheric" to
"high fidelity." Handed off for design work; pull the branch
`claude/zork-port-modern-ui-molbyu`, everything below points at real files
and real scene/room ids.

## The brief

- **Rendering is 100% procedural Canvas 2D** — `src/scenes/paint.ts` (shared
  primitives: gradients, ridges, tree bands, stalactites, particles, fog,
  light shafts) and `src/scenes/scenes.ts` (one hand-painted function per
  room, keyed by `scene` id from `src/data/world.ts`). No image/audio
  assets, no network fetch, zero runtime dependencies — the whole app is
  154 KB. **Preserve this constraint unless you deliberately decide to
  break it** (see "If you want to introduce real image assets" below).
- **Palette is already set** in `src/style.css` (`--amber #ffb454`,
  `--amber-soft #ffd9a0`, deep near-black `--bg #0a0e14`) and echoed
  through every scene's glows and gradients. New work should sit inside
  this palette, not fight it — the amber lamplight-in-the-dark feeling is
  the whole identity of the piece.
- **Scenes are reactive**, not static: they read `s.flags` (e.g.
  `rainbowSolid`, `trollDead`, `cyclopsAsleep`, `gatesOpen`) and `s.t`
  (seconds since the scene loaded) to animate and to reflect game state.
  Any upgrade has to handle every state a room can be in, not just the
  first-visit look.
- **Every room is seeded** (`mulberry32(hashSeed(...))` in `renderer.ts`)
  so a given room always looks like itself between visits, but scenes are
  regenerated procedurally each frame — there's no baked/cached bitmap.
  Keep frame cost in mind (see the perf item in P2).
- **Current weak point, bluntly**: most scenes are flat-fill geometric
  silhouettes (ellipses, rects, simple gradients). The lighting and mood
  read well; the actual shapes read as vector-art placeholders, not
  finished illustration. That gap is what this backlog exists to close.

If you want to introduce real image assets (SVG illustrations, sprite
sheets, etc.) instead of pushing the procedural system further, that's a
legitimate direction — just flag it as an explicit architecture decision
(it changes the offline/zero-dependency story and the bundle-size story)
rather than sliding into it accidentally.

## How to use this

Three tiers by player-visible impact, not by difficulty. Each item names
the current state, the target, and the files it touches. Pick top-down
within a tier.

---

## P0 — Tonight's focus (highest player-visible impact)

**1. White House hero art**
The game's iconic opening image and it's currently a flat-color box.
Current: `drawHouse()` in `scenes.ts` — solid rect body, one triangle
roof, two flat window rects. Target: shingle/board texture on the roof
and siding, real window mullions with depth, weathered wood grain on the
boarded door and windows, a believable ground shadow. Used by scenes
`whiteHouse`, `houseSide`, `behindHouse` (all share `drawHouse()`).
Files: `src/scenes/scenes.ts` (`drawHouse`).

**2. Troll — character and room**
Current: two ellipses (body, head) plus a rotated rectangle+triangle
axe. Weakest creature art paired with one of the most memorable
encounters. Target: an actually articulated hunched figure (shoulders,
arm holding the axe, a face with menace, not just two red dots), a
readable axe-swing animation tied to the existing "nicks your arm" hit
event, and a death/dissolve treatment for when he's slain (currently he
just vanishes on the next paint). Wall bloodstains/claw marks are two
stroke lines — give them real texture. Scene: `trollRoom`.
Files: `src/scenes/scenes.ts` (`trollRoom` scene), `src/main.ts` (hook a
one-shot "hit" flag into `sceneFlags()` if you want the swing to trigger
on the actual combat turn rather than looping constantly).

**3. Cyclops — character and room**
Current: a body ellipse, a head circle, and a single eye — by far the
thinnest creature render for what should be the most physically
intimidating thing in the game. Needs brow, arms, a mouth, real mass.
Must cover four distinct states already wired via flags: hungry/awake
(`cyclops` scene, no flags set), fed-and-thirsty, asleep
(`cyclopsAsleep`), and fled through the wall (`cyclopsFled`, currently
just a hole in the wall with light — keep that part, it works). Scene:
`cyclops`. Files: `src/scenes/scenes.ts`.

**4. Treasure Room payoff**
This is the emotional high point of exploration — currently a gradient
ellipse "gold heap" glow (good) around a chalice that's four flat
polygons and a thief silhouette that's two ellipses. Target: an
actually opulent render — coins/gems as distinct forms, not just a glow;
a chalice with real vessel geometry and highlight; the thief with a
readable cloak/hood silhouette. Scene: `treasure`.
Files: `src/scenes/scenes.ts`.

**5. Dome Room / Torch Room — sense of scale**
These two rooms are supposed to feel vertiginous (20-foot dome, rope
disappearing into darkness) and currently read as flat and small — a
few concentric arcs and a rectangle pedestal. Target: real architectural
scale cues (a tiny player-scale reference point, more convincing dome
curvature/parallax, better rope physicality when `ropeTied` is set).
Scenes: `dome`, `torchRoom`. Files: `src/scenes/scenes.ts`.

**6. Item icon system**
There is currently **no iconography anywhere** — inventory and the
trophy case are pure text. Target: a small (~32–48px) canvas-drawn icon
per treasure (egg, painting, platinum bar, ivory torch, gold coffin,
sceptre, pot of gold, trunk of jewels, bag of coins, silver chalice) plus
lamp and sword, consistent line weight and palette, legible at inventory
list size. This is the single highest-leverage item on the list — it
touches the UI (`#transcript`/inventory rendering in `main.ts`) as much
as the scene layer. New file suggested: `src/scenes/icons.ts`.

**7. Water primitive**
Water currently appears four different ways with no shared logic:
stroke-line "shimmer" in `canyonBottom`, a plain gradient rect in
`reservoir`, streak lines in `loudRoom`, a gradient wedge for the sluice
in `dam`. Target: one shared animated water primitive in `paint.ts`
(surface ripple/caustic movement, a believable torrent state for when
`gatesOpen` is true) that all four scenes call, so upgrading it once
upgrades every water scene. Also used by `endOfRainbow`'s falls streaks.
Files: `src/scenes/paint.ts` (new primitive), `scenes.ts` (adopt it in
`canyonBottom`, `reservoir`, `loudRoom`, `dam`, `rainbow`).

**8. Fire/flame primitive**
Flame is currently ad hoc in three places with three different qualities:
the living room fireplace (five flickering ellipses), the torch room
pedestal flame (one ellipse + glow), and the altar candles (two small
glows). Target: one shared layered-flame primitive (inner core, outer
lick, heat-shimmer) in `paint.ts`, parameterized by size/color, adopted
everywhere fire appears — including the ivory torch treasure itself if
carried into a dark room. Files: `src/scenes/paint.ts` (new primitive),
`scenes.ts` (`livingRoom`, `torchRoom`, `altar`).

---

## P1 — Next up

**9. Thief character**
Pairs with #4. Current: two ellipses, same treatment as the troll.
Target: a distinct silhouette language from the troll (leaner, cloaked,
hooded) with a stiletto glint, subtle idle sway, and a proper "vanish
into shadow" animation on death instead of an instant swap. Scene:
`treasure`.

**10. Skeleton legibility (maze3)**
Current: four rib arcs and a skull circle — doesn't read as a skeleton
at a glance, which undercuts what should be an ominous beat (this is the
game's one explicit "you can die and this is what's left" image).
Target: a clearly readable ribcage, skull, and scattered long bones.
Scene: `mazeSkeleton`.

**11. Egyptian Room / gold coffin**
Current: a flat gold-gradient trapezoid. Target: actual sarcophagus
iconography — a face mask on the lid, hieroglyphic banding down the
front (the wall glyphs already do a reasonable stylized version of this
in the same scene — extend that language onto the coffin itself). Scene:
`egyptian`.

**12. Temple/Altar stonework**
Pillars in `temple` are flat two-stop gradients; the altar block in
`altar` is a single gradient rectangle. Target: fluting detail on the
pillars, a believable worn-marble texture on the altar surface (candles
are already good — keep them). Scenes: `temple`, `altar`.

**13. Aragain Falls / rainbow upgrade**
This is the payoff moment for the wave-sceptre puzzle and deserves more
than seven stroke lines for the falls. Target: a fuller waterfall render
(use the water primitive from #7) and a more magical, distinct visual
beat for the solid-vs-shimmer transition when `rainbowSolid` flips.
Scene: `rainbow`.

**14. Dam face + sluice drama**
The dam wall is a gradient wedge with stroke-line expansion joints
(joints are a nice detail, keep them). Target: real concrete/dam-face
texture, and — using the water primitive from #7 — a genuinely dramatic
torrent when `gatesOpen` is true instead of a static gradient triangle.
Scene: `dam`.

**15. Cave rock/stone texture primitive**
Every underground scene (`cellar`, `chasm`, `gallery`, `studio`,
`trollRoom`, `passage`, `roundRoom`, `maze*`, etc.) shares `caveBase()`
in `scenes.ts`, which is flat silhouette fills for stalactites/
stalagmites/ridges. Target: a fractal-noise rock-texture primitive in
`paint.ts` that `caveBase()` can apply, so every cave scene gains
surface detail from one change. This is the highest-leverage item after
the icon system in terms of scenes touched (roughly 20 of them).

**16. Gradient banding fix**
Dark-scene sky/glow gradients (`sky()`, `glow()` in `paint.ts`) show
visible banding on OLED phone screens, especially in the near-black
`cavernBig`/`darkness` scenes. Target: a subtle noise-dither overlay
applied after gradient fills to break up banding without adding visible
grain on top of the existing film-grain pass.

**17. Trophy case fill state**
Currently a static gradient rectangle in `livingRoom` regardless of how
many treasures are actually in it. Target: once #6 (item icons) exists,
visually populate the case with the collected icons as treasures are
deposited, so the case fills up over the course of a playthrough. Scene:
`livingRoom`.

---

## P2 — Later / stretch

**18. Scene crossfade quality**
The transition in `renderer.ts` is a flat alpha dissolve for every scene
change. Target: consider a directional wipe or light-flash variant for
narratively loaded transitions (trap door slamming shut, cyclops
smashing through the wall, praying at the altar) versus a plain fade for
routine movement.

**19. Combat impact effects**
Sword/troll and sword/thief fights have sound (`sword`, `swordHit` sfx)
but zero visual feedback on hit. Target: a brief screen-space flash or
shake tied to the existing sfx events, surfaced from `main.ts`'s
`fx.sfx` list into the renderer.

**20. Victory sequence**
The win moment (trophy case complete, Dungeon Master appears) is
currently text-only in the transcript with no scene-layer payoff.
Target: a bespoke full-screen visual beat — light burst, all deposited
treasure icons glowing — since this is the single largest payoff moment
in the whole game.

**21. Death variants by cause**
All deaths currently resolve to the same `darkness` scene regardless of
cause (grue, troll, cyclops, drowning in the flooding maintenance room,
falling into the chasm). Target: distinct brief visual beats per death
type before settling into the shared "You have died" darkness screen.

**22. Grue "glimpse" treatment**
Current darkness scene shows blinking eye ellipses on a timer. Since the
whole point of a grue is that you never actually see one clearly,
consider a treatment that's more unsettling-suggestive (motion at the
edge of vision, a shape that resolves into nothing) rather than a clean
pair of eyes.

**23. Mobile performance pass**
Every scene repaints full-screen gradients every frame via
`requestAnimationFrame`, even for static elements that haven't changed.
Target: profile on a mid-tier Android device; consider caching mostly-
static layers (sky/ridge/architecture) to an offscreen canvas and only
repainting the animated layer (particles, flame, water) each frame.

**24. `prefers-reduced-motion` audit**
Flame flicker, particle drift, and any parallax added in this backlog
should degrade to a calmer static state when the user has motion
reduction enabled. Currently unaudited.

**25. Room title card / status bar chrome**
Adjacent to graphics rather than scene art: the room title card
(`#room-title-card` in `style.css`) and status bar are plain text with a
drop shadow. Target: a more bespoke "carved stone / brass plate"
treatment that matches the fantasy setting, rather than generic
sans-serif-with-shadow UI chrome.

---

## Not in scope (flag before touching)

- Swapping Canvas 2D for WebGL/Three.js — would meaningfully change the
  performance and complexity profile; worth a conversation first, not a
  silent architecture change mid-backlog.
- Adding real audio samples in place of the synthesized `src/audio/`
  engine — out of scope for a graphics backlog, but flagging so nobody
  conflates "high fidelity" across both systems by accident.
