import type { PlayerState } from '../shared/contracts';

export const TRANSITION_MS = 1600;
export const PROFILES = {
  CALM: { background: 0x071528, accent: 0x63e6ef, secondary: 0x777bea, activity: 0.35, speed: 0, symbol: '○', description: 'Quiet signal' },
  ENGAGED: { background: 0x10132c, accent: 0x82eaff, secondary: 0xbf7aff, activity: 0.7, speed: 5, symbol: '◇', description: 'Active signal' },
  HIGH_AROUSAL: { background: 0x201128, accent: 0xffad88, secondary: 0xf771bd, activity: 1, speed: 10, symbol: '△', description: 'Elevated signal' },
  UNKNOWN: { background: 0x0c1726, accent: 0xa7c8df, secondary: 0x8998cc, activity: 0.25, speed: 0, symbol: '—', description: 'Signal unavailable' },
} satisfies Record<PlayerState, { background: number; accent: number; secondary: number; activity: number; speed: number; symbol: string; description: string }>;

export type Presentation = { r: number; g: number; b: number; ar: number; ag: number; ab: number; sr: number; sg: number; sb: number; activity: number };
export function presentation(state: PlayerState): Presentation {
  const p = PROFILES[state];
  return { r: p.background >> 16, g: (p.background >> 8) & 255, b: p.background & 255,
    ar: p.accent >> 16, ag: (p.accent >> 8) & 255, ab: p.accent & 255,
    sr: p.secondary >> 16, sg: (p.secondary >> 8) & 255, sb: p.secondary & 255, activity: p.activity };
}
export const color = (r: number, g: number, b: number) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
