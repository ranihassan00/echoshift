import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../Game';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { presentation, TRANSITION_MS } from '../profiles';
import { CHUNK_WIDTH, HIGH_SCORE_KEY, HighScore, sectionAt, type Roof, type RunSnapshot } from '../run';
import type { PlayerState } from '../../shared/contracts';

type DroneView = { object: Phaser.GameObjects.Rectangle; left: number; right: number; speed: number; mode: string; defeated: boolean };
type ChunkView = { spec: ReturnType<typeof sectionAt>; drone: DroneView; fragments: { collected: boolean }[] };
type Inspect = { player: Phaser.GameObjects.Rectangle; body: Phaser.Physics.Arcade.Body; keys: Record<string, Phaser.Input.Keyboard.Key>;
  target: PlayerState; painted: Record<string, number>; transition: Phaser.Tweens.Tween; run: RunSnapshot; chunks: ChunkView[]; bonus: number; farthest: number; ledger: HighScore };
const output = document.querySelector('#results')!;
const results: string[] = [];
const assert = (ok: boolean, label: string) => { if (!ok) throw new Error(label); results.push(`PASS ${label}`); output.textContent = results.join('\n'); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function until(predicate: () => boolean, limit = 30000) { const start = performance.now(); while (!predicate()) { if (performance.now() - start > limit) throw new Error('Timed out'); await sleep(16); } }
const equal = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < .01);
const storageTest = () => {
  const map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const score = new HighScore(storage); score.record(1200); score.record(30);
  assert(new HighScore(storage).value === 1200, 'High score survives fresh store instance and cannot decrease');
  for (const invalid of ['NaN', '-2', '{}', '1.2', 'Infinity', '9007199254740992']) { map.set(HIGH_SCORE_KEY, invalid); assert(new HighScore(storage).value === 0, `Malformed score ${invalid} uses zero`); }
  const broken = new HighScore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } });
  broken.record(100); assert(broken.value === 100 && !broken.saved, 'Storage failures preserve playable in-memory high score');
  for (let id = 0; id < 100; id++) {
    const chunk = sectionAt(id), all = [...chunk.roofs, sectionAt(id + 1).roofs[0]];
    for (let i = 0; i < all.length - 1; i++) {
      const gap = all[i + 1].x - all[i].x - all[i].width;
      if (gap > 110 || gap < 90 || all[i].y - all[i + 1].y > 50) throw Error('Unreachable seam');
    }
  }
  assert(true, '100 generated sections respect capped gap/rise envelope, including seams');
};

