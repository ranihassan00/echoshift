# Current Project State

Last updated: 2026-09-26

## Working
- GitHub repository exists.
- Shared project documentation and architecture are established on the setup branch.

## In progress
- TASK-001: shared project foundation/context.

## Not started
- Presage/camera adapter
- Demo metrics provider
- Player State Engine
- 3D game scene and adaptive environment
- Gemini AI Director backend
- ElevenLabs voice generation
- Full vertical-slice integration
- Final deployment and presentation polish

## Open decisions
- Replace "Teammate 2" and "Teammate 3" with real names.
- Confirm exact Presage integration path from sponsor docs.
- Confirm final hosting/deployment choice.
- Confirm exact game setting, visual theme, puzzle, and NPC personality after team brainstorm.

## Current integration assumptions
- React + TypeScript frontend
- Three.js / React Three Fiber for 3D
- Node.js + TypeScript backend
- No database required for MVP
- Shared player-state contract: CALM | ENGAGED | HIGH_AROUSAL | UNKNOWN
- Gemini receives bounded structured context
- ElevenLabs is used for generated NPC speech
- Clearly labelled Demo Mode exists as a sensing fallback

## Recent changes
- Three-person module ownership defined.
- MVP narrowed to one polished vertical slice.

## Before starting work
Always pull the latest main and re-read this file plus .ai/TASKS.md.
