# Project Context

## Project name
EchoShift

## Purpose
Build a short, polished 2D game that reacts to the player's real-time state.

The intended flow is:

```text
camera → Presage signals → our Player State Engine → 2D game changes
                                              ↓
                                      Gemini AI director
                                              ↓
                                       ElevenLabs voice
```

Presage should be a meaningful part of the core gameplay, not a dashboard add-on. Gemini should make bounded decisions or generate dialogue from structured context rather than control the game directly. ElevenLabs should give one memorable NPC/AI companion a dynamic voice.

## Users
- Hack the Hill judges trying the live demo
- Players experiencing a short adaptive 2D game session

## Core requirements
1. A working, understandable 2D game experience.
2. Camera/Presage integration that produces game-relevant input.
3. A deterministic Player State Engine owned by our code.
4. At least one obvious gameplay, environment, UI, difficulty, or story reaction to a player-state change.
5. Gemini integration using structured inputs/outputs.
6. ElevenLabs voice output tied to the NPC/game response.
7. A clearly labelled simulation/demo mode for development and backup.
8. A polished five-minute presentation and fast live demo path.

## Player-state language
Do **not** claim the game medically diagnoses stress or emotion.

Preferred gameplay states:
- `CALM`
- `ENGAGED`
- `HIGHLY_ENGAGED`
- `UNKNOWN`

These are game interpretations of available signals, not medical conclusions.

## MVP
The MVP is complete when a player can:

1. Start the game.
2. Allow camera access.
3. Produce metrics through Presage or clearly labelled Demo Mode.
4. Trigger a Player State Engine transition.
5. See the 2D game visibly react.
6. Trigger one Gemini-generated NPC response.
7. Hear that response through ElevenLabs.

## Stretch goals
Only after the MVP works:
- Multiple adaptive story branches
- Smoother state transitions using rolling averages
- Adaptive puzzle/difficulty changes
- More polished environmental/audio effects
- Two endings based on player choices + state history
- Accessibility controls and reduced-motion options

## Explicit non-goals for the hackathon
- Multiplayer
- Accounts
- Large open world
- Complex inventory/crafting
- Complex combat unless it is core to Ezo's design
- A full analytics dashboard
- Unnecessary database infrastructure
- Adding every sponsor integration

## Planned tech stack
- Frontend: React + TypeScript
- Game: 2D web game layer; exact library/approach chosen by Ezo
- Sensing: Presage sponsor-supported integration
- Player-state logic: TypeScript
- Backend: Node.js + TypeScript + lightweight HTTP framework
- AI: Gemini API
- Voice: ElevenLabs API
- Testing: focused unit tests for state logic + smoke tests for integrations
- Deployment: simple hackathon-friendly hosting; final choice TBD
- Database: none for MVP

## Team ownership
- **Rani:** Presage integration, Demo Mode, Player State Engine, Gemini, ElevenLabs, backend/API integration
- **Ezo:** 2D game design, gameplay, visual design, UI/UX

## Constraints
- This is a hackathon project: working depth beats feature breadth.
- Important claims must be demonstrable.
- Keep external-service code behind adapters so it can be mocked.
- Never commit secrets.
- Shared contracts must be documented before they change.
- Avoid large architecture changes once integration begins.
- No teammate or AI assistant should rewrite another teammate's module without coordination.

## Important terminology
- **PlayerMetrics**: normalized metrics/signals consumed by our game logic.
- **PlayerState**: our game's interpretation of metrics: `CALM`, `ENGAGED`, `HIGHLY_ENGAGED`, or `UNKNOWN`.
- **Player State Engine**: deterministic logic that smooths/interprets metrics.
- **AI Director**: Gemini-backed module that receives bounded context and returns structured game/NPC decisions.
- **Demo Mode**: clearly labelled simulated metrics for local development or backup.
- **Vertical slice**: the complete webcam → state → game → AI → voice path.

## Source-of-truth priority
1. Hackathon rules / sponsor documentation
2. Repository code
3. Repository documentation
4. Team decisions documented in this repo
5. Individual AI/chat history
