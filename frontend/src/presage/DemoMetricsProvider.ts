import type { MetricsProvider, PlayerMetrics } from '../shared/contracts.ts';

export interface DemoOptions {
  now?: () => number;
  intervalMs?: number;
  /** Each simulated phase lasts this long; the default exceeds engine dwell. */
  phaseDurationMs?: number;
  scheduler?: { every(callback: () => void, intervalMs: number): () => void };
}

/** SIMULATED values only. Never accesses a camera or an external service. */
export class DemoMetricsProvider implements MetricsProvider {
  readonly label = 'Demo Mode — simulated metrics';
  private readonly now: () => number;
  private readonly intervalMs: number;
  private readonly phaseDurationMs: number;
  private readonly scheduler: NonNullable<DemoOptions['scheduler']>;
  private cancel: (() => void) | null = null;
  private startedAt = 0;
  private latest: PlayerMetrics | null = null;
  private listeners = new Set<(metrics: PlayerMetrics) => void>();

  constructor(options: DemoOptions = {}) {
    this.now = options.now ?? Date.now;
    this.intervalMs = options.intervalMs ?? 1_000;
    this.phaseDurationMs = options.phaseDurationMs ?? 75_000;
    for (const value of [this.intervalMs, this.phaseDurationMs]) {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError('Demo timing must be positive and finite');
    }
    this.scheduler = options.scheduler ?? { every: (callback, interval) => {
      const timer = setInterval(callback, interval);
      return () => clearInterval(timer);
    } };
  }

  async start(): Promise<void> {
    if (this.cancel) return;
    this.startedAt = this.now();
    this.cancel = this.scheduler.every(() => this.emit(), this.intervalMs);
    this.emit();
  }

  async stop(): Promise<void> {
    this.cancel?.();
    this.cancel = null;
    this.latest = null;
  }

  getLatest(): PlayerMetrics | null { return this.latest ? { ...this.latest } : null; }

  subscribe(listener: (metrics: PlayerMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    if (!this.cancel) return;
    const timestamp = this.now();
    const phase = Math.floor(Math.max(0, timestamp - this.startedAt) / this.phaseDurationMs) % 3;
    const levels = [
      { heartRate: 70, breathingRate: 12, engagement: 0.3 },
      { heartRate: 90, breathingRate: 19, engagement: 0.75 },
      { heartRate: 120, breathingRate: 26, engagement: 0.85 },
    ];
    this.latest = { ...levels[phase], timestamp, source: 'demo' };
    for (const listener of [...this.listeners]) {
      try { listener({ ...this.latest }); }
      catch (error) { console.error('Demo metrics subscriber failed', error); }
    }
  }
}
