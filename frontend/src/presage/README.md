# Metrics providers

`DemoMetricsProvider` and `PresageMetricsProvider` implement the canonical
`MetricsProvider` interface. Shared contract shapes are unchanged.

## Demo (default)

The game visibly says **Demo Mode — simulated metrics**. The provider emits every
second through Calm-like, Engaged-like and Highly Engaged-like phases of 75 seconds.
It has no camera, credentials or native dependencies. start/stop are idempotent;
stop clears its latest sample. Subscriptions return cleanup functions.

## Live Presage

See `../../../sensing-service/README.md` for local API-key and startup instructions.
The native service is separate from the browser bundle. App creates this provider
only after the player selects Start live sensing, resets classification to Unknown,
and keeps the existing Phaser instance. Stop returns explicitly to Demo Mode.
Manual visual preview remains a separately labeled presentation override.

The adapter opens an abortable NDJSON POST stream, validates source/freshness and
numeric fields, delivers canonical PlayerMetrics, renews a session lease every five
seconds, and closes on errors or disposal. There is no automatic retry or demo
substitution. Status callback options are adapter-specific; shared contracts are
unchanged. App shows connecting, warmup, positioning, receiving and fixed error text.
No key belongs in App, Vite variables or the provider.

The Node SDK boundary, timestamp/quality filtering and local transport are now
implemented. Live account entitlement and camera measurement have NOT been verified:
only the user should initiate the first credit-consuming session with their key.
Unknown, 60-second dwell, two-second confirmation, smoothing/hysteresis and sensor-loss
behavior stay in PlayerStateEngine. Game presentation transitions remain 800 ms.

Run the provider and state tests with Node 24:

```powershell
node --test src/presage/*.test.mjs src/state/*.test.mjs
```

Tests use fake transport/native boundaries and injected clocks. No automated test
uses a real API key or opens a camera.
