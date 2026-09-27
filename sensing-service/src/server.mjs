import { createServer } from 'node:http';

/** Loopback-only service. The response stream owns a single camera session. */
export function createSensingServer({ createSession, origins, now = Date.now,
  every = callback => { const timer = setInterval(callback, 1000); return () => clearInterval(timer); } }) {
  let active = null, shuttingDown = false, cleanupFailed = false;
  const server = createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address()?.port}`;
    const origin = req.headers.origin;
    const reject = (status, code) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: code })); };
    if (req.headers.host !== host || !origins.includes(origin)) return reject(403, 'origin_denied');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'X-EchoShift-Session', 'Access-Control-Max-Age': '600' });
      return res.end();
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ status: cleanupFailed ? 'unavailable' : active ? 'busy' : 'idle' }));
    }
    if (req.method !== 'POST' || !['/session', '/stop', '/heartbeat'].includes(req.url)) return reject(404, 'not_found');
    const token = req.headers['x-echoshift-session'];
    if (typeof token !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(token)) return reject(403, 'invalid_session');
    if (req.url !== '/session') {
      if (active && active.token !== token) return reject(403, 'not_owner');
      if (req.url === '/stop') {
        await active?.close();
        res.writeHead(cleanupFailed ? 503 : 200); return res.end();
      }
      if (!active || active.closed) return reject(409, 'session_closed');
      active.lastSeen = now(); res.writeHead(200); return res.end();
    }
    if (shuttingDown || cleanupFailed) return reject(503, 'unavailable');
    if (active) return reject(409, 'busy');
    const connection = { token, lastSeen: now(), closed: false, close: null };
    active = connection;
    let session, ready, closing;
    let cancelLease = () => {};
    const emit = message => {
      if (connection.closed) return;
      if (res.writableLength > 65536) { void connection.close(); return; }
      res.write(JSON.stringify(message) + '\n');
      if (message.type === 'error') void connection.close();
    };
    connection.close = () => {
      if (closing) return closing;
      connection.closed = true; cancelLease(); res.end();
      closing = Promise.resolve().then(async () => {
        await ready;
        try { await session?.stop(); }
        catch { cleanupFailed = true; console.error('Camera cleanup failed. Restart the sensing service before retrying.'); }
        finally { if (active === connection) active = null; }
      });
      return closing;
    };
    res.on('close', () => { void connection.close(); });
    res.on('error', () => { void connection.close(); });
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.flushHeaders();
    cancelLease = every(() => {
      if (now() - connection.lastSeen >= 15000) emit({ type: 'error', code: 'lease_expired' });
      else emit({ type: 'heartbeat' });
    });
    ready = (async () => {
      try {
        session = await createSession({ emit });
        if (!connection.closed) await session.start();
      } catch (error) { emit({ type: 'error', code: error?.code === 'missing_key' ? 'missing_key' : 'startup_failed' }); }
    })();
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return { server, async shutdown() {
    shuttingDown = true;
    await active?.close();
    if (server.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  } };
}

