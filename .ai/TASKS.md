# Active Tasks

## TASK-001 — Shared project foundation
Owner: Rani
Status: In Progress
Branch: setup/shared-hackathon-context

Goal: establish repository context, architecture, contracts, two-person workflow, and AI instructions.

Shared contract milestone: canonical `frontend/src/shared/contracts.ts` added for PlayerMetrics, PlayerState, GameContext, and MetricsProvider. Rani maintains this shared module; Rani and Ezo consume it using the imports in `docs/api-contracts.md`. Contract shapes are unchanged.

## TASK-002 — Presage + Player State Engine
Owner: Rani
Status: In Progress — Demo provider and state engine implemented; live Presage blocked
Branch: feature/presage-state

Goal: produce stable PlayerMetrics, support clearly labelled Demo Mode, and map metrics into bounded PlayerState values.

Implemented: deterministic simulated provider, configurable smoothing/hysteresis, separate candidate confirmation and committed dwell, bounded UNKNOWN fallback, and public subscriptions. Tests and integration instructions are in frontend/src/state/README.md. Shared type shapes unchanged. App/game/UI integration remains separate; real Presage needs the verified bridge and credentials documented in frontend/src/presage/README.md.

Allowed:
- frontend/src/presage/
- frontend/src/state/

Do not modify:
- frontend/src/game/
- frontend/src/ui/
- backend/

## TASK-003 — 2D Game + UI/UX
Owner: Ezo
Status: Not Started
Branch: feature/game-ui

Goal: build one polished 2D game experience that visibly reacts to PlayerState and is strong enough for a live judge demo.

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
Status: Blocked until TASK-002, TASK-003, and TASK-004 have working slices
Branch: integration/vertical-slice

Goal:
Presage/Demo -> PlayerState -> 2D reaction -> Gemini -> ElevenLabs

Do not begin broad integration until each module can be exercised independently through its public interface.
