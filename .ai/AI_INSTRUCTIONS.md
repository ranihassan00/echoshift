# AI Development Instructions

These instructions apply to Codex, ChatGPT, Claude, and any other coding assistant used on this repository.

## Before modifying code
Read:
1. `README.md`
2. `PROJECT_CONTEXT.md`
3. `ARCHITECTURE.md`
4. `.ai/CURRENT_STATE.md`
5. `.ai/TASKS.md`
6. `docs/api-contracts.md`
7. Relevant source code

## Development rules
- Stay within the assigned task.
- Respect the three-person module ownership in `ARCHITECTURE.md`.
- Do not redesign unrelated modules.
- Do not silently change public interfaces.
- Do not rename shared types, routes, environment keys, or events without checking dependents.
- Keep provider-specific code behind adapters.
- Prefer simple, demoable code over unnecessary abstractions.
- Run relevant tests/smoke checks before and after changes.
- Never commit or print secrets.
- If using simulated metrics, label them as Demo Mode.

## Hackathon scope rule
Before adding a feature, ask: does this improve the core camera → state → 2D game reaction → Gemini → ElevenLabs demo?
If not, do not build it until the MVP works.

## Shared-contract changes
If a task requires changing a shared API, type, schema, event, or payload:
1. Identify the current contract.
2. Explain why it must change.
3. Update `docs/api-contracts.md`.
4. Identify dependent modules.
5. Update `.ai/CURRENT_STATE.md`.
6. Coordinate with affected teammate(s).

## Before coding, state
- Task ID
- Files to modify
- Modules affected
- Interfaces/contracts relied on
- Whether a shared contract must change
- Short plan

## After coding, report
- Files changed
- Behavior added or changed
- Tests/commands run
- Known issues
- Assumptions made
- Documentation updated

## Conflict rule
If chat instructions conflict with repository documentation or current code, stop and surface the conflict rather than guessing.
