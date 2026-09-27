import Phaser from 'phaser';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { CHUNK_WIDTH, sectionAt, type Roof, type RunSnapshot } from '../run';
import { hazardFrame, hazardHits, type HazardSpec, type HazardFrame } from '../levels';

type Deck = { roof: Roof; object: Phaser.GameObjects.Rectangle; touched: number; fallen: number };
type Threat = { spec: HazardSpec; frame: HazardFrame; started: number; spent: boolean };
type Chunk = { spec: ReturnType<typeof sectionAt>; decks: Deck[]; threats: Threat[] };
type Inspect = { body: Phaser.Physics.Arcade.Body; player: Phaser.GameObjects.Rectangle; chunks: Chunk[];
  keys: Record<string, Phaser.Input.Keyboard.Key>; run: RunSnapshot; dashReady: boolean; invulnerableUntil: number;
  updateEncounter: (c: Chunk, t: number, dt: number) => void };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function until(fn: () => boolean, ms = 3000) { const start = performance.now(); while (!fn()) { if (performance.now() - start > ms) throw Error('Physics check timeout'); await sleep(16); } }
const press = (key: Phaser.Input.Keyboard.Key) => key.onDown(new KeyboardEvent('keydown'));
const release = (key: Phaser.Input.Keyboard.Key) => key.onUp(new KeyboardEvent('keyup'));

