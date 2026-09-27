# Current Project State

Last updated: 2026-09-27

## Working
- TASK-003: continuous city run with streamed curated sections, variable-height jumps, health, fragments, score, local high score and instant game-over/restart.
- All four canonical PlayerState values have simulated controls and 1600 ms eased presentation transitions; drone speed changes wait for patrol endpoints.
- Game integration entry point: `Game({ targetState })`; see `frontend/src/game/README.md` for Rani's handoff and verification fixture.
- Real Phaser/React browser checks cover all-state traversal, capped difficulty, scoring, storage fallback/reload, smooth retargeting, safe speed changes and cleanup. Production build passes with `--configLoader runner` in the sandbox.
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
