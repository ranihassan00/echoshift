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

Unknown uses the original neutral timings: timed threats idle, warn for 700ms,
activate for 600ms, then reset; cycles decrease from 3600ms to 2550ms by tier 7.
A state profile continuously scales each threat's local clock, preserving its phase.
Calm lengthens safe intervals and warnings; Highly Engaged shortens them. Turret
firing cadence has its own rate, while projectile movement is integrated separately.
Proximity activation, authored geometry and matching render/collision frames remain.

Falling and disappearing platforms accumulate warning exposure using the current
state's smoothly changing collapse rate. At a steady state their grace is about
1444ms Calm, 650ms Unknown, 565ms Engaged, and 260ms Highly Engaged. A triggered
platform never reverses its warning progress during a state change; recovery remains
3500ms after first contact. Moving platforms carry the rider and use updated collision bounds. Ordinary decks
are one-way; solid lab walls allow wall sliding and kicking. Dash does not grant
invulnerability. Damage grants 1500ms immunity; three hits or a fatal fall ends a run.

Reduced motion stops background movement, rain animation and lightning, and reduces
sparks/shake. Gameplay hazards and moving platforms remain animated and readable.

## State integration and scoring

`Game({ targetState?, signalSource?, signalError? })` is the public entry point. Import the
canonical type from `src/shared/contracts.ts`. Omitted target enables clearly
labelled manual visual preview; a supplied UNKNOWN is the committed neutral fallback.
App now supplies automatic demo-engine state and signalSource="demo". Supplying a
target alone never implies live sensing. The HUD keeps simulated-source labeling.
Settings offers an explicit manual visual-preview toggle; turning it off restores
the latest committed sensing state without restarting Phaser.
State transitions interpolate visuals and difficulty together over 800ms from
current values; duplicate targets do not restart the tween. Invalid runtime targets
normalize to Unknown. UI labels are Unknown, Calm, Engaged, and Highly Engaged;
the elevated internal value is HIGHLY_ENGAGED. State changes preserve geometry,
score, health, and active hazard phase. Every district keeps its authored palette,
with saturation, brightness, temperature, glow and ambient particles layered on top.
Unknown applies no color grading and uses neutral difficulty. Reduced motion retains
static color grading but suppresses animated atmosphere.

| Multiplier | Calm | Unknown | Engaged | Highly Engaged |
| --- | --- | --- | --- | --- |
| Enemy movement | 0.55 | 1 | 1.05 | 1.8 |
| Laser/hazard cycle | 0.6 | 1 | 1.15 | 1.9 |
| Enemy firing cadence | 0.55 | 1 | 1.15 | 2.2 |
| Projectile movement | 0.85 | 1 | 1 | 1.18 |
| Platform warning consumption | 0.45 | 1 | 1.15 | 2.5 |
| Moving hazard motion | 0.65 | 1 | 1.1 | 1.65 |

These multipliers affect every streamed encounter through one shared profile. Moving
platform travel and player movement stay authored so the traversal geometry remains
playable. All timing multipliers ramp on the same tween as the atmosphere. No raw metrics, duplicate
dwell timers, Presage, Gemini, ElevenLabs or backend internals are used.

Score remains 1 per 10 new forward pixels, 100 per fragment, 75 per introductory
drone avoided/stomped once, and 150 per cleared encounter. Backtracking/idle time
cannot farm points. `HighScore` validates `echoshift.high-score.v1` in localStorage,
handles failures in memory, and survives instant restart and reload. The shared state value was renamed with all local consumers. App now owns sensing integration; dependencies and shared build configuration remain unchanged.

## Verification

- `npm run build -- --configLoader runner`: TypeScript and production build. The
  runner option avoids this sandbox's config-loader restriction. Phaser still
  produces Vite's large-chunk warning.
- `/src/game/tests/index.html`: real Phaser/React checks for canonical states,
  smooth retargeting, synchronized visual/difficulty ramping, storage failures, scoring/restart,
  cleanup, hazard phase/hitbox rules, dash/recharge, authored gap traversal, wall
  climb, platform carry/collapse/recovery, electric-floor damage and invulnerability.
  Gap traversal isolates geometry from combat; it is not a claim of an automated
  no-damage full run through every combined pattern.
- `/src/game/tests/reload.html`: actual page reload persistence check.
- `/src/game/tests/gallery.html`: test-only buttons to review each encounter's
  art and play it directly. Not a production entry point.

Additional deterministic checks: `node --test src/game/tests/stateProfiles.test.mjs`.
The browser suite checks state-scaled hazards in all eight encounters. Gallery
buttons can switch both encounter and engagement state for visual review.

Tests restore prior stored scores. Keep the verification tab active until
ALL CHECKS PASSED. `/src/game/tests/sensing.html` verifies the connected App lifecycle.
Live Presage and voice integration remain pending.
