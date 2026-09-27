# Current Project State

Last updated: 2026-09-26

## Working
- TASK-002 demo provider and standalone Player State Engine implemented with deterministic tests; live Presage remains blocked.
- State API: submit/getState/subscribe/tick; 60-second normal dwell, 2-second confirmation, 3-second freshness and 5-second loss grace. See frontend/src/state/README.md.
- Shared frontend types are defined in `frontend/src/shared/contracts.ts`; import paths are documented in `docs/api-contracts.md`.
- GitHub repository exists.
- Shared project documentation and architecture are established on the setup branch.
- Team has decided to build a 2D game instead of a 3D game.

## In progress
- TASK-002: live Presage adapter awaits sponsor-approved browser/native bridge, credentials, and payload mapping (frontend/src/presage/README.md).
- TASK-001: shared project foundation/context.

## Not started
- Presage/camera adapter
- 2D game scene and adaptive gameplay
- Gemini AI Director backend
- ElevenLabs voice generation
- Full vertical-slice integration
- Final deployment and presentation polish

## Team ownership
- Rani: Presage + Player State Engine + Gemini + ElevenLabs + backend/API
- Ezo: 2D game design + gameplay + UI/UX

## Open decisions
- Confirm exact Presage integration path from sponsor docs.
- Confirm final hosting/deployment choice.
- Ezo to finalize the game's visual theme, interaction loop, and main gameplay mechanic.
- Rani to finalize Gemini output schema and ElevenLabs voice setup.

## Current integration assumptions
- React + TypeScript frontend
- 2D browser game implementation; exact game library chosen by Ezo
- Node.js + TypeScript backend
- No database required for MVP
- Shared player-state contract: CALM | ENGAGED | HIGH_AROUSAL | UNKNOWN
- Gemini receives bounded structured context
- ElevenLabs is used for generated NPC speech
- Clearly labelled Demo Mode exists as a sensing fallback

## Recent changes
- Switched project direction from 3D to 2D.
- Team ownership updated: Rani and Ezo.
- MVP remains one polished vertical slice.

## Before starting work
Always pull the latest main and re-read this file plus .ai/TASKS.md.
