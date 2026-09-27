# Player State Engine

Pure TypeScript gameplay interpretation. These states are not medical diagnoses,
confirmed emotions, or clinical stress measurements. No React or Phaser dependency.
Shared type shapes remain in `../shared/contracts.ts`.

## Public API and integration

Import `PlayerStateEngine` from `src/state/index.ts` (relative to the consumer).
`submit(metrics)` accepts `PlayerMetrics | null | undefined` and returns the latest
committed state. `getState()` reads it. `subscribe(listener)` returns an unsubscribe
function and emits only changes; it does not emit an initial snapshot.
`tick()` checks for silence and returns the committed state. The engine owns no timers.

## Connected app lifecycle

App.tsx uses usePlayerSensing() to create a fresh DemoMetricsProvider and engine
for each effect lifetime. connectSensing() subscribes before startup, forwards
measurements, publishes committed state changes, and runs a 250ms silence watchdog.
The hook stays separate from the framework-free state/index.ts exports.

Cleanup removes both subscriptions and the watchdog immediately, stops the provider,
and guards late asynchronous startup. StrictMode's discarded setup never starts its
provider. Provider factories must have stable identity and return fresh instances;
providers must make stop() idempotent and release resources on startup failure.
Startup or processing errors produce a visible error and Unknown without crashing
the game. A reload retries startup. Provider stop failures are logged.

App passes the committed state and explicit demo source to Game. Manual visual
preview is an opt-in override in Settings; it does not change engine state or stop
the pipeline. Leaving preview restores the latest committed state. The game instance,
score, health and authored biome state persist through prop changes.

## Timing and input rules

- Initial state: UNKNOWN. First valid state requires 2,000 ms candidate confirmation.
- Normal-to-normal transitions require both 2,000 ms continuous candidate support
  and 60,000 ms since the last actual commit. Noise never restarts committed dwell.
- Returning to the committed classification clears the candidate. A new classification
  starts a new candidate. Hysteresis is applied to classifications before confirmation.
- Freshness: a sample is stale at age 3,000 ms. Timestamps use epoch milliseconds,
  in the same time domain as the injected clock (default Date.now). Duplicate,
  out-of-order, future, negative, and nonfinite timestamps are unusable.
- At least one finite positive heart/breathing rate or engagement in [0, 1] is usable.
  Bad fields are discarded individually; no usable fields means sensor loss.
  Heart rate is assumed beats/minute and breathing rate breaths/minute. Engagement
  is an optional normalized gameplay input; its Presage mapping is not confirmed.
- Average up to five recent samples per field. Stale samples are removed; absent
  fields are not filled with zero and do not borrow support from older samples.
- Explicit unusable input starts loss grace immediately. Silence starts grace when
  the last usable measurement becomes stale. Repeated bad samples never extend grace.
- After 5,000 ms loss grace, enter UNKNOWN **even before the 60-second dwell ends**.
  Thus silent loss defaults to 8,000 ms after the final measurement, plus watchdog
  scheduling delay. Brief loss retains the committed state but clears candidate and
  smoothing evidence. Recovery requires fresh confirmation and bypasses normal dwell
  only while the committed state is UNKNOWN.
- Switching demo/presage sources resets smoothing and candidate evidence. It does not
  bypass committed dwell. Supply a finite nondecreasing clock; backward clocks throw.

## Gameplay tuning defaults

All defaults and validation are in `config.ts`; override via the constructor.

| Signal | ENGAGED entry / exit | HIGHLY_ENGAGED entry / exit |
| --- | --- | --- |
| Heart rate | 85 / 80 | 110 / 100 |
| Breathing rate | 18 / 16 | 24 / 22 |
| Engagement | 0.65 / 0.55 | Not used |

Any supported high signal wins, then any engaged signal, otherwise CALM.
The exit threshold still supports the existing classification at equality.
These are provisional demo tuning values, not scientifically validated boundaries.
Finite positive rates have no invented physiological upper limit; real adapter quality
checks and sponsor-recommended valid ranges must be verified before live use.

## Tests

With Node 24 (native TypeScript stripping), from `frontend/`:

```sh
node --test src/state/*.test.mjs src/presage/*.test.mjs src/game/tests/*.test.mjs
npm run build
```

No test dependencies or package/config changes. Tests inject clocks/schedulers and
exercise the real implementation without waiting for dwell periods.

Verification on 2026-09-26: all 22 Node tests passed and `tsc --noEmit` passed.
The ordinary `npm run build` hit an environment access-denied error in esbuild's
config loader. `node node_modules/vite/bin/vite.js build --configLoader native`
passed with Node 24, without configuration edits. Vite reported a >500 kB bundle
warning. The modules are now wired through App.tsx.

Browser integration fixture: `/src/game/tests/sensing.html` runs the actual App
under StrictMode with controlled sensing clocks, including dropout, recovery,
manual override, startup errors and teardown. No production timing is shortened.
