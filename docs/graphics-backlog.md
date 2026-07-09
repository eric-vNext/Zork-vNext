# Graphics Hand-off Pilot — Zork vNext

**This is a pilot, not the full backlog.** Before committing a whole
night to 25 tasks, we're testing the round-trip itself: can Claude Design
produce visual direction for a room in this game, and can that direction
survive translation into this app's actual rendering (seeded, animated,
state-reactive Canvas 2D — not static assets)? Three screens, one full
loop each. If the loop works cleanly, the rest of the backlog (preserved
at the bottom) is ready to run through the same pipeline.

## The brief (Claude Design needs this before making anything)

- **Rendering is 100% procedural Canvas 2D** — `src/scenes/paint.ts`
  (shared primitives: gradients, ridges, particles, light shafts) and
  `src/scenes/scenes.ts` (one hand-painted function per room). No image
  assets, no network fetch, zero runtime dependencies — the whole app is
  154 KB. **Whatever Design produces will be reinterpreted as shapes,
  gradients, and animation curves by Claude Code — not imported as a
  file.** Treat outputs as reference/direction, not final assets.
- **Palette is already set** in `src/style.css`: `--amber #ffb454`,
  `--amber-soft #ffd9a0`, deep near-black `--bg #0a0e14`. Stay inside it —
  the amber-lamplight-in-the-dark feeling is the whole identity of the
  piece.
- **Scenes animate and react to game state** (`s.t` = seconds since
  scene load; `s.flags` = things like `trollDead`, `cyclopsAsleep`).
  A mockup only needs to nail the primary "at rest" look — Claude Code
  will handle the state variants and motion — but call out anywhere the
  look should obviously change (e.g. the troll on death) so it's not lost.

## The 3 pilot screens

Picked to stress different problems — architecture, creature, materials —
so the pilot tells us something about the pipeline in general, not just
about one scene.

**1. White House — architecture**
Current: `drawHouse()` in `scenes.ts`, a flat-color box with a triangle
roof. Ask Design for: a painterly colonial house with roof texture,
window depth, weathered board grain on the door. Used by scenes
`whiteHouse`, `houseSide`, `behindHouse`.

**2. The Troll — creature + room**
Current: two ellipses and a rotated rectangle for an axe. Ask Design for:
an articulated hunched figure with real menace, readable against the
`trollRoom` scene (bloodstained cave walls). Scene: `trollRoom`.

**3. Treasure Room — materials and opulence**
Current: a gradient glow, a four-polygon chalice, a two-ellipse thief.
Ask Design for: an opulent gold-and-gem heap with real material read,
plus a chalice with actual vessel form. Scene: `treasure`.

## Hand-off protocol

1. **Design → repo**: drop whatever Claude Design produces (images,
   exported frames, notes on palette/materials/silhouette) into
   `docs/design-refs/` — one subfolder per screen (`white-house/`,
   `troll/`, `treasure-room/`). Commit them straight to this branch so
   Claude Code can pick them up without a manual file transfer.
2. **Code reads the refs**: a Claude Code session opens each folder,
   reverse-engineers the direction into `paint.ts`/`scenes.ts` primitives,
   and screenshots its own output (the way the original scenes were
   verified) to compare against the reference.
3. **Report back per screen**: what translated cleanly, what had to be
   approximated because it's procedural rather than raster, and roughly
   how long the round-trip took. That's the actual output of this pilot —
   more useful than the three screens themselves.

## Success criteria

- Did the in-game result read as recognizably "the same design" as
  Design's reference, once reduced to code-drawn shapes and gradients?
- Where did the procedural-only constraint force a compromise, and was it
  a small loss or a dealbreaker? (A dealbreaker on all three screens would
  be a real signal to revisit the "no image assets" rule, not a pipeline
  failure.)
- Rough time cost per screen for the full loop, to estimate whether
  running the other 22 items through this pipeline is worth it.

---

## Phase 2 — full backlog (resume after the pilot)

Kept as an index only; full detail (current state / target / files) for
every item below is in this doc's git history (`git log -p -- docs/graphics-backlog.md`) from before this pilot scope-down, or ask Claude Code
to regenerate detail for any item on request.

