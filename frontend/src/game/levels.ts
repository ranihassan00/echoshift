/** Authored encounters: each pair teaches a mechanic, then combines it. */
export const AREAS = [
  { name: 'RAINLINE ROOFTOPS', color: 0x7dbdff, sky: 0x08152e, floor: 0x233b59, hint: 'Amber lines warn. Cross when the beam is dark.', mechanic: 'PULSE LASERS / AIR PATROLS' },
  { name: 'REACTOR GARDEN', color: 0x68ffc3, sky: 0x052b24, floor: 0x225247, hint: 'Green floors bite. Cracked platforms collapse — keep moving.', mechanic: 'ELECTRIC FLOORS / COLLAPSING DECKS' },
  { name: 'NEON TRANSIT', color: 0xe4a1ff, sky: 0x221136, floor: 0x48305f, hint: 'Ride the cars. Jump, then Shift or X to dash across wide gaps.', mechanic: 'MOVING CARS / DASH GAPS' },
  { name: 'ABANDONED LAB', color: 0xff8f9d, sky: 0x290d1c, floor: 0x533044, hint: 'Jump against a wall, then jump again to kick up. Watch warning marks.', mechanic: 'WALL CLIMBS / COMBINED TRAPS' },
] as const;
export type PlatformKind = 'solid' | 'moving' | 'falling' | 'vanish' | 'wall';
export type Deck = { x: number; y: number; width: number; height?: number; kind?: PlatformKind; travel?: number; vertical?: boolean };
export type HazardKind = 'pulse' | 'sweepV' | 'sweepH' | 'electric' | 'turret' | 'flyer' | 'ground' | 'rotor' | 'crusher' | 'debris' | 'mine';
export type HazardSpec = { kind: HazardKind; x: number; y: number; width: number; height: number; travel?: number; phase?: number };
export const areaAt = (id: number) => Math.floor(id / 2) % 4;
export function encounter(id: number): { decks: Deck[]; hazards: HazardSpec[]; hint: string } {
  const n = id % 8, lap = Math.min(3, Math.floor(id / 8));
  const decks: Deck[] = [];
  const hazards: HazardSpec[] = [];
  const deck = (x: number, y: number, width: number, kind: PlatformKind = 'solid', travel = 0, vertical = false, height = 28) => decks.push({ x, y, width, kind, travel, vertical, height });
  const hazard = (kind: HazardKind, x: number, y: number, width: number, height: number, travel = 0) => hazards.push({ kind, x, y, width, height, travel });
  if (n < 2) {
    deck(0, 590, 740); deck(840, 540, 450); deck(1390, 590, 670);
    hazard('pulse', 500, 535, 12, 110);
    if (n === 1) { hazard('flyer', 1110, 445, 38, 26, 100); hazard('mine', 1880, 580, 28, 16); }
  } else if (n < 4) {
    deck(0, 590, 620); deck(720, 510, 220, n === 3 ? 'vanish' : 'solid');
    deck(1040, 450, 220, n === 3 ? 'falling' : 'solid'); deck(1360, 530, 260); deck(1720, 590, 340);
    hazard('electric', 380, 584, 130, 12); hazard('sweepV', 1480, 460, 100, 10, 65);
    if (n === 3) { hazard('crusher', 1890, 440, 64, 90, 100); hazard('mine', 1130, 440, 24, 16); }
  } else if (n < 6) {
    deck(0, 590, 520); deck(640, 530, 200, 'moving', 85); deck(990, 490, 210, 'moving', 45, true);
    deck(1350, 540, n === 4 ? 710 : 250);
    if (n === 5) deck(1880, 590, 180);
    hazard('turret', 1460, 510, 26, 30, -1);
    if (n === 5) { hazard('sweepH', 330, 485, 10, 100, 75); hazard('flyer', 1980, 480, 36, 26, 50); }
  } else if (n === 6) {
    deck(0, 590, 430); deck(510, 500, 220); deck(810, 410, 230);
    deck(1040, 245, 55, 'wall', 0, false, 220); // Kick off, land on the recovery ledge, then vault the wall.
    deck(870, 260, 110); deck(1180, 330, 210); deck(1490, 430, 230); deck(1820, 590, 240);
    hazard('debris', 610, 200, 34, 34, 270); hazard('mine', 1550, 420, 26, 16);
    hazard('ground', 1930, 571, 40, 24, 75);
  } else {
    deck(0, 590, 450); deck(550, 510, 180, 'falling'); deck(840, 440, 180, 'vanish');
    deck(1130, 500, 180, 'falling'); deck(1580, 530, 200); deck(1870, 590, 190);
    hazard('rotor', 920, 355, 100, 10); hazard('turret', 1700, 500, 26, 30, -1);
    hazard('debris', 1960, 250, 34, 34, 305); hazard('ground', 280, 571, 36, 24, 70);
  }
  // Subsequent circuits combine known hazards; speed and timings remain capped.
  if (lap > 0) hazard('flyer', 250, 455, 36, 26, 90);
  if (lap > 1) hazard('pulse', 1980, 530, 12, 100);
  return { decks, hazards, hint: AREAS[areaAt(id)].hint };
}

