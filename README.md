# EchoShift

**EchoShift** is a Hack the Hill project: an adaptive 3D game that reacts to the player's real-time state using camera-based human sensing, a deterministic player-state engine, Gemini, and ElevenLabs.

The repository is the team's **single source of truth**. We are three people working in parallel, so module ownership and shared contracts matter.

## Core demo

```text
Webcam
  ↓
Presage metrics
  ↓
Player State Engine
  ↓
3D game reacts
  ↓
Gemini generates bounded NPC/game-director response
  ↓
ElevenLabs speaks the response
```

The demo should prove one complete vertical slice:

1. Player grants camera access.
2. Presage provides usable signals/metrics.
3. Our code maps those signals to a game state such as `CALM`, `ENGAGED`, or `HIGH_AROUSAL`.
4. The 3D environment visibly reacts.
5. Gemini receives only structured game context and returns a bounded response.
6. ElevenLabs gives the NPC a voice.

If Presage is unavailable during development or judging, **Demo Mode** may simulate metrics, but it must be clearly labelled as simulated.

## Hackathon priorities

We are optimizing for a polished, working demo rather than feature count.

Primary targets:
- Best Overall
- Best Use of Presage
- Best Use of Gemini API
- Best Use of ElevenLabs
- Best UI/UX Project

Depth matters more than breadth. Do not add sponsor integrations unless they improve the core experience.

## Team ownership

The exact teammate names can be filled in later.

| Person | Primary ownership | Main paths |
| --- | --- | --- |
| **Rani** | Presage integration + Player State Engine | `frontend/src/presage/`, `frontend/src/state/` |
| **Teammate 2** | 3D gameplay + UI/UX | `frontend/src/game/`, `frontend/src/ui/` |
| **Teammate 3** | Gemini + ElevenLabs + backend | `backend/`, `frontend/src/api/` |

Do not edit another teammate's active module without coordinating first.

## Repository context

Before coding, humans and Codex/other assistants should read:

- `PROJECT_CONTEXT.md`
- `ARCHITECTURE.md`
- `CONTRIBUTING.md`
- `.ai/AI_INSTRUCTIONS.md`
- `.ai/CURRENT_STATE.md`
- `.ai/TASKS.md`
- `docs/api-contracts.md`
- `docs/HACKATHON_PLAN.md`

## Team workflow

1. Pull the latest `main`.
2. Create or switch to your assigned feature branch.
3. Read the context files above.
4. Work only inside your task scope.
5. Run the relevant app/tests.
6. Update `.ai/CURRENT_STATE.md` if the integration state changed.
7. Commit and push.
8. Open a Pull Request.
9. Have another teammate review before merging.
10. Everyone pulls `main` again after a merge.

## Secrets

Never commit API keys.

Use a local `.env` file and keep `.env.example` updated with key names only.
