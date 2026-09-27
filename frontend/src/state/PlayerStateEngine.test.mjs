import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerStateEngine } from './PlayerStateEngine.ts';

function setup(config = {}) {
  let now = 0;
  const engine = new PlayerStateEngine({ windowSize: 1, ...config }, () => now);
  const sample = (time, heartRate = 70, extra = {}) => {
    now = time;
    return engine.submit({ heartRate, timestamp: time, source: 'demo', ...extra });
  };
  const tick = time => { now = time; return engine.tick(); };
  const feed = (from, to, hr) => { for (let t = from; t <= to; t += 1000) sample(t, hr); };
  return { engine, sample, tick, feed };
}

test('startup stays UNKNOWN until a valid candidate is confirmed', () => {
  const { engine, sample } = setup();
  assert.equal(engine.getState(), 'UNKNOWN');
  assert.equal(sample(0), 'UNKNOWN');
  assert.equal(sample(1000), 'UNKNOWN');
  assert.equal(sample(2000), 'CALM');
});

test('confirmed candidate cannot bypass 60 second committed dwell', () => {
  const { sample, feed } = setup();
  feed(0, 2000, 70);
  feed(3000, 61000, 90);
  assert.equal(sample(61999, 90), 'CALM');
  assert.equal(sample(62000, 90), 'ENGAGED');
});

test('return to committed state resets candidate confirmation', () => {
  const { sample, feed } = setup({ minStateDurationMs: 0 });
  feed(0, 2000, 70);
  sample(3000, 90);
  sample(4000, 70);
  assert.equal(sample(5000, 90), 'CALM');
  assert.equal(sample(6000, 90), 'CALM');
  assert.equal(sample(7000, 90), 'ENGAGED');
});

test('a different candidate restarts confirmation', () => {
  const { sample } = setup();
  sample(0, 70);
  sample(1000, 90);
  assert.equal(sample(2000, 120), 'UNKNOWN');
  assert.equal(sample(3000, 120), 'UNKNOWN');
  assert.equal(sample(4000, 120), 'HIGHLY_ENGAGED');
});

test('hysteresis prevents flicker near the engaged entry threshold', () => {
  const { sample, feed } = setup({ minStateDurationMs: 0 });
  feed(0, 2000, 90);
  for (let t = 3000; t < 15000; t += 1000) assert.equal(sample(t, t % 2000 ? 84 : 86), 'ENGAGED');
  feed(15000, 17000, 70);
  assert.equal(sample(18000, 70), 'CALM');
});

test('rolling smoothing rejects a single high spike', () => {
  const { sample, feed } = setup({ windowSize: 3, minStateDurationMs: 0 });
  feed(0, 2000, 70);
  assert.equal(sample(3000, 100), 'CALM');
  assert.equal(sample(4000, 70), 'CALM');
  assert.equal(sample(5000, 70), 'CALM');
  feed(6000, 11000, 120);
  assert.equal(sample(12000, 120), 'HIGHLY_ENGAGED');
});

test('brief dropout retains state; sustained silence overrides dwell', () => {
  const { sample, feed, tick } = setup();
  feed(0, 2000, 70);
  assert.equal(tick(6000), 'CALM');
  assert.equal(tick(9999), 'CALM');
  assert.equal(tick(10000), 'UNKNOWN'); // 3s freshness + 5s grace after final sample
  assert.equal(sample(11000, 90), 'UNKNOWN');
  sample(12000, 90);
  assert.equal(sample(13000, 90), 'ENGAGED');
});

test('explicit unusable input starts grace immediately without extending it', () => {
  const { engine, sample, feed, tick } = setup();
  feed(0, 2000, 70);
  tick(3000); engine.submit(null);
  sample(4000, NaN);
  assert.equal(tick(7999), 'CALM');
  assert.equal(tick(8000), 'UNKNOWN');
});

test('missing, stale, future, repeated, and out of order samples cannot confirm', () => {
  const { sample, tick } = setup();
  sample(0, 70);
  assert.equal(sample(2000, 70, { timestamp: 0 }), 'UNKNOWN');
  assert.equal(sample(4000, 70, { timestamp: 0 }), 'UNKNOWN');
  assert.equal(sample(5000, 70, { timestamp: 5001 }), 'UNKNOWN');
  assert.equal(sample(6000, undefined, { heartRate: undefined }), 'UNKNOWN');
  assert.equal(tick(10000), 'UNKNOWN');
});

test('sparse metrics classify independently; invalid fields do not poison valid ones', () => {
  const { sample } = setup();
  sample(0, NaN, { engagement: 0.9 });
  sample(1000, NaN, { engagement: 0.9 });
  assert.equal(sample(2000, NaN, { engagement: 0.9 }), 'ENGAGED');
});

test('expired optional measurements are not carried into new sparse samples', () => {
  const { sample, feed } = setup({ windowSize: 5, minStateDurationMs: 0 });
  feed(0, 2000, 120);
  for (let t = 3000; t <= 10000; t += 1000) sample(t, undefined, { heartRate: undefined, breathingRate: 12 });
  assert.equal(sample(11000, undefined, { heartRate: undefined, breathingRate: 12 }), 'CALM');
});

test('subscribers receive only changes and can unsubscribe', () => {
  const { engine, sample, feed, tick } = setup();
  const values = [];
  const unsubscribe = engine.subscribe(state => values.push(state));
  feed(0, 5000, 70);
  assert.deepEqual(values, ['CALM']);
  unsubscribe();
  tick(20000);
  sample(21000, 90);
  assert.deepEqual(values, ['CALM']);
});

test('silence resets candidate and recovery cannot reuse pre-dropout confirmation', () => {
  const { sample, tick } = setup();
  sample(0, 70);
  tick(5000);
  assert.equal(sample(6000, 70), 'UNKNOWN');
  assert.equal(sample(7000, 70), 'UNKNOWN');
  assert.equal(sample(8000, 70), 'CALM');
});

test('unsafe configuration is rejected', () => {
  assert.throws(() => setup({ windowSize: 0 }));
  assert.throws(() => setup({ minStateDurationMs: -1 }));
  assert.throws(() => setup({ candidateConfirmationMs: NaN }));
});

test('source changes discard old smoothing and candidate evidence', () => {
  const { sample } = setup();
  sample(0, 90);
  sample(1000, 90);
  assert.equal(sample(2000, 90, { source: 'presage' }), 'UNKNOWN');
  sample(3000, 90, { source: 'presage' });
  assert.equal(sample(4000, 90, { source: 'presage' }), 'ENGAGED');
});

test('out of order samples and backwards clocks cannot advance confirmation', () => {
  const { sample, tick } = setup();
  sample(1000, 70);
  sample(2000, 70, { timestamp: 999 });
  assert.equal(sample(3000, 70), 'UNKNOWN');
  assert.throws(() => tick(2000), /Clock/);
});

test('stale input cannot refresh live sensing indefinitely', () => {
  const { sample, feed } = setup();
  feed(0, 2000, 70);
  for (let t = 3000; t < 8000; t += 1000) assert.equal(sample(t, 70, { timestamp: 0 }), 'CALM');
  assert.equal(sample(8000, 70, { timestamp: 0 }), 'UNKNOWN');
});

test('one failing subscriber does not prevent other subscribers receiving a commit', context => {
  context.mock.method(console, 'error', () => {});
  const { engine, feed } = setup();
  const values = [];
  engine.subscribe(() => { throw new Error('UI consumer failure'); });
  engine.subscribe(s => values.push(s));
  assert.doesNotThrow(() => feed(0, 2000, 70));
  assert.deepEqual(values, ['CALM']);
});
