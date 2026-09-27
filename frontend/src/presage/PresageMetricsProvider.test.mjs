import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PresageMetricsProvider } from './PresageMetricsProvider.ts';
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture(options = {}) {
  let controller, now = 1790000000000;
  const requests = [], statuses = [], timers = new Set();
  const fetcher = async (url, init) => {
    requests.push(url);
    if (!url.endsWith('/session')) return new Response(null, { status: 200 });
    return new Response(new ReadableStream({ start(value) { controller = value; } }));
  };
  const provider = new PresageMetricsProvider({ fetcher, now: () => now, onStatus: value => statuses.push(value),
    every: callback => { timers.add(callback); return () => timers.delete(callback); }, ...options });
  return { provider, requests, statuses, timers, send: value => controller.enqueue(new TextEncoder().encode(value)),
    end: () => controller.close(), advance: amount => { now += amount; for (const timer of timers) timer(); } };
}
test('only explicit start opens stream; split NDJSON yields canonical copied metrics', async () => {
  const f = fixture(); const received = [];
  f.provider.subscribe(value => received.push(value));
  assert.equal(f.requests.length, 0);
  await f.provider.start(); await f.provider.start();
  assert.equal(f.requests.filter(url => url.endsWith('/session')).length, 1);
  const message = JSON.stringify({ type: 'metrics', metrics: { heartRate: 72, timestamp: 1790000000000, source: 'presage' } }) + '\n';
  f.send(message.slice(0, 20)); f.send(message.slice(20)); await settle();
  assert.equal(received[0].heartRate, 72);
  received[0].heartRate = 999; assert.equal(f.provider.getLatest().heartRate, 72);
  await f.provider.stop(); assert.equal(f.timers.size, 0); assert.equal(f.provider.getLatest(), null);
});
test('invalid source, stale, repeated and malformed measurements never become evidence', async () => {
  const f = fixture(); const received = [];
  f.provider.subscribe(value => received.push(value)); await f.provider.start();
  for (const metrics of [{ heartRate: 72, source: 'demo', timestamp: 1790000000000 }, { heartRate: 72, source: 'presage', timestamp: 1789999900000 }, { heartRate: '72', source: 'presage', timestamp: 1790000000000 }, { source: 'presage', timestamp: 1790000000000 }]) f.send(JSON.stringify({ type: 'metrics', metrics }) + '\n');
  await settle(); assert.equal(received.length, 0);
  const message = JSON.stringify({ type: 'metrics', metrics: { heartRate: 72, source: 'presage', timestamp: 1790000000000 } }) + '\n';
  f.send(message); f.send(message); await settle(); assert.equal(received.length, 1);
  f.advance(4000); assert.equal(f.statuses.at(-1).status, 'warming');
  await f.provider.stop();
});
test('stream error is surfaced and stops without automatic reconnect', async () => {
  const f = fixture(); await f.provider.start();
  f.send('{"type":"error","code":"credits_exhausted"}\n'); await settle();
  assert.equal(f.statuses.at(-1).code, 'credits_exhausted');
  assert.equal(f.timers.size, 0); assert.equal(f.provider.getLatest(), null);
  assert.equal(f.requests.filter(url => url.endsWith('/session')).length, 1);
});
test('stop during late startup cannot deliver stale updates or create timers', async () => {
  let release;
  const f = fixture({ fetcher: url => url.endsWith('/session') ? new Promise(resolve => { release = resolve; }) : Promise.resolve(new Response()) });
  const starting = f.provider.start(); await f.provider.stop();
  const statusCount = f.statuses.length;
  release(new Response('{"type":"status","status":"warming"}\n'));
  await starting; await settle();
  assert.equal(f.statuses.length, statusCount); assert.equal(f.timers.size, 0);
});
test('unexpected stream end fails closed and lease failure stops session', async () => {
  const f = fixture(); await f.provider.start(); f.end(); await settle();
  assert.equal(f.statuses.at(-1).status, 'error'); assert.equal(f.timers.size, 0);
});

test('failed lease renewal closes connection and does not restart sensing', async () => {
  let requests = 0;
  const f = fixture({ fetcher: async url => {
    if (url.endsWith('/session')) { requests++; return new Response(new ReadableStream()); }
    return new Response(null, { status: url.endsWith('/heartbeat') ? 503 : 200 });
  } });
  await f.provider.start(); f.advance(5000); await settle();
  assert.equal(f.statuses.at(-1).status, 'error'); assert.equal(f.timers.size, 0); assert.equal(requests, 1);
});
