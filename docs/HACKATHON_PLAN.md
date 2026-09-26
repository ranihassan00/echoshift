# Hack the Hill Plan

## Strategy
Build one polished vertical slice rather than many incomplete features.

Primary prize targets:
- Best Overall
- Best Use of Presage
- Best Use of Gemini API
- Best Use of ElevenLabs
- Best UI/UX

## Core demo
1. Start the game.
2. Ask for camera permission.
3. Presage or clearly labelled Demo Mode produces metrics.
4. Player State Engine changes state.
5. 3D environment visibly reacts.
6. Gemini returns a validated structured NPC response.
7. ElevenLabs speaks the line.

## Parallel work
- Rani: Presage/Demo -> PlayerState
- Teammate 2: PlayerState -> 3D reaction and UI
- Teammate 3: GameContext -> Gemini -> ElevenLabs

## Build order
1. Foundation and contracts
2. Three independent slices
3. Vertical integration
4. UI/audio/accessibility polish
5. Feature freeze, test, deploy, rehearse

## Important decision
Raw sensing values do not directly control the game or go straight to Gemini.

raw signals -> deterministic Player State Engine -> bounded PlayerState -> game logic + bounded Gemini context

## Fallbacks
- Visible Demo Mode for metrics
- Text dialogue if ElevenLabs fails
- Safe predefined NPC line if Gemini fails
- Local scene reaction should still work without AI services
