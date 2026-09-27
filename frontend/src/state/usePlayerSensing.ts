import { useEffect, useState } from 'react';
import type { MetricsProvider, PlayerState } from '../shared/contracts';
import { DemoMetricsProvider } from '../presage/DemoMetricsProvider';
import { PlayerStateEngine } from './PlayerStateEngine';
import { connectSensing } from './connectSensing';

const demoProvider = () => new DemoMetricsProvider();

/** Factory must be stable and return a fresh provider for each effect lifetime. */
export function usePlayerSensing(createProvider: () => MetricsProvider = demoProvider) {
  const [result, setResult] = useState<{ provider: typeof createProvider; state: PlayerState; error: string | null }>(
    { provider: createProvider, state: 'UNKNOWN', error: null });
  useEffect(() => {
    setResult({ provider: createProvider, state: 'UNKNOWN', error: null });
    try {
      return connectSensing({
        provider: createProvider(), engine: new PlayerStateEngine(),
        onState: state => setResult(previous => ({ ...previous, provider: createProvider, state })),
        onError: () => setResult({ provider: createProvider, state: 'UNKNOWN', error: 'Sensing unavailable. Gameplay continues with Unknown. Reload to retry.' }),
      });
    } catch {
      setResult({ provider: createProvider, state: 'UNKNOWN', error: 'Sensing could not start. Gameplay continues with Unknown. Reload to retry.' });
    }
  }, [createProvider]);
  // Never display the previous provider's classification during a source switch.
  return result.provider === createProvider ? { state: result.state, error: result.error } : { state: 'UNKNOWN' as PlayerState, error: null };
}