export type HazardFrame = { x: number; y: number; width: number; height: number; active: boolean; warning: boolean; angle?: number };
/** One source of truth for the rendered shape and its collision; no invisible damage. */
export function hazardFrame(h: HazardSpec, elapsed: number, tier: number, clocks: { motionElapsed?: number; projectileElapsed?: number } = {}): HazardFrame {
  const cycle = Math.max(2400, 3600 - tier * 150), t = ((elapsed + (h.phase ?? 0)) % cycle + cycle) % cycle;
  const motion = clocks.motionElapsed ?? elapsed;
  const warning = t >= 1100 && t < 1800;
  const active = t >= 1800 && t < 2400;
  const f: HazardFrame = { ...h, active, warning };
  if (h.kind === 'sweepV' || h.kind === 'sweepH') {
    const offset = Math.sin(motion / 850) * (h.travel ?? 60);
    if (h.kind === 'sweepV') f.y += offset; else f.x += offset;
  }
  if (h.kind === 'flyer' || h.kind === 'ground') {
    f.x += Math.sin(motion / (h.kind === 'ground' ? 400 : 1000)) * (h.travel ?? 80);
    if (h.kind === 'flyer') f.y += Math.sin(motion / 700) * 20;
    f.active = true; f.warning = false;
  }
  if (h.kind === 'turret') {
    f.x += (h.travel ?? -1) * (25 + (clocks.projectileElapsed ?? Math.max(0, t - 1800)) * .65);
    f.width = 24; f.height = 9;
  }
  if (h.kind === 'crusher') { f.y += active ? Math.min(1, (t - 1800) / 130) * (h.travel ?? 100) : 0; }
  if (h.kind === 'debris') { f.y += active ? Math.min(h.travel ?? 300, (t - 1800) * .8) : 0; }
  if (h.kind === 'rotor') { f.angle = motion / 1000; f.active = true; f.warning = false; }
  return f;
}
export function hazardHits(f: HazardFrame, x: number, y: number, halfW = 12.5, halfH = 22) {
  if (!f.active) return false;
  if (f.angle !== undefined) {
    // Sample the bar segment against the player's expanded box, rather than its broad AABB.
    for (let d = -f.width / 2; d <= f.width / 2; d += 4) if (Math.abs(f.x + Math.cos(f.angle) * d - x) < halfW + 4 && Math.abs(f.y + Math.sin(f.angle) * d - y) < halfH + 4) return true;
    return false;
  }
  return Math.abs(f.x - x) < f.width / 2 + halfW && Math.abs(f.y - y) < f.height / 2 + halfH;
}
