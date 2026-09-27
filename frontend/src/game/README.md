# Relay game slice — TASK-003

## Play

From `frontend`, run `npm ci`, then `npm run dev`. Arrow keys / A D move,
Space / Up jumps, R restarts. Click the playfield after choosing a demo state.
Cross five gaps and jump over the patrol drone to reach the uplink.
Keyboard controls are required; touch controls are not part of this slice.

## Integration for Rani

`Game` accepts `targetState?: PlayerState`, imported from `src/shared/contracts.ts`.
Pass a committed state with `<Game targetState={committedState} />` from the
integration owner’s React shell. Omitting the prop enables clearly labelled
simulated buttons. Passing `UNKNOWN` is a real neutral fallback and does not
activate demo mode. No raw metrics or state-engine imports are used.

`EchoScene.setTargetState(state)` is the scene boundary. The React wrapper retains
one scene and forwards prop updates; it also supplies the latest state on scene
creation so updates before boot are not lost. No 60-second dwell timer is
implemented here. Provider, AI and voice failures cannot block gameplay.

Shared contract shapes, App.tsx, package.json and shared configuration are unchanged.
The canonical contract was brought in from main, not redefined by this task.
The existing App preview headings are suppressed by the game UI stylesheet;
the integration owner can replace those obsolete shell labels later.

## State presentation

| State | Palette | Machinery activity | Patrol speed |
| --- | --- | --- | --- |
| CALM | Soft teal, deep cool blue | 0.35 | 45 px/s |
| ENGAGED | Blue highlights | 0.70 | 55 px/s |
| HIGH_AROUSAL | Warm amber highlights | 1.00 | 65 px/s |
| UNKNOWN | Neutral slate | 0.20 | 45 px/s |

`profiles.ts` centralizes profiles, geometry and the 1200 ms duration.
Phaser `Sine.easeInOut` tweens RGB channels and activity. Interrupting a tween
stops it in place and starts from the currently rendered values. Duplicate targets
are ignored. Icons, labels, machinery cadence and the drone direction/speed cue
complement color. Reduced-motion preferences freeze background machinery while
retaining gradual color fades. Camera, collision geometry and the route stay fixed.

The drone adopts pending speed only when reaching a patrol endpoint. No state
change teleports it, moves platforms or resets progress. A clear landing zone
precedes its patrol. Moving platforms were omitted to keep the baseline reliable.
Movement uses 100 ms coyote time and a 130 ms jump buffer.

## Verification

- `npm run build -- --configLoader runner`: TypeScript + production Vite build.
  The runner option works around sandbox restrictions on the default config bundler;
  no shared config was changed. Vite reports its usual large Phaser bundle warning.
- With `npm run dev` running, open `/src/game/tests/index.html` for the standalone
  real-Phaser browser checks. This fixture is not imported by the production app.
- The fixture drives actual keys, gravity and collisions through all four states;
  tests tween continuity, duplicate states, deferred speed, safe retries, React prop
  updates, labelled simulation and destruction on unmount.
- Keep the test tab active until it reports ALL CHECKS PASSED.

The test fixture is intentionally white-box for transition and patrol assertions;
it does not replace human playtesting or future live-sensing integration checks.
No Gemini, ElevenLabs, Presage or paid Game Agent APIs are called.
