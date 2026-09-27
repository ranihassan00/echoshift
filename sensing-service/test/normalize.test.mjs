import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNormalizer } from '../src/normalize.mjs';
const now = 1_790_000_000_000;
const sample = (value, overrides = {}) => ({ value, stable: true, confidence: 80, timestamp: now * 1000, ...overrides });

test('maps reliable rates to canonical metrics without inventing engagement', () => {
  const normalize = createNormalizer(() => now);
  assert.deepEqual(normalize({ cardio: { pulseRate: [sample(72)] }, breathing: { rate: [sample(14)] } }),
    { heartRate: 72, breathingRate: 14, timestamp: now, source: 'presage' });
});
test('unstable, malformed, stale and future measurements cannot become fresh evidence', () => {
  for (const bad of [sample(0), sample(NaN), sample(70, { stable: false }), sample(70, { confidence: -1 }), sample(70, { confidence: 101 }), sample(70, { timestamp: (now - 3001) * 1000 }), sample(70, { timestamp: (now + 1) * 1000 }), sample(70, { timestamp: 50 })]) {
    assert.equal(createNormalizer(() => now)({ cardio: { pulseRate: [bad] } }), null);
  }
});
test('duplicate samples are not re-dated by later transport messages', () => {
  let clock = now;
  const normalize = createNormalizer(() => clock);
  const payload = { cardio: { pulseRate: [sample(72)] } };
  assert.ok(normalize(payload)); clock += 1000;
  assert.equal(normalize(payload), null);
  assert.deepEqual(normalize({ ...payload, breathing: { rate: [sample(16, { timestamp: clock * 1000 })] } }),
    { breathingRate: 16, timestamp: clock, source: 'presage' });
});
test('uses the oldest included timestamp and tolerates empty or undecoded payloads', () => {
  const normalize = createNormalizer(() => now);
  assert.equal(normalize(Buffer.from('x')), null);
  assert.equal(normalize({}), null);
  assert.equal(normalize(null), null);
  assert.equal(normalize({ cardio: { pulseRate: [sample(72, { timestamp: String((now - 500) * 1000) })] }, breathing: { rate: [sample(16)] } }).timestamp, now - 500);
});
