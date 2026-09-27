# EchoShift - district progression (TASK-003)

## Play

From `frontend`: `npm ci`, then `npm run dev`. A/D or arrows move; hold Space/Up
for a full jump. Shift or X dashes horizontally once per airtime; landing or a wall
kick recharges it. Press jump against a wall to kick upward and away. R restarts.
The HUD shows dash availability, encounter number, threat tier and contextual hints.
The run is keyboard-only and silent. No audio assets or external services are required.

## Authored progression

The scene streams 2,160px encounters and retains at most five in ordinary traversal.
Each district occupies two encounters. District changes replace background scenery,
lighting, palette, particles, signage and props, with a short arrival title.

| Encounters | District | Mechanics and visual identity |
| --- | --- | --- |
| 1-2 | Rainline Rooftops | Pulse laser introduction, low security patrol, then flying drone and proximity mine. Blue skyline, heavy slanted rain, antennas, neon signs, reflections, flying vehicles and localized lightning. |
| 3-4 | Reactor Garden | Electrified decks and sweeping beams; disappearing/falling platforms combine with a mine and crusher. Green cores, coolant pipes, energy flow, plants and steam. |
| 5-6 | Neon Transit | Horizontal and vertical train platforms over pits, telegraphed turret shots, then a wide dash gap and moving laser. Moving express trains, rails, holographic station signage and fast traffic. |
| 7-8 | Abandoned Lab | Vertical wall-kick route, falling debris, mines and fast ground drones; then collapsing jump chains, rotating barrier, turret and dash gap. Enclosed damaged lab, broken glass, robots, warning screens and red emergency lighting. |

Later circuits add known threats to existing patterns. Encounter timing tightens up
to tier 7, then remains capped. Circuit two adds air patrols; circuit three also
adds pulse gates. The eight base layouts repeat rather than generating unbounded
random combinations. Entry and exit decks stay at y=590 with 100px district seams.
The lab has an elevated recovery ledge which requires a wall kick. Wide 270-280px
late gaps are designed for jump-plus-dash. Other gaps use ordinary full jumps,
with timing required for moving platforms.

## Hazard and platform rules

`levels.ts` owns authored geometry and eleven new hazard kinds: pulse laser,
vertical/horizontal sweep, electric floor, turret, flying/ground drone, rotor,
crusher, debris and proximity mine. The original stompable security drone remains
in the introductory pattern. New drones are contact hazards, not stomp targets.

Timed threats idle, warn for 700ms in amber, activate for 600ms, then reset. Their
cycle decreases from 3600ms to 2550ms by tier 7. Activation begins when the player
approaches, rather than cycling unseen for minutes in a streamed chunk. Mines
trigger within 110px, warn for 700ms, burst once, then become inert. Turrets show
the shot lane; crushers/debris mark the danger zone. Rotor collision follows the
rotated bar. Render and collision share the same hazard frame.

Falling and disappearing platforms show a draining warning stripe for 650ms after
landing, then fall or disable collision; they restore after 3500ms for retries.
Moving platforms carry the rider and use updated collision bounds. Ordinary decks
are one-way; solid lab walls allow wall sliding and kicking. Dash does not grant
invulnerability. Damage grants 1500ms immunity; three hits or a fatal fall ends a run.

Reduced motion stops background movement, rain animation and lightning, and reduces
sparks/shake. Gameplay hazards and moving platforms remain animated and readable.

## State integration and scoring

`Game({ targetState?: PlayerState })` remains the public entry point. Import the
canonical type from `src/shared/contracts.ts`. Omitted target enables clearly
labelled Demo Mode; a supplied UNKNOWN is the committed neutral fallback.
State transitions interpolate over 1600ms from current values; duplicates do not
restart the tween. They preserve the scene, geometry, score and health. The original
patrol samples its +0/+5/+10/+0 speed offset at endpoints. New hazard timing and
platform geometry depend on progress, not sensing state. No raw metrics, duplicate
dwell timers, Presage, Gemini, ElevenLabs or backend internals are used.

Score remains 1 per 10 new forward pixels, 100 per fragment, 75 per introductory
drone avoided/stomped once, and 150 per cleared encounter. Backtracking/idle time
cannot farm points. `HighScore` validates `echoshift.high-score.v1` in localStorage,
handles failures in memory, and survives instant restart and reload. Shared types,
App, dependencies and shared build configuration are unchanged.

## Verification

- `npm run build -- --configLoader runner`: TypeScript and production build. The
  runner option avoids this sandbox's config-loader restriction. Phaser still
  produces Vite's large-chunk warning.
- `/src/game/tests/index.html`: real Phaser/React checks for canonical states,
  smooth retargeting, patrol endpoint adoption, storage failures, scoring/restart,
  cleanup, hazard phase/hitbox rules, dash/recharge, authored gap traversal, wall
  climb, platform carry/collapse/recovery, electric-floor damage and invulnerability.
  Gap traversal isolates geometry from combat; it is not a claim of an automated
  no-damage full run through every combined pattern.
- `/src/game/tests/reload.html`: actual page reload persistence check.
- `/src/game/tests/gallery.html`: test-only buttons to review each encounter's
  art and play it directly. Not a production entry point.

Tests restore prior stored scores. Keep the verification tab active until
ALL CHECKS PASSED. Live sensing/voice integration remains the integration owner's work.