**P0 — ALL DONE** (this branch): White House/kitchen/living room,
troll, cyclops (all states), treasure room + thief, Dome/Torch Room
scale, item icon system (inventory strip + trophy case fill), shared
water primitive (dam, reservoir, rainbow/falls, loud room, canyon
bottom), shared fire primitive (living room, torch room, altar,
treasure room sconces). Also done from P1: rainbow/falls upgrade, dam
face + sluice drama, gradient banding dither, trophy case fill state,
and a static-layer render cache (was P2 #23).

**P1 — ALL DONE**: Skeleton legibility (maze3), Egyptian coffin, temple
pillar fluting/stonework, and a shared rock-facet texture wired into
caveBase so every generic cave scene (cellar, chasm, gallery, studio,
passage, round room, loud room, lobby, maintenance, maze, grating...)
picked it up from one change.

**P2 — ALL DONE**: Combat impact effects, victory sequence, death
variants by cause, the rebuilt grue glimpse, narratively loaded
flash-cut transitions (trap door slam, the altar prayer) layered over
the routine dissolve, `prefers-reduced-motion` support (screen shake
is skipped outright rather than dampened), bespoke carved-stone/brass
UI chrome for the status bar and room title, and a performance fix
for `filmGrain()` (was 60-400+ draw calls/frame via nested per-tile
and per-scanline loops; now two cached `CanvasPattern` fills).

Remaining unclaimed performance work: the generic `caveBase()` scenes
(cellar, chasm, gallery, studio, passage, round room, loud room,
lobby, maintenance, maze, grating) still repaint their full static
geometry every frame rather than using the `paintBase`/`paint` split
the hi-fi scenes use — a real next win, deliberately deferred rather
than rushed as a 12-scene refactor late in a session.

**P3 — SPIKED, prototype live**: A WebGL2 evaluation build now exists
at `/webgl-proto.html`, fully isolated from the game (own module under
`src/webgl-proto/`, own HTML entry, own stylesheet; the only shared
file touched is `vite.config.ts`, which gained a second, additive
`rollupOptions.input` entry — `index.html`'s own output is byte-for-byte
unchanged). It demonstrates the pitch on the two candidate hero scenes:

- Real 5-octave simplex fractal noise with domain warping driving both
  a fire scene (Living Room hearth) and a water scene (dam/falls),
  replacing hand-coded facet/gradient approximations.
- A genuine 2-pass bloom pipeline: luminance bright-pass → separable
  Gaussian blur (ping-pong half-res framebuffers) → additive composite.
- 4,000 GPU-instanced particles (embers / spray) with zero CPU-side
  simulation — an order of magnitude past what `spawnParticles()` does
  in JS.

Caveats from the spike, for whoever picks this up next: the water
shader's visual character reads more like drifting foam/cloud than
flowing water and would want another tuning pass before being called
representative; and any FPS numbers gathered in a headless/sandboxed
environment reflect software (swiftshader) rendering, not real
device/GPU performance — re-benchmark on an actual device before using
perf numbers to justify (or reject) a migration.

Still unresolved, and blocking a real migration decision either way:
this is one render layer for two scenes, not a plan for porting all
~30 rooms' worth of `src/scenes/paint.ts` logic, state-flag-driven
variants, and the Canvas-based UI overlays (transcript, chips, status
bar) that currently composite over the canvas via DOM. Treat the spike
as answering "can this look good and perform," not "here is the
migration path."

## Not in scope (flag before touching)

- Swapping Canvas 2D for WebGL/Three.js *as a silent incremental
  change* — see P3 above; it's a real direction, just not one to slide
  into mid-backlog without deciding first.
- Video clips / animated media for scene fidelity — considered and
  rejected: state-reactive scenes (`trollDead`, `cyclopsAsleep`,
  `rainbowSolid`, ...) would need a pre-rendered clip per flag
  combination, and video can't be recolored or composited as cheaply
  as procedural or shader-based rendering. Revisit only for a specific
  one-off cinematic beat (e.g. the victory sequence), not as a general
  fidelity strategy.
- Adding real audio samples in place of the synthesized `src/audio/`
  engine — a different backlog entirely.
