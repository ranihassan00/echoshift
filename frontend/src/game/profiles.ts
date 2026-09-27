import type { PlayerState } from '../shared/contracts';

export const TRANSITION_MS = 800;
export const PROFILES = {
  UNKNOWN: { label: 'Unknown', background: 0x0c1726, accent: 0xa7c8df, secondary: 0x8998cc, activity: .25, symbol: '—', description: 'Signal unavailable', enemySpeed: 1, hazardRate: 1, fireRate: 1, projectileSpeed: 1, collapseRate: 1, motionRate: 1, glow: 1, grade: 0, warmth: 0, saturation: 1, brightness: 1 },
  CALM: { label: 'Calm', background: 0x071528, accent: 0x63e6ef, secondary: 0x777bea, activity: .12, symbol: '○', description: 'Relaxed gameplay', enemySpeed: .55, hazardRate: .6, fireRate: .55, projectileSpeed: .85, collapseRate: .45, motionRate: .65, glow: .55, grade: .16, warmth: -.22, saturation: .8, brightness: .9 },
  ENGAGED: { label: 'Engaged', background: 0x10132c, accent: 0x82eaff, secondary: 0xbf7aff, activity: .65, symbol: '◇', description: 'Active gameplay', enemySpeed: 1.05, hazardRate: 1.15, fireRate: 1.15, projectileSpeed: 1, collapseRate: 1.15, motionRate: 1.1, glow: 1.35, grade: .12, warmth: -.04, saturation: 1.2, brightness: 1.12 },
  HIGHLY_ENGAGED: { label: 'Highly Engaged', background: 0x201128, accent: 0xffad88, secondary: 0xf771bd, activity: 1, symbol: '△', description: 'Intense gameplay', enemySpeed: 1.8, hazardRate: 1.9, fireRate: 2.2, projectileSpeed: 1.18, collapseRate: 2.5, motionRate: 1.65, glow: 2, grade: .24, warmth: .12, saturation: 1.4, brightness: 1.24 },
} satisfies Record<PlayerState, { label: string; background: number; accent: number; secondary: number; activity: number; symbol: string; description: string; enemySpeed: number; hazardRate: number; fireRate: number; projectileSpeed: number; collapseRate: number; motionRate: number; glow: number; grade: number; warmth: number; saturation: number; brightness: number }>;

export function normalizeState(value: unknown): PlayerState {
  return typeof value === 'string' && Object.hasOwn(PROFILES, value) ? value as PlayerState : 'UNKNOWN';
}
export function presentation(state: PlayerState) {
  const p = PROFILES[normalizeState(state)];
  return { r: p.background >> 16, g: (p.background >> 8) & 255, b: p.background & 255,
    ar: p.accent >> 16, ag: (p.accent >> 8) & 255, ab: p.accent & 255,
    sr: p.secondary >> 16, sg: (p.secondary >> 8) & 255, sb: p.secondary & 255,
    activity: p.activity, enemySpeed: p.enemySpeed, hazardRate: p.hazardRate, fireRate: p.fireRate,
    projectileSpeed: p.projectileSpeed, collapseRate: p.collapseRate, motionRate: p.motionRate,
    glow: p.glow, grade: p.grade, warmth: p.warmth, saturation: p.saturation, brightness: p.brightness };
}
export type Presentation = ReturnType<typeof presentation>;
export const color = (r: number, g: number, b: number) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

/** Grade the biome's own channels; never replace its palette with a state palette. */
export function biomeColor(base: number, p: Presentation): number {
  const r = base >> 16, g = (base >> 8) & 255, b = base & 255;
  const mean = (r + g + b) / 3;
  const channel = (value: number, temperature: number) => Math.max(0, Math.min(255,
    (mean + (value - mean) * p.saturation) * p.brightness + temperature * 28));
  return color(channel(r, p.warmth), channel(g, 0), channel(b, -p.warmth));
}
