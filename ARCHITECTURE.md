# Architecture

## Overview

```text
                           ┌────────────────────┐
                           │       Webcam       │
                           └─────────┬──────────┘
                                     │
                                     ▼
                           ┌────────────────────┐
                           │  Presage Adapter   │
                           │  or Demo Provider  │
                           └─────────┬──────────┘
                                     │ PlayerMetrics
                                     ▼
                           ┌────────────────────┐
                           │ Player State Engine│
                           └─────────┬──────────┘
                                     │ PlayerState
                                     ▼
┌──────────────────┐       ┌────────────────────┐
│ React UI / HUD   │◄──────│    3D Game Loop    │
└──────────────────┘       └─────────┬──────────┘
                                     │ GameContext + PlayerState
                                     ▼
                           ┌────────────────────┐
                           │ Frontend API Client│
                           └─────────┬──────────┘
                                     │ HTTP
                                     ▼
                           ┌────────────────────┐
                           │   Backend API      │
                           └──────┬───────┬─────┘
                                  │       │
                                  ▼       ▼
                              Gemini   ElevenLabs
```

## Repository shape

```text
echoshift/
├── frontend/
│   └── src/
│       ├── api/
│       ├── game/
│       ├── presage/
│       ├── state/
│       └── ui/
├── backend/
│   └── src/
│       ├── routes/
│       ├── gemini/
│       └── elevenlabs/
├── docs/
├── handoffs/
├── .ai/
├── AGENTS.md
├── PROJECT_CONTEXT.md
└── ARCHITECTURE.md
```

The application folders may be created by the implementation tasks. Do not create unused layers just to match this diagram.

## Module A — Sensing + Player State

**Owner:** Rani

**Paths:** `frontend/src/presage/`, `frontend/src/state/`

**Responsibility:**
- Camera/Presage adapter
- Demo/mock metrics provider
- Smoothing/normalization
- Player-state calculation
- State-change events

**Public interface:** `PlayerMetrics`, `PlayerState`, state subscription API

**May depend on:** Presage SDK/API, shared types

**Must not directly depend on:** Gemini, ElevenLabs, 3D scene internals

---

## Module B — 3D Game + UI/UX

**Owner:** Teammate 2

**Paths:** `frontend/src/game/`, `frontend/src/ui/`

**Responsibility:**
- 3D scene
- Player interactions/puzzles
- Environment reaction to `PlayerState`
- HUD and onboarding
- Accessibility/polish
- Demo flow

**Public interface:** accepts `PlayerState`; emits `GameContext`/game events

**May depend on:** state public interface, frontend API client

**Must not directly depend on:** Presage internals or backend provider SDKs

---

## Module C — AI + Voice Backend

**Owner:** Teammate 3

**Paths:** `backend/`, `frontend/src/api/`

**Responsibility:**
- Gemini API adapter
- Structured AI Director request/response
- ElevenLabs voice generation
- Server-side secret handling
- API error/fallback behavior

**Public interface:** endpoints documented in `docs/api-contracts.md`

**May depend on:** Gemini and ElevenLabs SDKs/APIs

**Must not directly depend on:** 3D scene internals or raw Presage implementation

---

## Integration ownership

Integration is a team task after each vertical component works independently.

Rules:
- Integrate through documented interfaces.
- Avoid cross-module imports that bypass contracts.
- One teammate owns each merge conflict; do not let multiple AI agents independently "fix" the same conflict.
- If a contract must change, update `docs/api-contracts.md` first.

## Design decisions

### Deterministic state engine
Raw sensing values do not directly control the game. Our code maps/smooths signals into bounded game states.

Why:
- Easier to debug
- Easier to demo
- More predictable gameplay
- Less dependence on external model behavior

### Gemini is bounded
Gemini receives structured context and returns a structured response. It should not arbitrarily modify application state.

### Provider adapters
Presage, Gemini, and ElevenLabs should live behind small adapters so the app can use local mocks/fallbacks.

### No database in MVP
Persistent storage does not improve the core hackathon demo enough to justify the added complexity.

## Shared contracts
Any API, shared type, event, or payload crossing module boundaries must be documented in `docs/api-contracts.md` before a breaking change.
