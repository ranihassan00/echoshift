import type { PlayerState } from '../shared/contracts';
export const TRANSITION_MS = 1200;
export const PROFILES = {
  CALM: { background: 0x102331, accent: 0x83dedb, activity: 0.35, speed: 45, symbol: '○', description: 'Quiet machinery · steady patrol' },
  ENGAGED: { background: 0x162641, accent: 0x93baff, activity: 0.7, speed: 55, symbol: '◇', description: 'Active machinery · lively patrol' },
  HIGH_AROUSAL: { background: 0x30232d, accent: 0xffbd88, activity: 1, speed: 65, symbol: '△', description: 'Elevated activity · watch patrol cues' },
  UNKNOWN: { background: 0x1c2632, accent: 0xb6c6d2, activity: 0.2, speed: 45, symbol: '—', description: 'Sensing unavailable or warming up · steady fallback' },
} satisfies Record<PlayerState, { background: number; accent: number; activity: number; speed: number; symbol: string; description: string }>;
export const LEVEL = [
  { x: 0, y: 470, width: 340 }, { x: 410, y: 420, width: 270 },
  { x: 750, y: 360, width: 230 }, { x: 1050, y: 420, width: 300 },
  { x: 1420, y: 360, width: 230 }, { x: 1720, y: 420, width: 480 },
];
