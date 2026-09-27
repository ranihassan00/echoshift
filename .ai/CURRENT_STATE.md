# Current Project State

Last updated: 2026-09-26

## Working
- TASK-003: Relay platformer with fixed geometry, buffered jumps, patrol drone, exit and retries.
- All four canonical PlayerState values have simulated controls and 1200 ms eased presentation transitions; drone speed changes wait for patrol endpoints.
- Game integration entry point: `Game({ targetState })`; see `frontend/src/game/README.md` for Rani's handoff and verification fixture.
- Real Phaser browser checks verify all-state completion, smooth retargeting, safe speed changes and React cleanup. Production build passes with `--configLoader runner` in the sandbox.
- Shared frontend types are defined in `frontend/src/shared/contracts.ts`; import paths are documented in `docs/api-contracts.md`.
- GitHub repository exists.
- Shared project documentation and architecture are established on the setup branch.
- Team has decided to build a 2D game instead of a 3D game.

## In progress
- TASK-001: shared project foundation/context.

## Not started
- Presage/camera adapter
- Demo metrics provider
- Player State Engine

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
- Live-state wiring into the game prop remains integration-owner work; game uses labelled Demo Mode until then.
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
