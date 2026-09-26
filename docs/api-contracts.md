# Shared Contracts

Anything crossing module boundaries belongs here.

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
