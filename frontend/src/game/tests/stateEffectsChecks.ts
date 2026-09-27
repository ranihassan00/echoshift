import Phaser from 'phaser';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { presentation, TRANSITION_MS, type Presentation } from '../profiles';
import type { PlayerState } from '../../shared/contracts';
import type { HazardFrame, HazardSpec } from '../levels';
import { CHUNK_WIDTH, type Section, type Roof } from '../run';

type Threat = { spec: HazardSpec; started: number; elapsed: number; cycle: number; motion: number; shot: number; frame: HazardFrame; spent: boolean };
type Deck = { roof: Roof; object: Phaser.GameObjects.Rectangle; touched: number; fallen: number; elapsed: number; exposure: number };
type Chunk = { spec: Section; threats: Threat[]; decks: Deck[] };
type Inspect = { keys: object; painted: Presentation; body: Phaser.Physics.Arcade.Body; chunks: Chunk[]; invulnerableUntil: number; updateEncounter(c: Chunk, time: number, dt: number): void };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function stateEffectsChecks(assert: (ok: boolean, label: string) => void) {
  const scene = new EchoScene();
  const i = scene as unknown as Inspect;
  const game = new Phaser.Game({ ...GAME_CONFIG, width: 1280, height: 720, scale: { mode: Phaser.Scale.NONE }, parent: 'test-game', scene: [scene] });
  try {
    const started = performance.now();
    while (!i.keys) { if (performance.now() - started > 5000) throw Error('State effects scene startup timeout'); await sleep(20); }
    for (let id = 0; id < 8; id++) {
      scene.restartRun(); i.invulnerableUntil = Infinity;
      i.body.reset(id * CHUNK_WIDTH + 100, 566); await sleep(80);
      const chunk = i.chunks.find(c => c.spec.id === id)!;
      // Freeze the scene and drive its real encounter update deterministically.
      scene.scene.pause();
      const cycles: number[] = [], exposures: number[] = [];
      for (const state of ['CALM', 'UNKNOWN', 'ENGAGED', 'HIGHLY_ENGAGED'] as PlayerState[]) {
        Object.assign(i.painted, presentation(state));
        for (const h of chunk.threats) {
          h.started = 0; h.elapsed = 0; h.cycle = 0; h.motion = 0; h.shot = 0; h.spent = false;
        }
        for (const d of chunk.decks) {
          d.touched = 0; d.elapsed = 0; d.exposure = 0; d.fallen = 0;
          (d.object.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        }
        i.updateEncounter(chunk, 400, .04);
        cycles.push(chunk.threats[0].cycle);
        const collapsing = chunk.decks.find(d => d.roof.kind === 'falling' || d.roof.kind === 'vanish');
        if (collapsing) {
          exposures.push(collapsing.exposure);
          assert(state === 'HIGHLY_ENGAGED' ? collapsing.exposure > 650 : collapsing.exposure < 650, `Encounter ${id + 1}: ${state} uses appropriate collapse warning`);
        }
        for (const h of chunk.threats) assert(h.motion > 0 && Number.isFinite(h.frame.x), `Encounter ${id + 1}: ${state} advances ${h.spec.kind} continuously`);
      }
      assert(cycles.every((value, n) => !n || value > cycles[n - 1]), `Encounter ${id + 1}: Calm < Unknown < Engaged < Highly Engaged timing`);
      if (exposures.length) assert(exposures.every((value, n) => !n || value > exposures[n - 1]), `Encounter ${id + 1}: platform warning duration follows state`);
      scene.scene.resume();
    }
    scene.restartRun(); i.invulnerableUntil = Infinity;
    // Retarget from real rendered values and verify visual + difficulty endpoints together.
    scene.setTargetState('CALM'); await sleep(TRANSITION_MS + 100);
    scene.setTargetState('HIGHLY_ENGAGED'); await sleep(250);
    assert(i.painted.enemySpeed > .55 && i.painted.enemySpeed < 1.8 && i.painted.glow > .55 && i.painted.glow < 2, 'Visual and difficulty values ramp together during the 800ms transition');
    await sleep(TRANSITION_MS);
    assert(Math.abs(i.painted.enemySpeed - 1.8) < .01 && Math.abs(i.painted.glow - 2) < .01, 'Visual and difficulty values reach the same transition endpoint');
    scene.setTargetState('invalid' as PlayerState); await sleep(TRANSITION_MS + 100);
    assert(i.painted.grade === 0 && i.painted.hazardRate === 1, 'Invalid runtime classification returns to neutral Unknown');
  } finally { game.destroy(true); await sleep(100); }
}
