import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../Game';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { presentation, TRANSITION_MS } from '../profiles';
import { CHUNK_WIDTH, HIGH_SCORE_KEY, HighScore, sectionAt, type RunSnapshot } from '../run';
import { stateEffectsChecks } from './stateEffectsChecks';
import { encounterChecks } from './encounterChecks';
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
  assert(new Set(Array.from({ length: 8 }, (_, i) => sectionAt(i).district)).size === 4, 'Four distinct named areas');
  const kinds = new Set(Array.from({ length: 8 }, (_, i) => sectionAt(i).hazards).flat().map(h => h.kind));
  assert(kinds.size === 11, 'Eleven authored hazard types across the first circuit');
  assert(sectionAt(7).hazards.length > sectionAt(0).hazards.length, 'Later encounters combine more hazards');

};

async function runState(state: PlayerState) {
  const scene = new EchoScene(() => state);
  const inspect = scene as unknown as Inspect;
  const game = new Phaser.Game({ ...GAME_CONFIG, width: 1280, height: 720, scale: { mode: Phaser.Scale.NONE }, parent: 'test-game', scene: [scene] });
  try {
    await until(() => !!inspect.keys); await sleep(100);
    assert(inspect.target === state, `${state}: starts immediately with canonical state`);
    if (state === 'UNKNOWN') {
      const before = { ...inspect.painted }; scene.setTargetState('CALM');
      assert(equal(before, inspect.painted), 'State assignment does not snap presentation');
      const tween = inspect.transition; scene.setTargetState('CALM');
      assert(tween === inspect.transition, 'Duplicate target retains the existing tween');
      await sleep(230); assert(!equal(before, inspect.painted), 'Rendered profile interpolates over time');
      const mid = { ...inspect.painted }, score = inspect.run.score, x = inspect.player.x;
      const drone = inspect.chunks[0].drone, speed = drone.speed, enemyX = drone.object.x;
      scene.setTargetState('HIGHLY_ENGAGED');
      assert(equal(mid, inspect.painted), 'Retargeting preserves current rendered values');
      assert(inspect.run.score === score && inspect.player.x === x, 'Retargeting preserves score and progress');
      assert(drone.speed === speed && drone.object.x === enemyX, 'No immediate drone acceleration or teleport');
      await sleep(TRANSITION_MS + 100);
      assert(equal(inspect.painted, presentation('HIGHLY_ENGAGED')), 'Transition reaches the requested profile');
      assert(drone.speed > speed, 'Drone speed ramps with the visual transition without waiting for an endpoint');
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
    // Progression geometry is exercised by the dedicated encounter checks below.
    inspect.body.reset(CHUNK_WIDTH * 4 + 140, 566); await sleep(100);
    assert(inspect.chunks.length <= 5 && inspect.chunks[0].spec.id > 0, `${state}: streamed world is bounded`);
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
  for (const state of ['UNKNOWN', 'CALM', 'ENGAGED', 'HIGHLY_ENGAGED'] as PlayerState[]) await runState(state);
  await stateEffectsChecks(assert);
  await encounterChecks(assert);
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  root.render(createElement(Game)); await until(() => host.querySelectorAll('canvas').length === 1);
  assert(!!host.textContent?.includes('Visual preview — manual states'), 'Manual preview is explicitly labelled');
  root.render(createElement(Game, { targetState: 'ENGAGED', signalSource: 'demo' })); await until(() => !!host.textContent?.includes('Demo Mode — simulated metrics'));
  assert(!host.textContent?.includes('Visual preview — manual states'), 'Committed demo state retains simulated labeling without manual override');
  root.render(createElement(Game, { targetState: 'HIGHLY_ENGAGED', signalSource: 'demo' })); await until(() => !!host.textContent?.includes('Highly Engaged'));
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
