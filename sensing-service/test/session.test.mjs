import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNativeSession } from '../src/session.mjs';
const now = 1790000000000;
function sdkFixture() {
  let options, starts = 0, stops = 0, destroyed = 0;
  const callbacks = new Map();
  class SmartSpectraSDK {
    constructor(value) { options = value; }
    on(event, callback) { callbacks.set(event, callback); return this; }
    useCamera(value) { assert.deepEqual(value, { deviceIndex: 0 }); }
    start() { starts++; }
    async stopAsync() { stops++; }
    async destroy() { destroyed++; }
  }
  return { api: { SmartSpectraSDK, SmartSpectraLogLevel: { kNone: 4 }, decodeMetrics: value => value },
    event: (name, ...args) => callbacks.get(name)(...args), counts: () => ({ starts, stops, destroyed }), options: () => options };
}
test('native adapter only starts on request; validates frames and stable samples; stops idempotently', async () => {
  const sdk = sdkFixture(), messages = [];
  const session = await createNativeSession({ emit: message => messages.push(message), apiKey: 'test-only', loadSdk: async () => sdk.api, now: () => now });
  assert.equal(sdk.counts().starts, 0);
  session.start();
  sdk.event('processingStatus', 1);
  assert.ok(!messages.some(message => message.type === 'error'), 'initial idle notification is not a failed session');
  assert.deepEqual(sdk.options().requestedMetrics, [2, 15]);
  const metrics = { cardio: { pulseRate: [{ value: 72, timestamp: now * 1000, confidence: 80, stable: true }] } };
  sdk.event('metrics', metrics); assert.ok(!messages.some(m => m.type === 'metrics'));
  sdk.event('validationStatus', 0); sdk.event('metrics', metrics);
  assert.deepEqual(messages.at(-1), { type: 'metrics', metrics: { source: 'presage', heartRate: 72, timestamp: now } });
  sdk.event('validationStatus', 1); sdk.event('metrics', metrics);
  assert.equal(messages.at(-1).status, 'positioning');
  await session.stop(); await session.stop();
  const length = messages.length; sdk.event('error', 2, 'secret');
  assert.equal(messages.length, length);
  assert.deepEqual(sdk.counts(), { starts: 1, stops: 1, destroyed: 1 });
});
test('missing key never loads native library; errors expose fixed codes only', async () => {
  let loaded = false;
  await assert.rejects(createNativeSession({ emit() {}, apiKey: '', loadSdk: async () => { loaded = true; } }));
  assert.equal(loaded, false);
  const sdk = sdkFixture(), messages = [];
  const session = await createNativeSession({ emit: message => messages.push(message), apiKey: 'test-only', loadSdk: async () => sdk.api });
  session.start(); sdk.event('error', 4, 'secret');
  assert.deepEqual(messages.at(-1), { type: 'error', code: 'credits_exhausted' });
  await session.stop();
});
test('installed SDK exports and protobuf decoding match the adapter without opening camera', async () => {
  const api = await import('@smartspectra/node-sdk');
  const { Metrics } = await import('@smartspectra/node-sdk/messages');
  assert.equal(typeof api.SmartSpectraSDK.prototype.useCamera, 'function');
  assert.equal(typeof api.SmartSpectraSDK.prototype.stopAsync, 'function');
  const payload = { cardio: { pulseRate: [{ value: 72, stable: true, confidence: 80, timestamp: now * 1000 }] } };
  const decoded = api.decodeMetrics(Metrics.encode(payload).finish());
  assert.equal(decoded.cardio.pulseRate[0].value, 72);
  assert.equal(Number(decoded.cardio.pulseRate[0].timestamp), now * 1000);
});

