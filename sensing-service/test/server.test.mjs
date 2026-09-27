import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { createSensingServer } from '../src/server.mjs';
const origin = 'http://localhost:5173';
const token = 'test-session-1234567890';
async function fixture(t, options = {}) {
  let starts = 0, stops = 0;
  const service = createSensingServer({ origins: [origin], createSession: async ({ emit }) => ({
    start() { starts++; emit({ type: 'status', status: 'warming' }); },
    async stop() { stops++; }
  }), ...options });
  await new Promise(resolve => service.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${service.server.address().port}`;
  t.after(() => service.shutdown());
  const request = (path, opts = {}) => fetch(url + path, { method: 'POST', ...opts, headers: { Origin: origin, 'X-EchoShift-Session': token, ...opts.headers } });
  return { service, request, counts: () => ({ starts, stops }) };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
test('health never starts camera; stream starts once and abort releases it', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/health', { method: 'GET' })).status, 200);
  assert.deepEqual(f.counts(), { starts: 0, stops: 0 });
  const abort = new AbortController();
  const response = await f.request('/session', { signal: abort.signal });
  assert.equal(response.status, 200);
  assert.match(new TextDecoder().decode((await response.body.getReader().read()).value), /warming/);
  assert.equal((await f.request('/session')).status, 409);
  abort.abort(); await settle();
  assert.deepEqual(f.counts(), { starts: 1, stops: 1 });
});
test('foreign origins, missing origin, forged host and missing token cannot start camera', async t => {
  const f = await fixture(t);
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: '' }, { 'X-EchoShift-Session': '' }]) {
    assert.equal((await f.request('/session', { headers })).status, 403);
  }
  const rejectedHost = await new Promise(resolve => { const req = httpRequest({ hostname: '127.0.0.1', port: f.service.server.address().port, path: '/session', method: 'POST', headers: { Origin: origin, Host: 'evil.example', 'X-EchoShift-Session': token } }, response => { response.resume(); resolve(response.statusCode); }); req.end(); });
  assert.equal(rejectedHost, 403);
  assert.equal(f.counts().starts, 0);
});
test('explicit stop requires owner token and waits for camera cleanup', async t => {
  const f = await fixture(t);
  const response = await f.request('/session');
  assert.equal((await f.request('/stop', { headers: { 'X-EchoShift-Session': 'another-token-123456789' } })).status, 403);
  assert.equal((await f.request('/stop')).status, 200);
  await response.text();
  assert.equal(f.counts().stops, 1);
});
test('expired lease closes camera even if connection stays open', async t => {
  let now = 0, check;
  const f = await fixture(t, { now: () => now, every: callback => { check = callback; return () => { check = undefined; }; } });
  const response = await f.request('/session');
  now = 14000; assert.equal((await f.request('/heartbeat')).status, 200);
  now = 28000; check(); assert.equal(f.counts().stops, 0);
  now = 30000; check(); await response.text(); await settle();
  assert.equal(f.counts().stops, 1);
  assert.equal(check, undefined);
});
test('disconnect during startup destroys late session without starting camera', async t => {
  let release, starts = 0, stops = 0;
  const f = await fixture(t, { createSession: () => new Promise(resolve => { release = () => resolve({ start() { starts++; }, async stop() { stops++; } }); }) });
  const abort = new AbortController();
  await f.request('/session', { signal: abort.signal });
  abort.abort(); await settle(); release(); await settle();
  assert.equal(starts, 0); assert.equal(stops, 1);
});
test('startup errors are sanitized and service can accept a later session', async t => {
  const f = await fixture(t, { createSession: async () => { throw new Error('secret-key-do-not-leak'); } });
  const response = await f.request('/session');
  const text = await response.text();
  assert.match(text, /startup_failed/); assert.doesNotMatch(text, /secret-key/);
  assert.equal((await f.request('/session')).status, 200);
});


test('service shutdown releases active session and rejects future connections', async t => {
  const f = await fixture(t);
  const response = await f.request('/session');
  await f.service.shutdown();
  await response.text();
  assert.deepEqual(f.counts(), { starts: 1, stops: 1 });
  assert.equal(f.service.server.listening, false);
});
test('failed native start still destroys its session and cleanup failure blocks reuse', async t => {
  let stops = 0;
  const f = await fixture(t, { createSession: async () => ({ start() { throw Error('failed'); }, async stop() { stops++; throw Error('failed cleanup'); } }) });
  const response = await f.request('/session'); await response.text(); await settle();
  assert.equal(stops, 1);
  assert.equal((await f.request('/session')).status, 503);
});
