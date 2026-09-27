import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../App';
import Game from '../Game';
import { usePlayerSensing } from '../../state/usePlayerSensing';
import type { MetricsProvider } from '../../shared/contracts';

const output = document.querySelector('#results')!;
const host = document.querySelector('#root')!;
const root = createRoot(host);
const results: string[] = [];
const assert = (condition: boolean, label: string) => { if (!condition) throw Error(label); results.push(`PASS ${label}`); output.textContent = results.join('\n'); };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn: () => boolean) { const start = performance.now(); while (!fn()) { if (performance.now() - start > 5000) throw Error('Timed out'); await sleep(20); } }
const realNow = Date.now, realSet = window.setInterval, realClear = window.clearInterval;
let now = realNow(), id = 1000000;
const timers = new Map<number, { callback: () => void; period: number }>();
// Fake only sensing intervals and its epoch clock; Phaser's frame clock stays real.
Date.now = () => now;
window.setInterval = ((callback: TimerHandler, period?: number, ...args: unknown[]) => {
  if ((period === 250 || period === 1000) && typeof callback === 'function') {
    const handle = ++id; timers.set(handle, { callback: callback as () => void, period }); return handle;
  }
  return realSet(callback, period, ...args);
}) as typeof window.setInterval;
window.clearInterval = ((handle?: number) => { if (handle && timers.delete(handle)) return; realClear(handle); }) as typeof window.clearInterval;
const advance = async (ms: number, deliverMetrics = true) => {
  for (let elapsed = 250; elapsed <= ms; elapsed += 250) {
    now += 250;
    for (const timer of [...timers.values()]) if (elapsed % timer.period === 0 && (deliverMetrics || timer.period !== 1000)) timer.callback();
  }
  await sleep(50);
};
const label = () => host.querySelector('.signal-value')?.textContent ?? '';
const failingProvider = (): MetricsProvider => ({ start: async () => { throw Error('test startup failure'); }, stop: async () => {}, getLatest: () => null, subscribe: () => () => {} });
function FailureCase() { const s = usePlayerSensing(failingProvider); return <Game targetState={s.state} signalSource="demo" signalError={s.error} />; }

try {
  root.render(<StrictMode><App /></StrictMode>);
  await until(() => timers.size === 2 && host.querySelectorAll('canvas').length === 1);
  const canvas = host.querySelector('canvas');
  assert(label().includes('Unknown'), 'StrictMode starts Unknown with one provider and one watchdog');
  await advance(1000); assert(label().includes('Unknown'), 'Warmup cannot bypass candidate confirmation');
  await advance(1000); assert(label().includes('Calm'), 'Actual App receives automatic Calm classification');
  await advance(59000); assert(label().includes('Calm'), 'Committed state respects the minimum dwell');
  await advance(19000); assert(label().includes('Engaged'), 'Actual App receives automatic Engaged classification');
  await advance(75000); assert(label().includes('Highly Engaged'), 'Actual App receives automatic Highly Engaged classification');
  assert(canvas === host.querySelector('canvas'), 'Automatic state changes preserve the Phaser canvas');
  assert(!!host.textContent?.includes('Demo Mode — simulated metrics'), 'Committed demo input stays explicitly simulated');
  (host.querySelector('.settings-trigger') as HTMLButtonElement).click(); await sleep(30);
  const toggle = [...host.querySelectorAll('label')].find(l => l.textContent?.includes('Visual preview'))!.querySelector('input')!;
  toggle.click(); await sleep(30);
  const calm = [...host.querySelectorAll<HTMLButtonElement>('.state-buttons button')].find(b => b.textContent?.includes('Calm'))!;
  calm.click(); await sleep(30); assert(label().includes('Calm'), 'Explicit manual preview overrides only presentation');
  assert(!!host.textContent?.includes('Visual preview — manual states'), 'Manual override stays clearly labeled');
  toggle.click(); await sleep(30); assert(label().includes('Highly Engaged'), 'Leaving preview restores latest committed sensing state');
  await advance(4000, false); assert(label().includes('Highly Engaged'), 'Brief silence retains committed state');
  await advance(4000, false); assert(label().includes('Unknown'), 'Watchdog detects silent provider and falls back to Unknown');
  await advance(1000); assert(label().includes('Unknown'), 'Recovery requires renewed confirmation');
  await advance(2000); assert(label().includes('Highly Engaged'), 'Recovery reaches game after confirmation');
  root.render(<StrictMode><FailureCase /></StrictMode>);
  await until(() => !!host.querySelector('[role=alert]'));
  assert(label().includes('Unknown') && host.querySelectorAll('canvas').length === 1, 'Startup failure remains playable in Unknown');
  assert(timers.size === 0, 'Failure and prior hook cleanup release all sensing timers');
  root.unmount(); await sleep(100);
  assert(timers.size === 0 && host.querySelectorAll('canvas').length === 0, 'Unmount releases provider, watchdog, and Phaser');
  output.textContent = `${results.join('\n')}\nALL CHECKS PASSED`;
} catch (error) { output.textContent = `${results.join('\n')}\nFAIL ${String(error)}`; root.unmount(); }
finally { Date.now = realNow; window.setInterval = realSet; window.clearInterval = realClear; }
