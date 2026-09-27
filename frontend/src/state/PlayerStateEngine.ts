import type { PlayerMetrics, PlayerState } from '../shared/contracts.ts';
import { stateConfig } from './config.ts';
import type { StateConfig } from './config.ts';

type NormalState = Exclude<PlayerState, 'UNKNOWN'>;
type Measurements = Pick<PlayerMetrics, 'heartRate' | 'breathingRate' | 'engagement'>;
const fields = ['heartRate', 'breathingRate', 'engagement'] as const;

/** No timers owned here: call tick() periodically to detect a silent provider. */
export class PlayerStateEngine {
  private readonly config: StateConfig;
  private readonly now: () => number;
  private state: PlayerState = 'UNKNOWN';
  private committedAt = 0;
  private candidate: NormalState | null = null;
  private candidateAt = 0;
  private classified: NormalState | null = null;
  private samples: PlayerMetrics[] = [];
  private lastValidAt: number | null = null;
  private lastTimestamp: number | null = null;
  private source: PlayerMetrics['source'] | null = null;
  private lossSince: number | null = null;
  private clockAt = -Infinity;
  private listeners = new Set<(state: PlayerState) => void>();

  constructor(config: Partial<StateConfig> = {}, now: () => number = Date.now) {
    this.config = stateConfig(config);
    this.now = now;
  }

  getState(): PlayerState { return this.state; }

  /** Changes only; use getState() for the initial snapshot. */
  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  tick(): PlayerState {
    this.checkLoss(this.time());
    return this.state;
  }

  submit(metrics: PlayerMetrics | null | undefined): PlayerState {
    const now = this.time();
    this.checkLoss(now);
    const values: Measurements = {};
    if (metrics) for (const field of fields) {
      const value = metrics[field];
      if (typeof value === 'number' && Number.isFinite(value) &&
          (field === 'engagement' ? value >= 0 && value <= 1 : value > 0)) values[field] = value;
    }
    if (!metrics || (metrics.source !== 'demo' && metrics.source !== 'presage') ||
        !Number.isFinite(metrics.timestamp) || metrics.timestamp < 0 || metrics.timestamp > now ||
        now - metrics.timestamp >= this.config.staleAfterMs || Object.keys(values).length === 0 ||
        (this.source === metrics.source && this.lastTimestamp !== null && metrics.timestamp <= this.lastTimestamp)) {
      this.lose(now);
      this.checkLoss(now);
      return this.state;
    }

    if (this.source !== metrics.source) this.resetEvidence();
    this.source = metrics.source;
    this.lastTimestamp = metrics.timestamp;
    this.lastValidAt = metrics.timestamp;
    this.lossSince = null;
    this.samples = this.samples.filter(s => now - s.timestamp < this.config.staleAfterMs);
    this.samples.push({ ...values, timestamp: metrics.timestamp, source: metrics.source });
    this.samples = this.samples.slice(-this.config.windowSize);
    const smooth: Measurements = {};
    // Only fields present in this sample are usable. Historical optional fields
    // must not lend support to a state after that measurement disappears.
    for (const field of fields) if (values[field] !== undefined) {
      const present = this.samples.map(s => s[field]).filter((v): v is number => v !== undefined);
      smooth[field] = present.reduce((sum, v) => sum + v, 0) / present.length;
    }
    const next = this.classify(smooth);
    this.classified = next;
    if (next === this.state) {
      this.candidate = null;
    } else {
      if (this.candidate !== next) { this.candidate = next; this.candidateAt = now; }
      const confirmed = now - this.candidateAt >= this.config.candidateConfirmationMs;
      const dwellPassed = this.state === 'UNKNOWN' || now - this.committedAt >= this.config.minStateDurationMs;
      if (confirmed && dwellPassed) this.commit(next, now);
    }
    return this.state;
  }

  private time(): number {
    const now = this.now();
    if (!Number.isFinite(now) || now < this.clockAt) throw new RangeError('Clock must be finite and nondecreasing');
    this.clockAt = now;
    return now;
  }

  private resetEvidence(): void {
    this.samples = [];
    this.candidate = null;
    this.classified = null;
  }

  private lose(since: number): void {
    this.lossSince = this.lossSince === null ? since : Math.min(this.lossSince, since);
    this.resetEvidence();
  }

  private checkLoss(now: number): void {
    if (this.lastValidAt !== null && now >= this.lastValidAt + this.config.staleAfterMs) {
      this.lose(this.lastValidAt + this.config.staleAfterMs);
    }
    if (this.lossSince !== null && now - this.lossSince >= this.config.dropoutGraceMs) this.commit('UNKNOWN', now);
  }

  private classify(values: Measurements): NormalState {
    const c = this.config;
    const high = this.classified === 'HIGHLY_ENGAGED';
    if ((values.heartRate ?? -Infinity) >= (high ? c.heartRateHighExit : c.heartRateHighEnter) ||
        (values.breathingRate ?? -Infinity) >= (high ? c.breathingRateHighExit : c.breathingRateHighEnter)) return 'HIGHLY_ENGAGED';
    const active = this.classified === 'ENGAGED' || high;
    if ((values.heartRate ?? -Infinity) >= (active ? c.heartRateEngagedExit : c.heartRateEngagedEnter) ||
        (values.breathingRate ?? -Infinity) >= (active ? c.breathingRateEngagedExit : c.breathingRateEngagedEnter) ||
        (values.engagement ?? -Infinity) >= (active ? c.engagementExit : c.engagementEnter)) return 'ENGAGED';
    return 'CALM';
  }

  private commit(state: PlayerState, now: number): void {
    if (state === this.state) return;
    this.state = state;
    this.committedAt = now;
    this.candidate = null;
    for (const listener of [...this.listeners]) {
      try { listener(state); }
      catch (error) { console.error('Player state subscriber failed', error); }
    }
  }
}
