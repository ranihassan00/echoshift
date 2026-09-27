# EchoShift — continuous city run (TASK-003)

## Play

From `frontend`: `npm ci`, then `npm run dev`. The run starts immediately.
A/D or arrow keys move; hold Space/Up for a full jump, tap for a short hop.
R restarts. After a fatal fall or losing all three health segments, the final-score
overlay offers an immediate restart without a page reload.

The game occupies the viewport. Demo / Settings opens the clearly labelled
simulated state controls and a reduced-motion/shake option. OS reduced motion is
also respected. The experience uses keyboard controls and is silent; no audio
assets, network services or paid asset tools are required.

## Continuous course and movement

The same Phaser scene streams curated 2,160-pixel sections, with three rooftop
platforms per section. All seams have 90–110 pixel gaps and at most 50 pixel rises.
A full jump at running speed can cross every seam. Several sections stay active;
sections more than a section behind the player are removed only when safe. A
backtracking boundary prevents returning into removed space. At most five sections
are active in normal traversal.

Districts change every two sections: rainline rooftops, transit spine, foundry,
archive ruins, reactor garden and machine cathedral. World-anchored structural
landmarks scroll into view without loading or scene replacement. Cached skyline
textures provide three parallax layers, with rain, distant traffic, holographic
signage, low haze, wet roof details, localized lightning and bounded sparks.

Movement: 310 px/s cap, 1,800 px/s² acceleration, 2,300 px/s² braking,
110 ms coyote time, 140 ms jump buffer and variable jump height. Landing particles,
segmented armor, visor, scarf and limb movement communicate motion and impact.
Moving platforms, dash, additional enemies and complex combat are intentionally
outside this focused version.

## Score and difficulty

- 1 point for each 10 new pixels of maximum forward distance (displayed as 1 m).
- 100 points per energy fragment, collected only once.
- 75 points per drone avoided or defeated, awarded only once for either action.
- 150 points for each completed section, awarded once.
- No idle-time reward, backward-distance reward or repeat-farming reward.

Difficulty increases every two sections to tier 4, then stays capped. Gaps increase
from 90 to 110 pixels; drone patrol speed ranges from 60 to 102 px/s including
state variation. Every section keeps its safe route and recovery spaces.

The security drone uses a 650 ms visible warning, 150 ms short-range attack and
1,000 ms recovery. Jump over it, wait outside its marked range, or land on top.
Damage has 1,500 ms invulnerability; falls are fatal. Minor camera shake is optional.

## High scores

`HighScore` in `run.ts` validates and loads `echoshift.high-score.v1` from localStorage.
It records new records as score increases. Invalid/negative/non-integer/unsafe values
fall back to zero. Unavailable storage and quota errors leave the run operational,
with an in-memory session record and a saving-unavailable notice at game over.
Ordinary restart keeps the record; reload retrieves it. Tests restore prior stored
scores so verification does not replace the user's record.

## State integration for Rani

`Game` accepts `targetState?: PlayerState`, imported from `src/shared/contracts.ts`.
Use `<Game targetState={committedState} />`. Omitting the prop activates simulated
controls. Passing `UNKNOWN` selects the neutral committed fallback, not Demo Mode.

`EchoScene.setTargetState(state)` ignores duplicate targets. RGB values and ambient
activity transition with `Sine.easeInOut` over 1,600 ms, starting from current rendered
values on interruption. HUD color follows the same interpolated accent. Machinery
and traffic phase is accumulated continuously rather than recomputed from state,
so retargeting cannot jump animation phase.

| State | Presentation | Patrol offset |
| --- | --- | --- |
| CALM | Deep blue, cyan, gentle activity, circle symbol | +0 px/s |
| ENGAGED | Cyan/violet, more active machinery, diamond | +5 px/s |
| HIGH_AROUSAL | Amber/magenta, stronger bounded activity, triangle | +10 px/s |
| UNKNOWN | Blue-gray, stable fallback, dash and signal-unavailable label | +0 px/s |

Patrol offsets apply only at endpoints; warning/attack/recovery timing and collision
geometry are independent of PlayerState. State changes never reset score, health,
progress or the scene. The game neither consumes raw sensing metrics nor duplicates
the engine's 60-second dwell timer. No Presage, Gemini, ElevenLabs, API or backend
internals are imported. Companion text is a bounded local placeholder tied to actual
introductory obstacles. Future dialogue wiring belongs to Rani.

The existing App shell remains intact. Its legacy preview labels are hidden in the
owned stylesheet; the old HUD export remains as an empty compatibility slot, while
Game renders the connected overlay HUD. Shared contracts and config files are unchanged.

## Verification

- `npm run build -- --configLoader runner`: TypeScript + production build. The runner
  option avoids the sandbox's config-bundler filesystem restriction. Vite warns about
  the Phaser bundle size; no package or shared build configuration was changed.
- Run `/src/game/tests/index.html` through Vite for real Phaser/React browser checks.
  The fixture verifies all four states across three sections, capped difficulty,
  variable jump height, score/no-farming rules, chunk recycling, smooth interrupted
  state transitions, deferred speed changes, fatal-fall final stats, restart,
  simulation labelling, the React game-over button and resource cleanup.
- `/src/game/tests/reload.html` verifies persistence through an actual page reload,
  then restores the previous high score.
- The fixture also checks malformed/unavailable storage and 100 section seams.
- Keep the test tab active until ALL CHECKS PASSED. Test files are not production
  entry points and require no additional dependencies.

Known scope limits: keyboard-only, no live sensing/voice integration, no audio,
no moving platforms, reused curated geometry, and a large bundled Phaser runtime.
Future varied section designs must preserve the tested seam and hazard-spacing rules.
