# Current Project State

Last updated: 2026-09-26

## Working
- GitHub repository exists.
- Shared project documentation and architecture are established on the setup branch.
- Team has decided to build a 2D game instead of a 3D game.

## In progress
- TASK-001: shared project foundation/context.

## Not started
- Presage/camera adapter
- Demo metrics provider
- Player State Engine
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
