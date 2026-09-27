import type { MetricsProvider, PlayerState } from '../shared/contracts.ts';
import { PlayerStateEngine } from './PlayerStateEngine.ts';

export interface SensingConnection {
  provider: MetricsProvider;
  engine: PlayerStateEngine;
  onState: (state: PlayerState) => void;
  onError: (error: unknown) => void;
  scheduler?: { every(callback: () => void, periodMs: number): () => void };
}

/** One provider/engine per connection. Disposal is synchronous; late startup is stopped again. */
export function connectSensing({ provider, engine, onState, onError, scheduler }: SensingConnection): () => void {
  let active = true, started = false;
  let offMetrics = () => {}, offState = () => {}, cancelWatchdog = () => {};
  const stopProvider = () => { void Promise.resolve().then(() => provider.stop()).catch(error => console.error('Sensing cleanup failed', error)); };
  const dispose = () => {
    if (!active) return;
    active = false;
    offMetrics(); offState(); cancelWatchdog();
    if (started) stopProvider();
  };
  const fail = (error: unknown) => {
    if (!active) return;
    dispose(); onState('UNKNOWN'); onError(error);
  };
  try {
    onState(engine.getState());
    offState = engine.subscribe(state => { if (active) onState(state); });
    offMetrics = provider.subscribe(metrics => {
      if (!active) return;
      try { engine.submit(metrics); } catch (error) { fail(error); }
    });
    const every = scheduler?.every.bind(scheduler) ?? ((callback: () => void, period: number) => {
      const timer = setInterval(callback, period);
      return () => clearInterval(timer);
    });
    cancelWatchdog = every(() => {
      if (!active) return;
      try { engine.tick(); } catch (error) { fail(error); }
    }, 250);
    // StrictMode's immediate cleanup cancels this before any provider starts.
    void Promise.resolve().then(async () => {
      if (!active) return;
      started = true;
      try { await provider.start(); }
      finally { if (!active) stopProvider(); }
    }).catch(fail);
  } catch (error) { fail(error); }
  return dispose;
}