export async function encounterChecks(assert: (ok: boolean, label: string) => void) {
  for (const kind of ['pulse', 'electric', 'sweepV', 'sweepH', 'turret', 'crusher', 'debris'] as const) {
    const h: HazardSpec = { kind, x: 0, y: 0, width: 30, height: 30, travel: 50 };
    const off = hazardFrame(h, 0, 7), warning = hazardFrame(h, 1400, 7), active = hazardFrame(h, 2000, 7);
    assert(!hazardHits(off, off.x, off.y) && warning.warning && !hazardHits(warning, warning.x, warning.y) && hazardHits(active, active.x, active.y), `${kind}: safe idle, 700ms warning, matching active hitbox`);
  }
  const rotor = hazardFrame({ kind: 'rotor', x: 0, y: 0, width: 100, height: 8 }, 0, 0);
  assert(hazardHits(rotor, 30, 0) && !hazardHits(rotor, 0, 60), 'Rotating barrier uses the bar, not its entire bounding square');
  const scene = new EchoScene(); const i = scene as unknown as Inspect;
  const game = new Phaser.Game({ ...GAME_CONFIG, width: 1280, height: 720, scale: { mode: Phaser.Scale.NONE }, parent: 'test-game', scene: [scene] });
  try {
    await until(() => !!i.keys); await sleep(100);
    // Dash runs through the actual update and Arcade Physics world.
    const x = i.player.x; press(i.keys.X); await sleep(140); release(i.keys.X);
    assert(i.player.x > x + 75, 'Dash produces a fast horizontal burst');
    await sleep(200); assert(i.dashReady, 'Landing recharges dash');
    press(i.keys.SPACE); await sleep(130); press(i.keys.X); await sleep(220); release(i.keys.X);
    assert(!i.dashReady, 'Air dash is consumed until landing or wall kick');
    release(i.keys.SPACE); await sleep(600);

    for (let id = 0; id < 8; id++) {
      scene.restartRun(); i.body.reset(id * CHUNK_WIDTH + 100, 566); await sleep(80);
      const chunk = i.chunks.find(c => c.spec.id === id)!;
      // Isolate geometry from combat; combat is checked independently below.
      i.invulnerableUntil = Number.POSITIVE_INFINITY;
      for (const c of i.chunks) for (const h of c.threats) h.spent = true;
      const path = chunk.decks.filter(d => d.roof.kind !== 'wall' && !(id === 6 && d.roof.y === 260));
      for (let n = 0; n < path.length - 1; n++) {
        const from = path[n], to = path[n + 1];
        if (id === 6 && n === 2) continue; // Wall route has a dedicated kick test.
        for (const key of Object.values(i.keys)) release(key);
        const fb = from.object.body as Phaser.Physics.Arcade.StaticBody;
        fb.enable = true; from.touched = -1; from.fallen = 0;
        i.body.reset(fb.right - 48, fb.top - 23); i.body.setVelocity(0, 0);
        await sleep(65); i.keys.RIGHT.isDown = true; i.body.setVelocityX(310); press(i.keys.SPACE);
        const gap = (to.object.body as Phaser.Physics.Arcade.StaticBody).left - fb.right;
        if (gap > 180) { await sleep(200); press(i.keys.X); }
        let landed = false;
        const started = performance.now();
        while (performance.now() - started < 1600 && !i.run.over) {
          const tb = to.object.body as Phaser.Physics.Arcade.StaticBody;
          if (i.body.velocity.y >= 0 && i.body.bottom >= tb.top - 4 && i.body.bottom <= tb.top + 6 && i.body.right > tb.left && i.body.left < tb.right) { landed = true; break; }
          await sleep(10);
        }
        assert(landed, `Encounter ${id + 1}, jump ${n + 1}: real physics reaches next deck (gap ${Math.round(gap)}, x ${Math.round(i.player.x)}, y ${Math.round(i.player.y)})`);
      }
    }
    scene.restartRun();
    for (const key of Object.values(i.keys)) release(key);
    i.body.reset(CHUNK_WIDTH * 6 + 1000, 387); await sleep(80);
    i.invulnerableUntil = Infinity; i.keys.RIGHT.isDown = true; press(i.keys.SPACE);
    await until(() => i.body.blocked.right && i.body.velocity.y > -280);
    release(i.keys.SPACE); await sleep(20); i.keys.RIGHT.isDown = false; press(i.keys.SPACE); await sleep(50);
    assert(i.body.velocity.x < -200 && i.body.velocity.y < -350, 'Wall jump kicks upward and away from the lab wall');
    await sleep(170); i.body.setVelocityX(0); i.keys.LEFT.isDown = false;
    await until(() => i.body.blocked.down);
    assert(i.player.y < 250, `Wall kick reaches the elevated lab recovery ledge (y ${Math.round(i.player.y)})`);
    release(i.keys.SPACE); await sleep(20);
    i.keys.RIGHT.isDown = true; press(i.keys.SPACE);
    await until(() => i.player.x > CHUNK_WIDTH * 6 + 1098);
    release(i.keys.SPACE); i.keys.RIGHT.isDown = false;
    assert(i.player.y < 245, 'Upper ledge allows vaulting the lab wall');

    scene.restartRun();
    for (const key of Object.values(i.keys)) release(key);
    i.body.reset(CHUNK_WIDTH * 4 + 140, 566); await sleep(100);
    const car = i.chunks.find(c => c.spec.id === 4)!.decks.find(d => d.roof.kind === 'moving')!;
    const cb = car.object.body as Phaser.Physics.Arcade.StaticBody;
    i.body.reset(car.object.x, cb.top - 23); await sleep(120);
    const offset = i.player.x - car.object.x, oldX = car.object.x;
    await sleep(350);
    assert(Math.abs(car.object.x - oldX) > 3 && Math.abs(i.player.x - car.object.x - offset) < 6 && i.body.blocked.down, 'Moving train platform carries the standing player without drift');
    const lift = i.chunks.find(c => c.spec.id === 4)!.decks.find(d => d.roof.vertical)!;
    i.body.reset(lift.object.x, (lift.object.body as Phaser.Physics.Arcade.StaticBody).top - 23);
    await sleep(500);
    assert(Math.abs(i.body.bottom - (lift.object.body as Phaser.Physics.Arcade.StaticBody).top) < 6, 'Vertical train platform keeps the rider on its moving surface');

    scene.restartRun(); i.body.reset(CHUNK_WIDTH * 3 + 100, 566); await sleep(80);
    const reactor = i.chunks.find(c => c.spec.id === 3)!;
    const vanish = reactor.decks.find(d => d.roof.kind === 'vanish')!;
    const falling = reactor.decks.find(d => d.roof.kind === 'falling')!;
    vanish.touched = scene.time.now - 800; falling.touched = scene.time.now - 800;
    await sleep(100);
    assert(!(vanish.object.body as Phaser.Physics.Arcade.StaticBody).enable && falling.fallen > 0, 'Triggered platforms disappear or fall after the visible grace period');
    vanish.touched = scene.time.now - 3600; falling.touched = scene.time.now - 3600; await sleep(40);
    assert((vanish.object.body as Phaser.Physics.Arcade.StaticBody).enable && falling.fallen === 0, 'Collapsing platforms recover for a retry');
    const threat = reactor.threats[0]; threat.started = scene.time.now - 1900;
    i.body.reset(threat.spec.x, threat.spec.y - 20); i.invulnerableUntil = 0;
    const hp = i.run.health; await sleep(80);
    assert(i.run.health === hp - 1, 'Active electric floor removes one health through the scene collision path');
    await sleep(100); assert(i.run.health === hp - 1, 'Invulnerability prevents damage every frame');
    const mine = reactor.threats.find(h => h.spec.kind === 'mine')!;
    const now = scene.time.now;
    i.body.reset(mine.spec.x, mine.spec.y - 10); i.invulnerableUntil = 0;
    i.updateEncounter(reactor, now, 0);
    assert(mine.frame.warning && !mine.frame.active, 'Proximity mine warns before dealing damage');
    const beforeMine = i.run.health;
    i.updateEncounter(reactor, now + 720, 0);
    assert(i.run.health === beforeMine - 1, 'Mine burst damages only after its warning');
    i.updateEncounter(reactor, now + 1100, 0);
    assert(mine.spent, 'Mine is consumed instead of silently rearming');
    scene.restartRun(); assert(i.chunks.every(c => c.threats.every(h => !h.spent && h.started < 0)), 'Restart clears hazard activation and collapse state');
  } finally { game.destroy(true); await sleep(100); }
}