async function runState(state: PlayerState, startingSection = 0) {
  const scene = new EchoScene(() => state);
  const inspect = scene as unknown as Inspect;
  const game = new Phaser.Game({ ...GAME_CONFIG, width: 1280, height: 720, scale: { mode: Phaser.Scale.NONE }, parent: 'test-game', scene: [scene] });
  try {
    await until(() => !!inspect.keys); await sleep(100);
    if (startingSection) { inspect.body.reset(startingSection * CHUNK_WIDTH + 140, 566); await sleep(100); }
    assert(inspect.target === state, `${state}: starts immediately with canonical state`);
    if (state === 'UNKNOWN') {
      const before = { ...inspect.painted }; scene.setTargetState('CALM');
      assert(equal(before, inspect.painted), 'State assignment does not snap presentation');
      const tween = inspect.transition; scene.setTargetState('CALM');
      assert(tween === inspect.transition, 'Duplicate target retains the existing tween');
      await sleep(230); assert(!equal(before, inspect.painted), 'Rendered profile interpolates over time');
      const mid = { ...inspect.painted }, score = inspect.run.score, x = inspect.player.x;
      const drone = inspect.chunks[0].drone, speed = drone.speed, enemyX = drone.object.x;
      scene.setTargetState('HIGH_AROUSAL');
      assert(equal(mid, inspect.painted), 'Retargeting preserves current rendered values');
      assert(inspect.run.score === score && inspect.player.x === x, 'Retargeting preserves score and progress');
      assert(drone.speed === speed && drone.object.x === enemyX, 'No immediate drone acceleration or teleport');
      await sleep(TRANSITION_MS + 100);
      assert(equal(inspect.painted, presentation('HIGH_AROUSAL')), 'Transition reaches the requested profile');
      await until(() => drone.speed > speed, 10000); assert(true, 'Drone adopts new speed at endpoint');
      scene.setTargetState('UNKNOWN'); await sleep(TRANSITION_MS + 100);
      assert(equal(inspect.painted, presentation('UNKNOWN')), 'UNKNOWN returns to neutral presentation');
      const jumpHeight = async (hold: number) => {
        await until(() => inspect.body.blocked.down);
        const startY = inspect.player.y; let top = startY;
        const sample = () => { top = Math.min(top, inspect.player.y); };
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sample);
        inspect.keys.SPACE.onDown(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
        await sleep(hold);
        inspect.keys.SPACE.onUp(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
        await sleep(600); await until(() => inspect.body.blocked.down);
        scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sample);
        return startY - top;
      };
      const short = await jumpHeight(80), full = await jumpHeight(450);
      assert(full > short + 25, 'Holding jump provides measurably more height than tapping');
    }
    let held = false;
    const pilot = () => {
      inspect.keys.RIGHT.isDown = true;
      const x = inspect.player.x;
      const chunk = inspect.chunks.find(c => x >= c.spec.start && x < c.spec.end);
      const roofs: Roof[] = inspect.chunks.flatMap(c => c.spec.roofs);
      const roof = roofs.find(p => x >= p.x && x <= p.x + p.width);
      const edge = !!roof && x > roof.x + roof.width - 65;
      const hazard = chunk ? chunk.spec.hazardX - x : Infinity;
      const drones = inspect.chunks.some(c => !c.drone.defeated && c.drone.object.x - x > -5 && c.drone.object.x - x < 115);
      const jump = inspect.body.blocked.down && (edge || (hazard > 0 && hazard < 115) || drones);
      if (jump && !held) { inspect.keys.SPACE.onDown(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })); held = true; }
      else if (held && inspect.body.velocity.y >= 0) { inspect.keys.SPACE.onUp(new KeyboardEvent('keyup', { code: 'Space', key: ' ' })); held = false; }
    };
    scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, pilot);
    await until(() => inspect.farthest > CHUNK_WIDTH * (startingSection + 3) + 150 || inspect.run.over, 40000);
    scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, pilot); inspect.keys.RIGHT.isDown = false;
    assert(!inspect.run.over, `${state}: three continuous sections remain playable (${inspect.run.reason}; x=${Math.round(inspect.player.x)}, y=${Math.round(inspect.player.y)}, health=${inspect.run.health})`);
    assert(inspect.run.health === 3, `${state}: curated route avoids all damage`);
    assert(inspect.run.score > inspect.run.distance && inspect.run.fragments > 0, `${state}: distance, fragments and cleared sections award score`);
    assert(inspect.chunks.length <= 5 && inspect.chunks[0].spec.id > 0, `${state}: old sections recycled with bounded active world`);
    const retainedScore = inspect.run.score, retainedX = inspect.player.x;
    scene.setTargetState(state === 'CALM' ? 'ENGAGED' : 'CALM');
    assert(inspect.run.score === retainedScore && inspect.player.x === retainedX, 'Earned score and distance survive a committed state change');
    const best = inspect.run.best;
    inspect.body.reset(inspect.player.x, 850); await until(() => inspect.run.over);
    assert(inspect.run.score <= inspect.run.best && inspect.run.reason.length > 0, `${state}: fatal fall freezes final score`);
    const final = inspect.run.score; await sleep(200); assert(inspect.run.score === final, `${state}: no score farming after game over`);
    scene.restartRun(); await sleep(60);
    assert(!inspect.run.over && inspect.run.score === 0 && inspect.run.best === best, `${state}: restart resets run and retains high score`);
    const count = inspect.run.score; await sleep(200);
    assert(inspect.run.score === count, `${state}: standing still cannot farm score`);
  } finally { game.destroy(true); await until(() => document.querySelectorAll('canvas').length === 0); }
  assert(true, `${state}: Phaser resources cleanly destroyed`);
}

let previousScore: string | null = null;
try {
  previousScore = localStorage.getItem(HIGH_SCORE_KEY); localStorage.removeItem(HIGH_SCORE_KEY);
  storageTest();
  for (const state of ['UNKNOWN', 'CALM', 'ENGAGED', 'HIGH_AROUSAL'] as PlayerState[]) await runState(state);
  await runState('HIGH_AROUSAL', 8);
  assert(true, 'Three sections at capped difficulty remain traversable without damage');
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  root.render(createElement(Game)); await until(() => host.querySelectorAll('canvas').length === 1);
  assert(!!host.textContent?.includes('DEMO MODE · SIMULATED'), 'Demo source is explicitly labelled');
  root.render(createElement(Game, { targetState: 'ENGAGED' })); await until(() => !!host.textContent?.includes('COMMITTED SIGNAL'));
  assert(!host.textContent?.includes('SIMULATED'), 'Committed state disables simulated source');
  root.render(createElement(Game, { targetState: 'HIGH_AROUSAL' })); await until(() => !!host.textContent?.includes('HIGH_AROUSAL'));
  assert(host.querySelectorAll('canvas').length === 1, 'Prop updates preserve one game instance');
  host.querySelector<HTMLElement>('[role=application]')!.focus();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', keyCode: 68, which: 68, bubbles: true }));
  await until(() => !!host.querySelector('[role=dialog]'), 15000);
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', code: 'KeyD', keyCode: 68, which: 68, bubbles: true }));
  assert(!!host.textContent?.includes('FINAL SCORE'), 'Real React game-over overlay displays final stats');
  host.querySelector<HTMLButtonElement>('.restart-button')!.click();
  await until(() => !host.querySelector('[role=dialog]'));
  assert(host.querySelectorAll('canvas').length === 1, 'Restart button resets run without reloading the page');
  root.unmount(); await sleep(100); assert(document.querySelectorAll('canvas').length === 0, 'React unmount cleans Phaser'); host.remove();
  output.textContent = `${results.join('\n')}\nALL CHECKS PASSED`;
} catch (error) { output.textContent = `${results.join('\n')}\nFAIL ${String(error)}`; }
finally { try { if (previousScore === null) localStorage.removeItem(HIGH_SCORE_KEY); else localStorage.setItem(HIGH_SCORE_KEY, previousScore); } catch { /* Test storage can be denied. */ } }
