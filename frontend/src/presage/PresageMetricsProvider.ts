import type { MetricsProvider, PlayerMetrics } from '../shared/contracts';

export type LiveStatus = { status: 'connecting' | 'warming' | 'positioning' | 'receiving' | 'error'; code?: string; validationCode?: number };
interface Options {
  onStatus?: (status: LiveStatus) => void;
  url?: string;
  fetcher?: typeof fetch;
  now?: () => number;
  every?: (callback: () => void, period: number) => () => void;
}
interface Connection {
  active: boolean; abort: AbortController; token: string; cancel: () => void;
  startup: Promise<void>; lastMessage: number; lastLease: number; leasing: boolean;
}

/** Explicit opt-in transport. Never reconnects or substitutes simulated measurements. */
export class PresageMetricsProvider implements MetricsProvider {
  private options: Options;
  private fetcher: typeof fetch;
  private now: () => number;
  private url: string;
  private connection: Connection | null = null;
  private latest: PlayerMetrics | null = null;
  private listeners = new Set<(metrics: PlayerMetrics) => void>();
  private lastTimestamp = -Infinity;
  constructor(options: Options = {}) {
    this.options = options; this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now; this.url = options.url ?? 'http://127.0.0.1:8787';
  }
  getLatest() { return this.latest ? { ...this.latest } : null; }
  subscribe(listener: (metrics: PlayerMetrics) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  start(): Promise<void> {
    if (this.connection) return this.connection.startup;
    this.latest = null; this.lastTimestamp = -Infinity;
    const connection: Connection = { active: true, abort: new AbortController(), token: crypto.randomUUID(), cancel: () => {},
      startup: Promise.resolve(), lastMessage: this.now(), lastLease: this.now(), leasing: false };
    this.connection = connection;
    this.report(connection, { status: 'connecting' });
    connection.startup = this.open(connection);
    return connection.startup;
  }
  async stop(): Promise<void> {
    const connection = this.connection;
    if (!connection) return;
    connection.active = false; this.connection = null; this.latest = null;
    connection.cancel(); connection.abort.abort();
    // The stream abort also releases the session. This explicit stop covers delayed abort delivery.
    try { const response = await this.fetcher(this.url + '/stop', { method: 'POST', headers: this.headers(connection), keepalive: true, signal: AbortSignal.timeout(3000) }); await response.arrayBuffer(); } catch { /* Server lease is the final cleanup fallback. */ }
  }
  private headers(connection: Connection) { return { 'X-EchoShift-Session': connection.token }; }
  private report(connection: Connection, status: LiveStatus) {
    if (connection.active) this.options.onStatus?.(status);
  }
  private fail(connection: Connection, code: string) {
    if (!connection.active) return;
    this.report(connection, { status: 'error', code });
    void this.stop();
  }
  private async open(connection: Connection) {
    try {
      const timeout = setTimeout(() => connection.abort.abort(), 15000);
      let response: Response;
      try { response = await this.fetcher(this.url + '/session', { method: 'POST', headers: this.headers(connection), signal: connection.abort.signal }); }
      finally { clearTimeout(timeout); }
      if (!connection.active) { await response.body?.cancel(); return; }
      if (!response.ok || !response.body) {
        this.fail(connection, response.status === 409 ? 'busy' : 'unavailable'); return;
      }
      this.report(connection, { status: 'warming' });
      const every = this.options.every ?? ((callback: () => void, period: number) => { const timer = setInterval(callback, period); return () => clearInterval(timer); });
      connection.cancel = every(() => {
        if (!connection.active) return;
        if (this.now() - connection.lastMessage >= 10000) { this.fail(connection, 'disconnected'); return; }
        if (this.latest && this.now() - this.latest.timestamp >= 3000) { this.latest = null; this.report(connection, { status: 'warming' }); }
        if (!connection.leasing && this.now() - connection.lastLease >= 5000) {
          connection.leasing = true; connection.lastLease = this.now();
          void this.fetcher(this.url + '/heartbeat', { method: 'POST', headers: this.headers(connection),
            signal: AbortSignal.any([connection.abort.signal, AbortSignal.timeout(3000)]) })
            .then(async result => { await result.arrayBuffer(); if (!result.ok) this.fail(connection, 'disconnected'); })
            .catch(() => this.fail(connection, 'disconnected')).finally(() => { connection.leasing = false; });
        }
      }, 1000);
      void this.read(connection, response.body);
    } catch {
      this.fail(connection, 'unavailable');
    }
  }
  private async read(connection: Connection, body: ReadableStream<Uint8Array>) {
    const reader = body.getReader(), decoder = new TextDecoder();
    let pending = '';
    try {
      while (connection.active) {
        const { done, value } = await reader.read();
        if (done) { this.fail(connection, 'disconnected'); break; }
        pending += decoder.decode(value, { stream: true });
        if (pending.length > 65536) throw new Error('Oversized message');
        let boundary;
        while (connection.active && (boundary = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, boundary); pending = pending.slice(boundary + 1);
          if (line.trim()) this.receive(connection, JSON.parse(line));
        }
      }
    } catch { this.fail(connection, 'invalid_stream'); }
    finally { try { await reader.cancel(); } catch { /* Already closed. */ } reader.releaseLock(); }
  }
  private receive(connection: Connection, message: unknown) {
    if (!connection.active || !message || typeof message !== 'object') return;
    const value = message as { type?: string; status?: string; code?: string; validationCode?: number; metrics?: PlayerMetrics };
    connection.lastMessage = this.now();
    if (value.type === 'error') { this.fail(connection, typeof value.code === 'string' ? value.code : 'sensing_failed'); return; }
    if (value.type === 'status' && (value.status === 'warming' || value.status === 'positioning')) {
      // A repeated kOk event must not replace a current receiving indicator.
      if (value.status === 'positioning' || !this.latest) this.report(connection, { status: value.status, validationCode: value.validationCode });
      return;
    }
    if (value.type !== 'metrics') return;
    const metrics = value.metrics;
    if (!metrics || metrics.source !== 'presage' || !Number.isFinite(metrics.timestamp) ||
        metrics.timestamp <= this.lastTimestamp || metrics.timestamp > this.now() || this.now() - metrics.timestamp >= 3000) return;
    const fields = [metrics.heartRate, metrics.breathingRate];
    if (!fields.some(item => typeof item === 'number' && Number.isFinite(item) && item > 0) ||
        fields.some(item => item !== undefined && (typeof item !== 'number' || !Number.isFinite(item) || item <= 0))) return;
    const sample: PlayerMetrics = { source: 'presage', timestamp: metrics.timestamp };
    if (metrics.heartRate !== undefined) sample.heartRate = metrics.heartRate;
    if (metrics.breathingRate !== undefined) sample.breathingRate = metrics.breathingRate;
    this.lastTimestamp = sample.timestamp; this.latest = sample;
    this.report(connection, { status: 'receiving' });
    for (const listener of this.listeners) listener({ ...sample });
  }
}



