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

Example for a future integration owner (not installed in App.tsx):

```ts
import { PlayerStateEngine } from './state/index';
import { DemoMetricsProvider } from './presage/index';

const engine = new PlayerStateEngine();
const provider = new DemoMetricsProvider();
const unsubscribeMetrics = provider.subscribe(metrics => engine.submit(metrics));
const unsubscribeState = engine.subscribe(state => console.log(state));
console.log(provider.label, engine.getState()); // Show Demo Mode in the future UI.
const watchdog = setInterval(() => engine.tick(), 250);
await provider.start();

// On integration teardown (and also if startup fails):
clearInterval(watchdog);
unsubscribeMetrics();
unsubscribeState();
await provider.stop();
```

Keep the watchdog running during sensor outages. With the example's 250 ms interval,
loss is observed within one tick of the configured deadline. Ezo owns visual
interpolation after receiving each discrete committed state. Consumers should not
throw; subscriber exceptions are logged and isolated from other listeners.

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

| Signal | ENGAGED entry / exit | HIGH_AROUSAL entry / exit |
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
node --test src/state/PlayerStateEngine.test.mjs src/presage/DemoMetricsProvider.test.mjs
npm run build
```

No test dependencies or package/config changes. Tests inject clocks/schedulers and
exercise the real implementation without waiting for dwell periods.

Verification on 2026-09-26: all 22 Node tests passed and `tsc --noEmit` passed.
The ordinary `npm run build` hit an environment access-denied error in esbuild's
config loader. `node node_modules/vite/bin/vite.js build --configLoader native`
passed with Node 24, without configuration edits. Vite reported a >500 kB bundle
warning. The modules are intentionally not wired into App.tsx or Ezo's game yet.
