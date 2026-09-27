# Metrics providers

`DemoMetricsProvider` implements the canonical `MetricsProvider` interface. Its
`label` explicitly says "Demo Mode — simulated metrics", and every emitted sample
has `source: "demo"`. Future UI integration must display that label.

`start()` emits immediately and schedules one timer; repeated starts are no-ops.
`stop()` is idempotent, cancels the timer, and clears `getLatest()` to null.
Subscribers persist through stop/restart until they call their unsubscribe function.
Each delivery and `getLatest()` return copies. Consumer errors are logged and isolated.
Restart resets the deterministic sequence: simulated CALM-like, ENGAGED-like, and
HIGH_AROUSAL-like measurements, each lasting 75 seconds, repeating indefinitely.
Default sample period is 1 second. Options allow injected clock/scheduler and timing.
State classification remains exclusively in the state engine.

## Presage boundary — live integration not implemented

Official documentation inspected on 2026-09-26:

- [Node/Electron integration](https://smartspectra.presagetech.com/docs/nodejs/)
- [SDK platform overview](https://smartspectra.presagetech.com/)

The documented Node package loads a native runtime. Electron's renderer bridge
requires Electron main/preload processes; it is not a standalone Vite browser SDK.
The docs also describe native Node camera capture and host-supplied frame input.
We have not verified a hackathon-specific browser API with the sponsor.

Keep the existing `MetricsProvider` as the adapter boundary. A future
`PresageMetricsProvider` must receive verified normalized measurements through an
agreed bridge and implement start/stop/getLatest/subscribe; it must never silently
substitute demo data. No fake live provider or speculative SDK method calls are added.

Before implementation, obtain/confirm:

1. Sponsor-approved browser integration route, or approval to build a local native
   Node camera service and browser transport. The existing browser app stays intact.
2. Developer API key and supported SDK version/platform, held in the native/server
   process; never a VITE variable or browser bundle.
3. Actual decoded payload examples, pulse/breathing units, measurement-quality rules,
   timestamp conversion to epoch milliseconds, and whether engagement is supplied.
4. Transport lifecycle/error messages, camera permissions, and measurement freshness.

Until then use Demo Mode. It and the state engine need no credentials or camera.
