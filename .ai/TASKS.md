# Active Tasks

## TASK-001 — Shared project foundation
Owner: Rani
Status: In Progress
Branch: setup/shared-hackathon-context

Goal: establish repository context, architecture, contracts, three-person workflow, and AI instructions.

## TASK-002 — Presage + Player State Engine
Owner: Rani
Status: Not Started
Branch: feature/presage-state

Goal: produce stable PlayerMetrics, support clearly labelled Demo Mode, and map metrics into bounded PlayerState values.

Allowed:
- frontend/src/presage/
- frontend/src/state/

Do not modify:
- frontend/src/game/
- frontend/src/ui/
- backend/

## TASK-003 — 3D Game + UI/UX
Owner: Teammate 2
Status: Not Started
Branch: feature/game-ui

Goal: build one polished 3D experience that visibly reacts to PlayerState.

Allowed:
- frontend/src/game/
- frontend/src/ui/

Uses:
- PlayerState
- GameContext
- DialogueResponse

## TASK-004 — Gemini + ElevenLabs Backend
Owner: Teammate 3
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

## TASK-005 — Vertical slice integration
Owner: Team
Status: Blocked until TASK-002, TASK-003, and TASK-004 have working slices
Branch: integration/vertical-slice

Goal:
Presage/Demo -> PlayerState -> 3D reaction -> Gemini -> ElevenLabs

Do not begin broad integration until each module can be exercised independently through its public interface.
