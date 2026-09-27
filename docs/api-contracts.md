# Shared Contracts

Anything crossing module boundaries belongs here.

## Canonical TypeScript module

The single source for the shared frontend definitions is
`frontend/src/shared/contracts.ts`. Both Rani and Ezo import from this module;
do not redeclare these types in sensing, state, game, UI, or API modules.
The existing contract shapes are unchanged.

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

The state API is implemented below. The game bridge and backend dialogue/voice
TypeScript payloads remain separate implementation work.

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

```ts
export type PlayerState =
  | "CALM"
  | "ENGAGED"
  | "HIGH_AROUSAL"
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
`frontend/src/state/README.md`. Existing shared type shapes are unchanged.

Demo metrics are always marked `source: "demo"`. Consumers must visibly label Demo
Mode. No live Presage integration is implemented; see `frontend/src/presage/README.md`
for the verified SDK boundary and outstanding requirements.

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
  "playerState": "HIGH_AROUSAL",
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
