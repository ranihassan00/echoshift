import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Game from '../Game';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { LEVEL, PROFILES, TRANSITION_MS } from '../profiles';
import type { PlayerState } from '../../shared/contracts';

type Inspect = {
  player: Phaser.GameObjects.Rectangle;
  enemy: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  keys: Record<string, Phaser.Input.Keyboard.Key>;
  restartRun: () => void; won: boolean; attempts: number; target: PlayerState; patrolSpeed: number;
  painted: Record<string, number>; transition: Phaser.Tweens.Tween;
};
const output = document.querySelector('#results')!;
const results: string[] = [];
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); results.push(`PASS ${message}`); output.textContent = results.join('\n'); };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const waitFor = async (predicate: () => boolean, limit = 20000) => {
  const start = performance.now();
  while (!predicate()) { if (performance.now() - start > limit) throw new Error('Timed out'); await sleep(16); }
};
const equal = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 0.001);
async function check(state: PlayerState) {
  const scene = new EchoScene(() => state);
  const inspect = scene as unknown as Inspect;
  const game = new Phaser.Game({ ...GAME_CONFIG, parent: 'test-game', scene: [scene], audio: { noAudio: true } });
  await waitFor(() => !!inspect.keys);
  await sleep(100);
  assert(inspect.target === state, `${state}: canonical initial target`);
  if (state === 'UNKNOWN') {
    const original = { ...inspect.painted };
    scene.setTargetState('CALM');
    assert(equal(original, inspect.painted), 'No immediate presentation snap');
    const tween = inspect.transition;
    scene.setTargetState('CALM');
    assert(inspect.transition === tween, 'Repeated target preserves tween');
    await sleep(250);
    assert(!equal(original, inspect.painted), 'Tween advances rendered values');
    const midway = { ...inspect.painted };
    const position = inspect.player.x;
    const speed = inspect.patrolSpeed;
    scene.setTargetState('HIGH_AROUSAL');
    assert(equal(midway, inspect.painted), 'Interrupted tween starts from current rendering');
    assert(inspect.player.x === position, 'State change preserves player progress');
    assert(inspect.patrolSpeed === speed, 'Patrol speed does not change mid-segment');
    await sleep(TRANSITION_MS + 150);
    assert(Math.abs(inspect.painted.activity - PROFILES.HIGH_AROUSAL.activity) < 0.01, 'Tween reaches new target');
    await waitFor(() => inspect.patrolSpeed === PROFILES.HIGH_AROUSAL.speed, 10000);
    assert(true, 'Queued patrol speed commits at endpoint');
    scene.setTargetState('UNKNOWN');
    await sleep(TRANSITION_MS + 100);
    assert(Math.abs(inspect.painted.activity - PROFILES.UNKNOWN.activity) < 0.01, 'UNKNOWN restores neutral fallback');
  }
  // Drive actual Phaser keys and Arcade collision, without moving bodies or skipping geometry.
  let jumpHeld = false;
  let failure = '';
  const restart = inspect.restartRun.bind(scene);
  inspect.restartRun = () => { failure = 'x=' + inspect.player.x + ' y=' + inspect.player.y + ' drone=' + inspect.enemy.x; restart(); };
  const pilot = () => {
    inspect.keys.RIGHT.isDown = true;
    const x = inspect.player.x;
    const slab = LEVEL.find(p => x >= p.x && x <= p.x + p.width);
    const edge = slab && slab !== LEVEL[LEVEL.length - 1] && x > slab.x + slab.width - 67;
    const drone = inspect.enemy.x - x;
    const obstacle = drone > -5 && drone < 105;
    const jump = inspect.body.blocked.down && !!(edge || obstacle);
    if (jump && !jumpHeld) inspect.keys.SPACE.onDown(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
    else inspect.keys.SPACE.onUp(new KeyboardEvent('keyup', { key: ' ', code: 'Space' }));
    jumpHeld = jump;
  };
  scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, pilot);
  await waitFor(() => inspect.won || !!failure, 30000);
  if (failure) throw new Error(state + ': ' + failure);
  scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, pilot);
  inspect.keys.RIGHT.isDown = false;
  assert(inspect.won && inspect.attempts === 0, `${state}: complete route with real collisions, jumps and drone, zero failures`);
  inspect.keys.R.onDown(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR' }));
  await waitFor(() => !inspect.won);
  assert(inspect.player.x < 100, `${state}: replay resets to safe spawn`);
  const retries = inspect.attempts;
  inspect.body.reset(370, 620);
  await waitFor(() => inspect.attempts > retries);
  assert(inspect.player.x < 100, `${state}: falling restarts at safe spawn`);
  game.destroy(true);
  await waitFor(() => document.querySelectorAll('canvas').length === 0);
  assert(true, `${state}: Phaser canvas destroyed cleanly`);
}
try {
  for (const state of ['UNKNOWN', 'CALM', 'ENGAGED', 'HIGH_AROUSAL'] as PlayerState[]) await check(state);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  root.render(createElement(Game));
  await waitFor(() => host.querySelectorAll('canvas').length === 1);
  assert(!!host.textContent?.includes('DEMO MODE · SIMULATED'), 'Manual source is visibly simulated');
  root.render(createElement(Game, { targetState: 'ENGAGED' }));
  await waitFor(() => !!host.textContent?.includes('Target: ENGAGED'));
  assert(!host.textContent?.includes('SIMULATED'), 'Committed prop hides demo source controls');
  root.render(createElement(Game, { targetState: 'HIGH_AROUSAL' }));
  await waitFor(() => !!host.textContent?.includes('Target: HIGH_AROUSAL'));
  assert(host.querySelectorAll('canvas').length === 1, 'Prop updates retain one Phaser instance');
  root.unmount();
  await sleep(100);
  assert(document.querySelectorAll('canvas').length === 0, 'React unmount destroys Phaser resources');
  host.remove();
  output.textContent = `${results.join('\n')}\nALL CHECKS PASSED`;
} catch (error) { output.textContent = `${results.join('\n')}\nFAIL ${String(error)}`; }
