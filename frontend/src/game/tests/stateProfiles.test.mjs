import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, presentation, biomeColor, normalizeState } from '../profiles.ts';
import { AREAS, encounter, hazardFrame } from '../levels.ts';

test('invalid state inputs fall back to Unknown, with human-readable labels', () => {
  for (const v of [null, undefined, '', 'invalid', 'toString']) assert.equal(normalizeState(v), 'UNKNOWN');
  assert.deepEqual(Object.values(PROFILES).map(p => p.label).sort(), ['Calm', 'Engaged', 'Highly Engaged', 'Unknown']);
});

test('Unknown preserves every biome color and neutral difficulty', () => {
  const p = presentation('UNKNOWN');
  for (const area of AREAS) for (const c of [area.sky, area.floor, area.color]) assert.equal(biomeColor(c, p), c);
  for (const field of ['enemySpeed', 'hazardRate', 'fireRate', 'projectileSpeed', 'collapseRate', 'motionRate']) assert.equal(p[field], 1);
});

test('all biomes retain different palettes while each state changes their treatment', () => {
  for (const state of ['CALM', 'ENGAGED', 'HIGHLY_ENGAGED']) {
    const p = presentation(state);
    assert.equal(new Set(AREAS.map(a => biomeColor(a.sky, p))).size, 4);
    for (const a of AREAS) assert.notEqual(biomeColor(a.color, p), a.color);
  }
});

test('every encounter uses progressively faster state tuning', () => {
  const calm = presentation('CALM'), engaged = presentation('ENGAGED'), high = presentation('HIGHLY_ENGAGED');
  for (let id = 0; id < 8; id++) {
    assert.ok(encounter(id).hazards.length);
    for (const field of ['enemySpeed', 'hazardRate', 'fireRate', 'projectileSpeed', 'collapseRate', 'motionRate', 'glow']) {
      assert.ok(calm[field] < engaged[field] && engaged[field] < high[field], `${id}: ${field}`);
    }
    const h = { kind: 'pulse', x: 0, y: 0, width: 12, height: 100 };
    assert.equal(hazardFrame(h, 1000 * calm.hazardRate, id).warning, false);
    assert.equal(hazardFrame(h, 1000 * high.hazardRate, id).active, true);
  }
});

test('projectile travel is independent from firing-cycle frequency', () => {
  const h = { kind: 'turret', x: 100, y: 0, width: 24, height: 9, travel: -1 };
  const a = hazardFrame(h, 1900, 0, { motionElapsed: 0, projectileElapsed: 100 });
  const b = hazardFrame(h, 2200, 0, { motionElapsed: 0, projectileElapsed: 100 });
  assert.equal(a.x, b.x);
  assert.ok(hazardFrame(h, 1900, 0, { projectileElapsed: 120 }).x < a.x);
});
