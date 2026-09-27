export const CHUNK_WIDTH = 2160;
export const DISTRICTS = ['RAINLINE ROOFTOPS', 'TRANSIT SPINE', 'THE FOUNDRY', 'ARCHIVE RUINS', 'REACTOR GARDEN', 'MACHINE CATHEDRAL'] as const;
export const MOVEMENT = { speed: 310, acceleration: 1800, brake: 2300, jump: 570, gravity: 1300, coyote: 110, buffer: 140 };
export type Roof = { x: number; y: number; width: number };
export type Section = { id: number; start: number; end: number; tier: number; district: string; roofs: Roof[]; hazardX: number; droneLeft: number; droneRight: number };
/** Every seam is a 90–110px gap with <=50px rise, below the full-jump envelope. */
export function sectionAt(id: number): Section {
  const start = id * CHUNK_WIDTH;
  const tier = Math.min(4, Math.floor(id / 2));
  const gap = 90 + tier * 5;
  return { id, start, end: start + CHUNK_WIDTH, tier,
    district: DISTRICTS[Math.floor(id / 2) % DISTRICTS.length],
    roofs: [{ x: start, y: 590, width: 740 }, { x: start + 740 + gap, y: 540, width: 450 },
      { x: start + 1190 + gap * 2, y: 590, width: CHUNK_WIDTH - 1190 - gap * 3 }],
    hazardX: start + 500, droneLeft: start + 1610, droneRight: start + 1770 };
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
  over: boolean; newBest: boolean; saved: boolean; district: string; reason: string;
};
export const emptyRun: RunSnapshot = { score: 0, best: 0, distance: 0, fragments: 0, health: 3, over: false, newBest: false, saved: true, district: DISTRICTS[0], reason: '' };
