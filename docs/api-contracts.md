# Shared Contracts

Anything crossing module boundaries belongs here.

## Canonical TypeScript module

The single source for the shared frontend definitions is
`frontend/src/shared/contracts.ts`. Both Rani and Ezo import from this module;
do not redeclare these types in sensing, state, game, UI, or API modules.
Payload fields are unchanged; the player-state naming migration below applies.

Use relative, type-only imports (no new alias or build configuration required):

```ts
// From src/presage/*.ts, src/state/*.ts, or src/api/*.ts:
import type { PlayerMetrics, PlayerState, MetricsProvider } from "../shared/contracts";

// From src/game/scenes/*.ts or src/ui/components/*.tsx:
import type { PlayerState, GameContext } from "../../shared/contracts";
```

Adjust only the relative prefix for deeper folders. This module must stay free
of React, Phaser, provider SDKs, and runtime logic. Rani maintains it as shared
foundation work; both teammates consume it. Coordinate changes through this
document before updating dependent modules. The definitions below describe the
same contract and must stay synchronized with the TypeScript source.

The state API and demo-to-game bridge are implemented. Live Presage and backend
dialogue/voice integration remain separate implementation work.

## Shared frontend types

### PlayerMetrics

```ts
export interface PlayerMetrics {
  heartRate?: number;
  breathingRate?: number;
  engagement?: number;
  timestamp: number;
  source: "presage" | "demo";
}
```

### PlayerState

2026-09-27 naming migration: the elevated gameplay state now uses the serialized
value `HIGHLY_ENGAGED` and display label **Highly Engaged**. Update producers and
consumers together (state engine, game profiles, HUD, tests, and future API clients).
Unknown remains the fallback. At the time of the naming migration, no persisted player-state data or live adapter existed
to migrate; unrecognized runtime values fall back to Unknown.


```ts
export type PlayerState =
  | "CALM"
  | "ENGAGED"
  | "HIGHLY_ENGAGED"
  | "UNKNOWN";
```

This is a gameplay state, not a medical diagnosis.

### GameContext

```ts
export interface GameContext {
  sceneId: string;
  storyBeat: string;
  playerState: PlayerState;
  recentChoice?: string;
  allowedEvents: string[];
}
```

## Metrics provider interface

```ts
export interface MetricsProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatest(): PlayerMetrics | null;
  subscribe(listener: (metrics: PlayerMetrics) => void): () => void;
}
```

Implementations:
- PresageMetricsProvider
- DemoMetricsProvider

## Player State Engine public behavior

`frontend/src/state/index.ts` exports `PlayerStateEngine` and tuning defaults.
`submit(PlayerMetrics | null | undefined)` and `tick()` return the committed
`PlayerState`; `getState()` reads it; `subscribe(listener)` returns an unsubscribe
function and emits changes only. Initial state is UNKNOWN. Call `tick()` periodically
(e.g. every 250 ms) so a silent provider cannot leave unsupported state displayed.

Normal transitions require 2 seconds candidate confirmation and 60 seconds since
last commit. Unusable sensing has a 5-second grace period; silence becomes unusable
when the last measurement is 3 seconds old. Sustained loss enters UNKNOWN even
inside the 60-second dwell. Recovery requires fresh candidate confirmation.
Timestamp units are epoch milliseconds. Gameplay thresholds, input validation,
smoothing, source switches, and consumer cleanup are documented in
`frontend/src/state/README.md`. Payload fields are unchanged; the elevated state uses HIGHLY_ENGAGED.

Demo metrics are always marked `source: "demo"`. Consumers must visibly label Demo
Mode. The local live adapter is implemented; see `frontend/src/presage/README.md`
for setup and outstanding real-camera/account verification.

## Game presentation

The four labels are Unknown, Calm, Engaged, Highly Engaged. Game consumers normalize
unrecognized inputs to UNKNOWN. Committed target changes transition atmosphere and
difficulty together over 800ms, independent of the sensing engine's 60-second dwell.
Each biome retains its palette. UNKNOWN uses the original colors and neutral timing.

Game accepts optional signalSource (the canonical PlayerMetrics source union) and
signalError props in addition to targetState. App supplies the explicitly selected demo or presage source. A target
by itself never implies Presage. Manual visual preview is independently labeled and
does not mutate sensing state. connectSensing owns the provider subscriptions and
250ms watchdog; usePlayerSensing handles React lifecycle and renders startup errors.
No shared type shape changed for this integration.

## Backend endpoints

### GET /api/health

Response:

```json
{
  "ok": true
}
```

### POST /api/dialogue

Request:

```json
{
  "sceneId": "lab-room",
  "storyBeat": "door-locked",
  "playerState": "HIGHLY_ENGAGED",
  "recentChoice": "inspect-console",
  "allowedEvents": ["LIGHTS_FLICKER", "GIVE_HINT", "NO_EVENT"]
}
```

Response:

```json
{
  "dialogue": "Short NPC line",
  "emotion": "reassuring",
  "event": "GIVE_HINT"
}
```

Rules:
- event must be one of allowedEvents.
- backend validates model output.
- frontend owns actual game-state changes.

### POST /api/voice

Request:

```json
{
  "text": "Short NPC line",
  "emotion": "reassuring"
}
```

Response:
- audio stream/blob
- if voice fails, frontend still shows text

## Environment variable names

```text
GEMINI_API_KEY
ELEVENLABS_API_KEY
PRESAGE_API_KEY
```

If sponsor docs use a different Presage credential name, update this file and .env.example together.

## Rule

Any breaking shared-contract change must be documented here before dependent modules are updated.

## Local Presage transport (TASK-002 / TASK-005)

The separate `sensing-service` process binds only `127.0.0.1:8787`. It owns the
native SDK and PRESAGE_API_KEY. The browser sends an explicit Origin and a random
`X-EchoShift-Session` identifier. Only configured local game origins and the exact
loopback Host are accepted. Shared TypeScript shapes above remain unchanged.

- GET /health: idle/busy/unavailable; never starts a camera.
- POST /session: explicitly starts one session and returns an NDJSON stream;
  rejects concurrent sessions with 409. There is no automatic reconnect.
- POST /heartbeat: renews the owning session's 15-second lease; browser sends every
  5 seconds. Expiry closes the session even if the socket is still connected.
- POST /stop: owning token only; releases the SDK. Closing the response stream,
  startup/runtime errors and server shutdown also release it. A cleanup failure
  blocks new sessions until the service restarts.

Stream messages: `{type:"status",status:"warming"|"positioning",validationCode?:number}`,
`{type:"metrics",metrics:PlayerMetrics}`, `{type:"heartbeat"}` or
`{type:"error",code:string}`. Error codes are fixed public identifiers; raw SDK
messages and credentials are never sent. Live input requests only metric codes
BREATHING_RATE (2) and PULSE_RATE (15), using stable samples with bounded confidence,
fresh epoch-microsecond timestamps converted to milliseconds, and per-field deduplication.
No engagement measurement is fabricated. The browser labels source selection and
connection readiness separately; it cannot claim live measurements before receiving them.
