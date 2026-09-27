# Active Tasks

## TASK-001 — Shared project foundation
Owner: Rani
Status: In Progress
Branch: setup/shared-hackathon-context

Goal: establish repository context, architecture, contracts, two-person workflow, and AI instructions.

Shared contract milestone: canonical `frontend/src/shared/contracts.ts` added for PlayerMetrics, PlayerState, GameContext, and MetricsProvider. Rani maintains this shared module; Rani and Ezo consume it using the imports in `docs/api-contracts.md`. Contract shapes are unchanged.

## TASK-002 — Presage + Player State Engine
Owner: Rani
Status: In Progress — Demo, engine and local live bridge implemented; real camera/account verification pending
Branch: feature/presage-state

Goal: produce stable PlayerMetrics, support clearly labelled Demo Mode, and map metrics into bounded PlayerState values.

Implemented: deterministic simulated provider, configurable smoothing/hysteresis, separate candidate confirmation and committed dwell, bounded UNKNOWN fallback, and public subscriptions. Tests and integration instructions are in frontend/src/state/README.md. Shared type shapes unchanged. Demo App/game wiring is complete under TASK-005; the local live bridge is implemented; configure the key and explicitly verify camera/account access using sensing-service/README.md.

Allowed:
- frontend/src/presage/
- frontend/src/state/

Do not modify:
- frontend/src/game/
- frontend/src/ui/
- backend/

## TASK-003 — 2D Game + UI/UX
Owner: Ezo
Status: Implemented — state naming, biome treatment and difficulty updated for review
Branch: feature/game-ui

Goal: build one polished 2D game experience that visibly reacts to PlayerState and is strong enough for a live judge demo.

Implemented eight authored encounters across Rainline Rooftops, Reactor Garden, Neon Transit and Abandoned Lab. District-specific scenery, eleven hazard types, moving/collapsing platforms, dash/wall jumps and capped escalating combinations replace the repeated three-roof layout. Score, local best, state transitions and instant restart remain. See `frontend/src/game/README.md` and the game test fixtures. The requested HIGHLY_ENGAGED naming migration is synchronized with shared types and sensing code; 800ms state transitions drive biome-preserving visuals and hazard difficulty. Demo wiring is complete under TASK-005; live Presage remains pending.

Allowed:
- frontend/src/game/
- frontend/src/ui/
- game assets owned by this module

Uses:
- PlayerState
- GameContext
- DialogueResponse

Do not modify:
- Presage/state internals
- Gemini/ElevenLabs backend internals

## TASK-004 — Gemini + ElevenLabs Backend
Owner: Rani
Status: Not Started
Branch: feature/ai-voice

Goal: build the backend for structured Gemini responses and ElevenLabs speech.

Allowed:
- backend/
- frontend/src/api/

Uses:
- DialogueRequest
- DialogueResponse
- POST /api/dialogue
- POST /api/voice

Do not modify:
- 2D game internals
- Presage/state internals

## TASK-005 — Vertical slice integration
Owner: Team
Status: In Progress — demo sensing-to-game slice implemented; live Presage, Gemini and voice remain pending
Branch: integration/vertical-slice

Goal:
Presage/Demo -> PlayerState -> 2D reaction -> Gemini -> ElevenLabs

Demo and live local integration are authorized and use existing public interfaces. Live uses a loopback sensing-service with an ignored local key, explicit Start/Stop, lease cleanup and no automatic retries. Real camera/account verification remains pending. App owns provider/engine lifetime; Game receives committed state and explicit source. Timing, lifecycle and browser tests cover the connected slice. AI/voice integration remains separate.
