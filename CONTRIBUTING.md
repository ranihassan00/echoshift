# Contributing

We have three people building in parallel. The goal is to move fast without having three Codex sessions rewrite the same files.

## Branches
Do not develop directly on `main`.

Initial branches:
- `feature/presage-state`
- `feature/game-ui`
- `feature/ai-voice`

## Before coding
1. Pull the latest `main`.
2. Switch to your assigned feature branch.
3. Read `.ai/TASKS.md`, `.ai/CURRENT_STATE.md`, and `docs/api-contracts.md`.
4. Confirm which files your task owns.

## File ownership
- Rani: `frontend/src/presage/`, `frontend/src/state/`
- Teammate 2: `frontend/src/game/`, `frontend/src/ui/`
- Teammate 3: `backend/`, `frontend/src/api/`

Shared config files should be edited by one agreed person at a time.

## Commits
Commit small working milestones, for example:
- `feat: add demo metrics provider`
- `feat: map player state to scene lighting`
- `feat: add structured Gemini dialogue endpoint`
- `fix: handle ElevenLabs request failure`

## Pull requests
Each PR should explain:
- What changed
- Why it changed
- Files/modules affected
- How it was tested
- Whether a shared contract changed
- Any known issues

## Merge rule
Prefer Pull Requests over direct pushes to `main`. After a merge, everyone pulls `main` before continuing integration.

## Merge conflicts
If a conflict touches a shared contract, stop and agree on the intended contract first. Update `docs/api-contracts.md` before resolving it.

## Secrets
Never commit Gemini, ElevenLabs, or Presage credentials. Use local environment variables and keep only `.env.example` in the repo.
