import { AREAS, areaAt, encounter, type Deck, type HazardSpec } from './levels';
export const CHUNK_WIDTH = 2160;
export const DISTRICTS = AREAS.map(area => area.name);
export const MOVEMENT = { speed: 310, acceleration: 1800, brake: 2300, jump: 570, gravity: 1300, coyote: 110, buffer: 140, dash: 760, dashMs: 180 };
export type Roof = Deck;
export type Section = { id: number; start: number; end: number; tier: number; district: string; area: number; roofs: Roof[]; hazards: HazardSpec[]; hint: string; droneLeft: number; droneRight: number };
export function sectionAt(id: number): Section {
  const start = id * CHUNK_WIDTH, plan = encounter(id), area = areaAt(id);
  return { id, start, end: start + CHUNK_WIDTH, tier: Math.min(7, id), area,
    district: AREAS[area].name, roofs: plan.decks.map(p => ({ ...p, x: p.x + start })),
    hazards: plan.hazards.map(h => ({ ...h, x: h.x + start })), hint: plan.hint,
    droneLeft: start + 1610, droneRight: start + 1770 };
}
export function patrolSpeed(tier: number, stateOffset: number) { return Math.min(102, 60 + tier * 8 + stateOffset); }
export const SCORE = { fragment: 100, drone: 75, section: 150, pixelsPerPoint: 10 };
export const HIGH_SCORE_KEY = 'echoshift.high-score.v1';
export type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** Storage is optional, untrusted and never allowed to stop the run. */
export class HighScore {
  value = 0;
  saved = true;
  private storage?: ScoreStorage;
  constructor(storage?: ScoreStorage) {
    try {
      this.storage = storage ?? window.localStorage;
      const raw = this.storage.getItem(HIGH_SCORE_KEY);
      const value = raw === null ? 0 : Number(raw);
      this.value = Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch { this.saved = false; }
  }
  record(score: number) {
    if (!Number.isSafeInteger(score) || score <= this.value) return;
    this.value = score;
    try { this.storage?.setItem(HIGH_SCORE_KEY, String(score)); if (!this.storage) this.saved = false; }
    catch { this.saved = false; }
  }
}
export type RunSnapshot = {
  score: number; best: number; distance: number; fragments: number; health: number;
  stage: number; dashReady: boolean; hint: string; over: boolean; newBest: boolean; saved: boolean; district: string; reason: string;
};
export const emptyRun: RunSnapshot = { stage: 1, dashReady: true, hint: AREAS[0].hint, score: 0, best: 0, distance: 0, fragments: 0, health: 3, over: false, newBest: false, saved: true, district: DISTRICTS[0], reason: '' };
