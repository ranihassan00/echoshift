# Current Project State

Last updated: 2026-09-27

## Working
- TASK-005 demo slice: App connects DemoMetricsProvider -> PlayerStateEngine -> Game, with explicit simulated labeling, watchdog, StrictMode-safe cleanup and isolated manual preview.
- TASK-002 live local bridge implemented: opt-in native Node service + PresageMetricsProvider + explicit App Start/Stop controls. Actual camera/account verification remains pending.
- State API: submit/getState/subscribe/tick; 60-second normal dwell, 2-second confirmation, 3-second freshness and 5-second loss grace. See frontend/src/state/README.md.
- TASK-003: eight authored encounters across four distinct districts, with escalating hazard combinations, dash/wall-jump traversal, moving/collapsing platforms, health, scoring, local best and instant restart.
- All four canonical PlayerState values have readable labels and 800 ms synchronized atmosphere/difficulty transitions. Biome colors are preserved; Unknown stays neutral. All hazards use state-scaled clocks.
- Game integration entry point: `Game({ targetState })`; see `frontend/src/game/README.md` for Rani's handoff and verification fixture.
- Real Phaser/React browser checks cover state integration, authored gap geometry, dash/wall movement, hazard timing/damage, platform lifecycles, scoring, storage and cleanup; geometry checks isolate combat. Production build passes with `--configLoader runner` in the sandbox.
- Shared frontend types are defined in `frontend/src/shared/contracts.ts`; import paths are documented in `docs/api-contracts.md`.
- GitHub repository exists.
- Shared project documentation and architecture are established on the setup branch.
- Team has decided to build a 2D game instead of a 3D game.

## In progress
- TASK-002: implementation and automated/browser verification complete; user must enter the local API key and explicitly test camera capture and subscription access.
- TASK-001: shared project foundation/context.

## Not started
- First real-camera/account verification (adapter implemented)
- Gemini AI Director backend
- ElevenLabs voice generation
- Full vertical-slice integration
- Final deployment and presentation polish

## Team ownership
- Rani: Presage + Player State Engine + Gemini + ElevenLabs + backend/API
- Ezo: 2D game design + gameplay + UI/UX

## Open decisions
- Local demo uses the official SmartSpectra Node SDK 3.3.0 through a loopback service. Public deployment remains separate.
- Confirm final hosting/deployment choice.
- Demo sensing is wired into the game. Live adapter/transport is implemented; local key setup and real-camera verification remain.
- Rani to finalize Gemini output schema and ElevenLabs voice setup.

## Current integration assumptions
- React + TypeScript frontend
- 2D browser game implementation; exact game library chosen by Ezo
- Node.js + TypeScript backend
- No database required for MVP
- Shared player-state contract: CALM | ENGAGED | HIGHLY_ENGAGED | UNKNOWN
- Gemini receives bounded structured context
- ElevenLabs is used for generated NPC speech
- Clearly labelled Demo Mode exists as a sensing fallback

## Recent changes
- Requested naming migration to HIGHLY_ENGAGED / Highly Engaged across types, engine, game, UI and tests; all consumers must update together.
- TASK-003 state treatments and difficulty apply across every district; opt-in live transport is implemented; real camera/account verification remains pending.
- Switched project direction from 3D to 2D.
- Team ownership updated: Rani and Ezo.
- MVP remains one polished vertical slice.

## Before starting work
Always pull the latest main and re-read this file plus .ai/TASKS.md.
