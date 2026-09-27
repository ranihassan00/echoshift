# Presage Live Implementation Plan

> Execute inline using executing-plans and test-driven development. User approved implementation on 2026-09-27. Preserve the existing working tree; no commit or push.

**Goal:** Add opt-in local camera sensing to the existing browser game.
**Architecture:** Native SDK in a loopback Node process; abortable NDJSON HTTP stream feeds the canonical MetricsProvider. No changes to state-engine policy or Phaser lifecycle.
**Tech stack:** Node 24, official SmartSpectra Node SDK 3.3.0, built-in HTTP/fetch, existing React/TypeScript.
**Spec:** Approved `presage-connection-plan.md` delivered in the Codex chat outputs.

## Constraints
- Demo is default; explicit live start only. Never start camera during automated verification.
- Credentials only in ignored service `.env`. No secrets or SDK internals in browser.
- Preserve shared contracts, 60-second dwell, 2-second confirmation and 800 ms presentation.
- No reconnect that starts another paid session. Stop on disconnect, error, shutdown or expired browser lease.

## Task 1: native service and normalization
Files: sensing-service/package.json, .env.example, src/{normalize,session,server,index}.mjs and test/*.test.mjs.
- [ ] Write tests for stable epoch-microsecond samples, confidence bounds, stale/future/repeated measurements and omitted fields; watch fail then implement `createNormalizer(now)`.
- [ ] Write real HTTP tests for allowed origin/host, explicit start, busy rejection, disconnect, lease expiry and startup failure; watch fail then implement `createSensingServer({createSession, origins, ...})`.
- [ ] Install SDK and verify its exports/schema without constructing a camera session. Implement `createNativeSession({emit})` using verified SDK calls, validation gating, fixed errors and async teardown.

## Task 2: browser provider and integration
Files: frontend/src/presage/PresageMetricsProvider.ts and test; App.tsx, Game.tsx (label only), local sensing-controls styles.
- [ ] Test stream splitting, freshness/source validation, stop/start races and no reconnect through injected fetch; watch fail then implement provider.
- [ ] Add explicit live Start and Stop controls, status/error text and Demo return. Preserve Game mount and show Unknown immediately when source changes.
- [ ] Browser-test actual App with mocked transport; verify no request on mount, opt-in start, labels, failure and Stop. Run existing demo/game browser fixtures.

## Task 3: handoff
- [ ] Update service and provider READMEs, API transport contract, task/current state. Create blank ignored local config only if absent.
- [ ] Run Node suites, TypeScript, build, diff checks and review. Real account/camera remains unverified until user starts it.

## Review focus
Late startup after disconnect; stale metrics while transport is connected; denial/error accidentally enabling retries; another browser origin accessing the camera; service shutdown while native teardown is pending. Each has tests in the owning service/provider task.

## Execution record
- Normalization, HTTP lifecycle, SDK adapter and browser provider implemented and tested.
- Browser checks use a fake SDK boundary and real HTTP; no camera or credits used.
- Scope remains the approved local bridge. Shared types and game timing unchanged.
- Existing working-tree edits preserved. No commits or pushes.

