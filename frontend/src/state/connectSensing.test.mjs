import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectSensing } from './connectSensing.ts';
import { PlayerStateEngine } from './PlayerStateEngine.ts';
import { DemoMetricsProvider } from '../presage/DemoMetricsProvider.ts';

const flush = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
function setup() {
  let now = 0;
  const timers = new Map();
  const scheduler = { every(fn, period) { timers.set(fn, period); return () => timers.delete(fn); } };
  const provider = new DemoMetricsProvider({ now: () => now, scheduler });
  const engine = new PlayerStateEngine({}, () => now);
  const states = [], errors = [];
  const options = { provider, engine, scheduler, onState: s => states.push(s), onError: e => errors.push(e) };
  const advance = end => { while (now < end) { now += 250; for (const [fn, period] of [...timers]) if (now % period === 0) fn(); } };
  return { provider, engine, timers, states, errors, options, advance };
}

test('connected demo respects warmup, dwell, automatic phases, dropout and recovery', async () => {
  const s = setup(); const stop = connectSensing(s.options); await flush();
  assert.deepEqual(s.states, ['UNKNOWN']);
  s.advance(2000); assert.equal(s.engine.getState(), 'CALM');
  s.advance(61000); assert.equal(s.engine.getState(), 'CALM');
  s.advance(80000); assert.equal(s.engine.getState(), 'ENGAGED');
  s.advance(155000); assert.equal(s.engine.getState(), 'HIGHLY_ENGAGED');
  await s.provider.stop();
  s.advance(159000); assert.equal(s.engine.getState(), 'HIGHLY_ENGAGED');
  s.advance(163000); assert.equal(s.engine.getState(), 'UNKNOWN');
  await s.provider.start(); s.advance(165000); assert.equal(s.engine.getState(), 'CALM');
  stop(); await flush(); assert.equal(s.timers.size, 0);
  const count = s.states.length; s.advance(180000); assert.equal(s.states.length, count);
});

test('StrictMode setup-cleanup-setup starts only the surviving lifecycle', async () => {
  const first = setup(); connectSensing(first.options)();
  const second = setup(); const stop = connectSensing(second.options); await flush();
  assert.equal(first.timers.size, 0); assert.equal(first.provider.getLatest(), null);
  assert.equal(second.timers.size, 2);
  stop(); stop(); await flush(); assert.equal(second.timers.size, 0);
});

test('startup rejection surfaces an error and releases subscriptions and watchdog', async () => {
  const s = setup(); let subscribed = false, stopped = false;
  s.options.provider = { subscribe() { subscribed = true; return () => { subscribed = false; }; }, start: async () => { throw Error('No device'); }, stop: async () => { stopped = true; }, getLatest: () => null };
  connectSensing(s.options); await flush();
  assert.equal(s.errors.length, 1); assert.equal(subscribed, false); assert.equal(stopped, true);
  assert.equal(s.timers.size, 0); assert.equal(s.states.at(-1), 'UNKNOWN');
});

test('late asynchronous startup cannot revive a disposed connection', async () => {
  const s = setup(); let resolve, resource = false, listener;
  s.options.provider = { subscribe(fn) { listener = fn; return () => {}; }, getLatest: () => null,
    start: () => new Promise(r => { resolve = () => { resource = true; r(); }; }), stop: async () => { resource = false; } };
  const stop = connectSensing(s.options); await flush(); stop(); resolve(); await flush();
  listener({ source: 'demo', heartRate: 70, timestamp: 0 });
  assert.equal(resource, false); assert.equal(s.timers.size, 0); assert.deepEqual(s.states, ['UNKNOWN']);
});
