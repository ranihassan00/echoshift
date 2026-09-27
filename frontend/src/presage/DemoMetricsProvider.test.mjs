import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoMetricsProvider } from './DemoMetricsProvider.ts';
import { PlayerStateEngine } from '../state/PlayerStateEngine.ts';

test('demo lifecycle is idempotent, simulated, deterministic, and releases timer', async () => {
  let now = 0;
  const callbacks = new Set();
  const scheduler = { every(fn) { callbacks.add(fn); return () => callbacks.delete(fn); } };
  const provider = new DemoMetricsProvider({ now: () => now, scheduler });
  const received = [];
  const off = provider.subscribe(m => received.push(m));
  assert.equal(provider.getLatest(), null);
  await provider.start();
  await provider.start();
  assert.equal(callbacks.size, 1);
  assert.equal(received.length, 1);
  for (now = 1000; now <= 200000; now += 1000) for (const callback of callbacks) callback();
  assert.ok(received.every(m => m.source === 'demo' && Number.isFinite(m.heartRate)));
  const copy = provider.getLatest(); copy.source = 'presage';
  assert.equal(provider.getLatest().source, 'demo');
  off();
  const count = received.length;
  now += 1000; for (const callback of callbacks) callback();
  assert.equal(received.length, count);
  await provider.stop(); await provider.stop();
  assert.equal(callbacks.size, 0);
  assert.equal(provider.getLatest(), null);
  await provider.start();
  assert.equal(provider.getLatest().heartRate, 70);
  await provider.stop();
});

test('demo sequence drives all normal states through default engine dwell', async () => {
  let now = 0;
  let run;
  const provider = new DemoMetricsProvider({ now: () => now, scheduler: { every(fn) { run = fn; return () => {}; } } });
  const engine = new PlayerStateEngine({}, () => now);
  const changes = [];
  provider.subscribe(m => engine.submit(m));
  engine.subscribe(s => changes.push(s));
  await provider.start();
  for (now = 1000; now <= 155000; now += 1000) run();
  assert.deepEqual(changes, ['CALM', 'ENGAGED', 'HIGHLY_ENGAGED']);
  await provider.stop();
});

test('default scheduler stops delivering samples after stop', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  const provider = new DemoMetricsProvider();
  let count = 0;
  provider.subscribe(() => count++);
  await provider.start();
  context.mock.timers.tick(1000);
  assert.equal(count, 2);
  await provider.stop();
  context.mock.timers.tick(10000);
  assert.equal(count, 2);
});

test('consumer mutation and failure cannot corrupt demo samples or prevent delivery', async context => {
  context.mock.method(console, 'error', () => {});
  const provider = new DemoMetricsProvider({ scheduler: { every: () => () => {} } });
  provider.subscribe(m => { m.source = 'presage'; throw new Error('Consumer failure'); });
  const received = [];
  provider.subscribe(m => received.push(m));
  await assert.doesNotReject(provider.start());
  assert.equal(received[0].source, 'demo');
  await provider.stop();
});
