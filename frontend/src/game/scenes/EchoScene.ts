import Phaser from 'phaser';
import type { PlayerState } from '../../shared/contracts';
import City from '../City';
import { color, presentation, PROFILES, TRANSITION_MS } from '../profiles';
import { CHUNK_WIDTH, emptyRun, HighScore, MOVEMENT, patrolSpeed, SCORE, sectionAt, type Roof, type RunSnapshot, type Section } from '../run';

type Drone = { object: Phaser.GameObjects.Rectangle; left: number; right: number; direction: number; speed: number; tier: number; mode: 'patrol' | 'warn' | 'attack' | 'recover'; until: number; awarded: boolean; defeated: boolean };
type Fragment = { x: number; y: number; collected: boolean };
type Chunk = { spec: Section; bodies: Phaser.GameObjects.Rectangle[]; fragments: Fragment[]; drone: Drone; awarded: boolean };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; tint: number };

export default class EchoScene extends Phaser.Scene {
  private target: PlayerState = 'UNKNOWN';
  private painted = presentation('UNKNOWN');
  private transition?: Phaser.Tweens.Tween;
  private player!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private roofs!: Phaser.Physics.Arcade.StaticGroup;
  private chunks: Chunk[] = [];
  private worldArt!: Phaser.GameObjects.Graphics;
  private actorArt!: Phaser.GameObjects.Graphics;
  private city!: City;
  private ledger = new HighScore();
  private run: RunSnapshot = { ...emptyRun };
  private bestAtStart = 0;
  private bonus = 0;
  private farthest = 140;
  private leftEdge = 0;
  private groundedAt = -1000;
  private bufferedAt = -1000;
  private jumping = false;
  private wasGrounded = false;
  private jumpCut = false;
  private facing = 1;
  private invulnerableUntil = 0;
  private ready = false;
  private reduced = false;
  private userReduced = false;
  private publishAt = 0;
  private sparks: Spark[] = [];
  private stride = 0;
  private ambientPhase = 0;
  private landing = 0;
  private lastAccent = '';
  constructor(private initialState: () => PlayerState = () => 'UNKNOWN', private onRun: (run: RunSnapshot) => void = () => {}, private onAccent: (accent: string) => void = () => {}) { super('EchoScene'); }

  setTargetState(state: PlayerState) {
    if (!this.ready || this.target === state) return;
    this.target = state;
    this.transition?.stop();
    this.transition = this.tweens.add({ targets: this.painted, ...presentation(state), duration: TRANSITION_MS, ease: 'Sine.easeInOut' });
  }
  setReducedMotion(value: boolean) { this.userReduced = value; }

  create() {
    this.target = this.initialState();
    this.painted = presentation(this.target);
    this.city = new City(this);
    this.worldArt = this.add.graphics().setDepth(0);
    this.actorArt = this.add.graphics().setDepth(5);
    this.roofs = this.physics.add.staticGroup();
    this.player = this.add.rectangle(140, 566, 25, 44, 0xffffff, 0);
    this.physics.add.existing(this.player);
    this.body = this.player.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(MOVEMENT.speed, 850).setDragX(MOVEMENT.brake);
    this.physics.add.collider(this.player, this.roofs);
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,A,D,SPACE,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.removeCapture(['SPACE', 'UP', 'LEFT', 'RIGHT']);
    const preventScroll = (event: KeyboardEvent) => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && !/BUTTON|INPUT|SELECT|TEXTAREA/.test(focused.tagName) && ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    };
    window.addEventListener('keydown', preventScroll);
    this.input.on('pointerdown', () => this.game.canvas.parentElement?.focus());
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { this.reduced = media.matches; };
    media.addEventListener('change', motionChanged); motionChanged();
    const resize = () => { this.cameras.main.setOrigin(0, 0).setZoom(this.scale.height / 720); };
    this.scale.on('resize', resize); resize();
    this.ready = true;
    this.restartRun();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false; this.transition?.stop();
      window.removeEventListener('keydown', preventScroll);
      media.removeEventListener('change', motionChanged);
      this.scale.off('resize', resize);
      this.city.destroy();
    });
  }

  restartRun() {
    if (!this.ready) return;
    for (const chunk of this.chunks) this.removeChunk(chunk);
    this.chunks = []; this.sparks = []; this.bonus = 0; this.farthest = 140; this.leftEdge = 0;
    this.bestAtStart = this.ledger.value;
    this.run = { ...emptyRun, best: this.ledger.value, saved: this.ledger.saved };
    this.body.enable = true; this.body.reset(140, 566); this.body.setVelocity(0, 0).setAcceleration(0, 0);
    this.groundedAt = -1000; this.bufferedAt = -1000; this.jumping = false; this.jumpCut = false;
    this.invulnerableUntil = this.time.now + 700; this.publishAt = 0;
    this.cameras.main.setScroll(0, 0);
    for (let id = 0; id < 3; id++) this.addChunk(id);
    this.publish();
  }

  private addChunk(id: number) {
    const spec = sectionAt(id);
    const bodies = spec.roofs.map(p => {
      const object = this.add.rectangle(p.x + p.width / 2, p.y + 25, p.width, 50, 0xffffff, 0);
      this.roofs.add(object); return object;
    });
    const object = this.add.rectangle(spec.droneLeft + 60, 566, 40, 28, 0xffffff, 0);
    this.physics.add.existing(object);
    (object.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setImmovable(true);
    const fragments: Fragment[] = [];
    spec.roofs.forEach((roof, index) => {
      for (let n = 0; n < 3; n++) fragments.push({ x: roof.x + 175 + n * 40, y: roof.y - 48 - Math.sin(n / 2 * Math.PI) * 15, collected: false });
      if (index === 1) fragments.push({ x: roof.x + 350, y: roof.y - 120, collected: false });
    });
    this.chunks.push({ spec, bodies, fragments, awarded: false, drone: { object, left: spec.droneLeft, right: spec.droneRight, direction: 1, speed: patrolSpeed(spec.tier, PROFILES[this.target].speed), tier: spec.tier, mode: 'patrol', until: 0, awarded: false, defeated: false } });
  }
  private removeChunk(chunk: Chunk) {
    for (const object of chunk.bodies) { this.roofs.remove(object, true, true); }
    chunk.drone.object.destroy();
  }
  private publish() { this.onRun({ ...this.run }); }
  private finish(reason: string) {
    if (this.run.over) return;
    this.run.over = true; this.run.reason = reason;
    this.body.setVelocity(0, 0).setAcceleration(0, 0); this.body.enable = false;
    this.publish();
  }
  private damage(time: number) {
    if (time < this.invulnerableUntil || this.run.over) return;
    this.run.health--; this.invulnerableUntil = time + 1500;
    this.burst(this.player.x, this.player.y, 0xff879f, 12);
    if (!this.reduced && !this.userReduced) this.cameras.main.shake(100, .002);
    if (this.run.health <= 0) this.finish('Suit energy depleted');
    this.publish();
  }
  private burst(x: number, y: number, tint: number, amount: number) {
    if (this.reduced || this.userReduced) amount = Math.min(3, amount);
    for (let i = 0; i < amount && this.sparks.length < 60; i++) {
      const angle = i * 2.4;
      this.sparks.push({ x, y, vx: Math.cos(angle) * (45 + i * 5), vy: -40 - Math.abs(Math.sin(angle)) * 100, life: .4 + i % 3 * .1, tint });
    }
  }

  update(time: number, delta: number) {
    if (!this.ready) return;
    const dt = Math.min(delta, 40) / 1000;
    const active = document.activeElement;
    const typing = active instanceof HTMLElement && /BUTTON|INPUT|SELECT|TEXTAREA/.test(active.tagName);
    const justJump = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.UP);
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) && !(active instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(active.tagName))) this.restartRun();
    if (!this.run.over) {
      const axis = typing ? 0 : Number(this.keys.RIGHT.isDown || this.keys.D.isDown) - Number(this.keys.LEFT.isDown || this.keys.A.isDown);
      this.body.setAccelerationX(axis * MOVEMENT.acceleration);
      if (axis) this.facing = axis;
      const grounded = this.body.blocked.down;
      if (grounded) {
        this.groundedAt = time; this.jumping = false;
        if (!this.wasGrounded) { this.landing = 1; this.burst(this.player.x, this.player.y + 20, 0x90c7db, 7); }
      }
      this.wasGrounded = grounded;
      if (justJump && !typing) this.bufferedAt = time;
      if (time - this.bufferedAt < MOVEMENT.buffer && time - this.groundedAt < MOVEMENT.coyote && !this.jumping) {
        this.body.setVelocityY(-MOVEMENT.jump); this.jumping = true; this.jumpCut = false;
        this.groundedAt = -1000; this.bufferedAt = -1000;
      }
      const holdingJump = this.keys.SPACE.isDown || this.keys.UP.isDown;
      if (!holdingJump && this.body.velocity.y < -220 && this.jumping && !this.jumpCut) {
        this.body.setVelocityY(this.body.velocity.y * .52); this.jumpCut = true;
      }
      if (this.player.x < this.leftEdge + 16) { this.body.x = this.leftEdge + 3; this.body.setVelocityX(Math.max(0, this.body.velocity.x)); }
      this.farthest = Math.max(this.farthest, this.player.x);
      const currentId = Math.floor(this.farthest / CHUNK_WIDTH);
      while (this.chunks[this.chunks.length - 1].spec.id < currentId + 2) this.addChunk(this.chunks[this.chunks.length - 1].spec.id + 1);
      while (this.chunks.length > 4 && this.chunks[0].spec.end < this.player.x - CHUNK_WIDTH) {
        const old = this.chunks.shift()!; this.leftEdge = old.spec.end; this.removeChunk(old);
      }
      for (const chunk of this.chunks) {
        if (!chunk.awarded && this.farthest > chunk.spec.end) { chunk.awarded = true; this.bonus += SCORE.section; }
        this.updateDrone(chunk.drone, time);
        const hazard = chunk.spec.hazardX;
        if (Math.abs(this.player.x - hazard) < 35 && this.player.y + 22 > 570 && this.player.y - 22 < 590) this.damage(time);
        for (const f of chunk.fragments) if (!f.collected && Math.abs(f.x - this.player.x) < 29 && Math.abs(f.y - this.player.y) < 34) {
          f.collected = true; this.run.fragments++; this.bonus += SCORE.fragment; this.burst(f.x, f.y, 0x7df6dd, 7);
        }
      }
      this.run.distance = Math.floor(Math.max(0, this.farthest - 140) / 10);
      this.run.score = Math.floor(Math.max(0, this.farthest - 140) / SCORE.pixelsPerPoint) + this.bonus;
      this.ledger.record(this.run.score); this.run.best = this.ledger.value; this.run.saved = this.ledger.saved;
      this.run.newBest = this.run.score > this.bestAtStart;
      this.run.district = sectionAt(currentId).district;
      if (this.player.y > 830) this.finish('Lost below the skyline');
    }
    const camera = this.cameras.main, visibleWidth = camera.width / camera.zoom;
    const aim = Math.max(this.leftEdge, this.player.x - visibleWidth * .3 + this.body.velocity.x * .18);
    camera.scrollX = Phaser.Math.Linear(camera.scrollX, aim, 1 - Math.exp(-dt * 5));
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, this.player.y < 380 ? -18 : 0, 1 - Math.exp(-dt * 3));
    this.stride += Math.abs(this.body.velocity.x) * dt * .045;
    if (!this.reduced && !this.userReduced) this.ambientPhase += dt * (.2 + this.painted.activity * .4);
    this.landing = Math.max(0, this.landing - dt * 7);
    this.city.update(delta, camera.scrollX, this.painted, this.reduced || this.userReduced, Math.floor(this.farthest / (CHUNK_WIDTH * 2)));
    this.drawWorld(time, dt);
    const p = this.painted;
    const accent = `rgb(${Math.round(p.ar)}, ${Math.round(p.ag)}, ${Math.round(p.ab)})`;
    if (accent !== this.lastAccent) { this.lastAccent = accent; this.onAccent(accent); }
    if (time >= this.publishAt) { this.publishAt = time + 100; this.publish(); }
  }

  private updateDrone(d: Drone, time: number) {
    if (d.defeated) return;
    const body = d.object.body as Phaser.Physics.Arcade.Body;
    const dx = this.player.x - d.object.x, dy = this.player.y - d.object.y;
    if (d.mode === 'patrol') {
      if ((d.direction > 0 && d.object.x >= d.right) || (d.direction < 0 && d.object.x <= d.left)) {
        d.direction *= -1; d.speed = patrolSpeed(d.tier, PROFILES[this.target].speed);
      }
      body.setVelocityX(d.direction * d.speed);
      if (dx * d.direction > 0 && Math.abs(dx) < 155 && Math.abs(dy) < 50) { d.mode = 'warn'; d.until = time + 650; body.setVelocityX(0); }
    } else {
      body.setVelocityX(0);
      if (time >= d.until) {
        if (d.mode === 'warn') { d.mode = 'attack'; d.until = time + 150; }
        else if (d.mode === 'attack') { d.mode = 'recover'; d.until = time + 1000; }
        else { d.mode = 'patrol'; }
      }
    }
    if (Math.abs(dx) < 31 && Math.abs(dy) < 37) {
      if (this.body.velocity.y > 70 && this.player.y + 22 < d.object.y + 7) {
        d.defeated = true; body.enable = false; this.body.setVelocityY(-280);
        if (!d.awarded) { d.awarded = true; this.bonus += SCORE.drone; }
        this.burst(d.object.x, d.object.y, 0xf5ba92, 12);
      } else if (d.mode !== 'recover') this.damage(time);
    }
    if (d.mode === 'attack' && dx * d.direction > 0 && Math.abs(dx) < 100 && Math.abs(dy) < 26) this.damage(time);
    if (!d.awarded && this.farthest > d.right + 70) { d.awarded = true; this.bonus += SCORE.drone; }
  }

  private drawRoof(g: Phaser.GameObjects.Graphics, roof: Roof, accent: number) {
    const { x, y, width } = roof;
    g.fillGradientStyle(0x1d2940, 0x1d2940, 0x080e1c, 0x080e1c, 1).fillRect(x, y, width, 250);
    g.fillStyle(0x35485c).fillRect(x, y, width, 8);
    g.fillStyle(0x0a1423).fillRect(x + 5, y + 12, width - 10, 20);
    g.lineStyle(9, accent, .05).lineBetween(x, y + 1, x + width, y + 1);
    g.lineStyle(2, accent, .8).lineBetween(x, y + 1, x + width, y + 1);
    g.lineStyle(1, 0x68829e, .3).lineBetween(x + 6, y + 34, x + width - 6, y + 34);
    for (let n = 0; n < width; n += 80) {
      g.fillStyle(0x314058).fillRect(x + n + 12, y + 18, 25, 3);
      g.fillStyle(accent, .1).fillRect(x + n + 20, y + 65, 4, 95);
      g.lineStyle(1, 0x475975, .2).strokeRect(x + n + 8, y + 50, 55, 170);
    }
    // Wet reflections and rooftop hardware are decorative, never colliders.
    g.fillStyle(accent, .08).fillEllipse(x + 130, y + 6, 85, 4);
    g.fillStyle(0x24334a).fillRect(x + width - 95, y - 24, 50, 24);
    g.lineStyle(1, 0x6a7e98, .5).strokeRect(x + width - 95, y - 24, 50, 24);
    for (let n = 0; n < 4; n++) g.fillStyle(0x08121f).fillRect(x + width - 87, y - 18 + n * 4, 34, 2);
  }

  private drawWorld(time: number, dt: number) {
    const p = this.painted, accent = color(p.ar, p.ag, p.ab), secondary = color(p.sr, p.sg, p.sb);
    const g = this.worldArt.clear(), a = this.actorArt.clear();
    const camera = this.cameras.main, right = camera.scrollX + camera.width / camera.zoom;
    for (const chunk of this.chunks) {
      if (chunk.spec.end < camera.scrollX - 100 || chunk.spec.start > right + 100) continue;
      for (const roof of chunk.spec.roofs) this.drawRoof(g, roof, accent);
      // District landmarks are anchored in the continuous world, scrolling in naturally.
      const landmarkX = chunk.spec.start + 1100;
      const district = Math.floor(chunk.spec.id / 2) % 6;
      g.lineStyle(2, secondary, .22);
      if (district === 0 || district === 1) {
        g.lineBetween(landmarkX - 160, 390, landmarkX + 340, 390);
        g.lineBetween(landmarkX - 160, 400, landmarkX + 340, 400);
        for (let n = 0; n < 5; n++) g.lineBetween(landmarkX - 140 + n * 110, 400, landmarkX - 100 + n * 110, 520);
      } else if (district === 2 || district === 4) {
        g.strokeCircle(landmarkX, 440, 66).strokeCircle(landmarkX, 440, 54);
        const rotation = this.ambientPhase;
        for (let n = 0; n < 6; n++) {
          const angle = n * Math.PI / 3 + rotation;
          g.lineBetween(landmarkX + Math.cos(angle) * 15, 440 + Math.sin(angle) * 15, landmarkX + Math.cos(angle) * 50, 440 + Math.sin(angle) * 50);
        }
      } else {
        g.lineBetween(landmarkX - 70, 540, landmarkX - 70, 340).lineBetween(landmarkX + 70, 540, landmarkX + 70, 340);
        g.lineBetween(landmarkX - 70, 340, landmarkX, 285).lineBetween(landmarkX, 285, landmarkX + 70, 340);
        g.strokeCircle(landmarkX, 365, 28);
      }
      const hx = chunk.spec.hazardX;
      g.fillStyle(0xf0b478, .08).fillEllipse(hx, 582, 100, 38);
      for (let i = -2; i <= 2; i++) {
        g.fillStyle(0x311e30).fillTriangle(hx + i * 9 - 5, 590, hx + i * 9, 569, hx + i * 9 + 5, 590);
        g.lineStyle(2, 0xffad7d).lineBetween(hx + i * 9 - 4, 587, hx + i * 9, 573);
      }
      for (const f of chunk.fragments) if (!f.collected) {
        const bob = (this.reduced || this.userReduced) ? 0 : Math.sin(time * .002 + f.x) * 3;
        g.fillStyle(0x7bffde, .055).fillCircle(f.x, f.y + bob, 22);
        g.fillStyle(0x7bffde, .14).fillCircle(f.x, f.y + bob, 12);
        g.lineStyle(2, 0x94ffe4).strokePoints([{ x: f.x, y: f.y - 7 + bob }, { x: f.x + 5, y: f.y + bob }, { x: f.x, y: f.y + 7 + bob }, { x: f.x - 5, y: f.y + bob }], true);
        g.fillStyle(0xd8fff5).fillRect(f.x - 1, f.y - 2 + bob, 2, 4);
      }
      const d = chunk.drone;
      if (!d.defeated) {
        const x = d.object.x, y = d.object.y;
        const sensor = d.mode === 'recover' ? 0x73829a : d.mode === 'patrol' ? accent : 0xffac88;
        if (d.mode === 'warn' || d.mode === 'attack') {
          g.fillStyle(0xff987b, d.mode === 'attack' ? .2 : .05).fillTriangle(x, y, x + d.direction * 100, y - 26, x + d.direction * 100, y + 26);
          g.lineStyle(d.mode === 'attack' ? 3 : 1, 0xffad83, .7).lineBetween(x, y, x + d.direction * 100, y);
          g.lineStyle(2, 0xffca9f, .8).strokeCircle(x, y - 30, 8);
          g.fillStyle(0xffe0bd).fillRect(x - 1, y - 35, 2, 6).fillRect(x - 1, y - 27, 2, 2);
        }
        a.fillStyle(sensor, .06).fillEllipse(x, y + 22, 70, 12);
        a.lineStyle(3, 0x34445d).lineBetween(x - 30, y - 10, x + 30, y - 10);
        a.fillStyle(0x19243a).fillRoundedRect(x - 22, y - 15, 44, 26, 8);
        a.lineStyle(1, 0x91a5be).strokeRoundedRect(x - 22, y - 15, 44, 26, 8);
        a.fillStyle(0x07101f).fillRoundedRect(x - 17, y - 9, 34, 13, 4);
        a.fillStyle(sensor, .15).fillCircle(x + d.direction * 10, y - 3, 11);
        a.fillStyle(sensor).fillCircle(x + d.direction * 10, y - 3, 4);
        a.fillStyle(secondary, .6).fillRect(x - 28, y - 12, 9, 2).fillRect(x + 19, y - 12, 9, 2);
      }
    }
    // Runner silhouette: helmet, illuminated visor, segmented armor, scarf and articulated legs.
    const x = this.player.x, y = this.player.y;
    const moving = Math.abs(this.body.velocity.x) > 30, grounded = this.body.blocked.down;
    const step = grounded && moving ? Math.sin(this.stride) * 7 : 0;
    const crouch = this.landing * 3;
    const damage = time < this.invulnerableUntil && Math.sin(time * .028) > .4;
    const suit = damage ? 0xffb8c2 : 0xc6d6e7;
    const lean = moving ? this.facing * 3 : 0;
    if (moving && !this.reduced && !this.userReduced) {
      for (let i = 1; i <= 4; i++) a.fillStyle(accent, .08 / i).fillRect(x - this.facing * i * 12 - 8, y - 9, 16, 27);
    }
    a.fillStyle(0x071321, .4).fillEllipse(x, y + 24, 38, 7);
    a.lineStyle(7, 0x4c6785).lineBetween(x - 5, y + 5, x - 6 + step, y + 19 - crouch);
    a.lineStyle(7, suit).lineBetween(x + 5, y + 5, x + 6 - step, y + 19 - crouch);
    a.lineStyle(4, 0x071322).lineBetween(x - 8 + step, y + 21 - crouch, x - 1 + step, y + 21 - crouch).lineBetween(x + 2 - step, y + 21 - crouch, x + 10 - step, y + 21 - crouch);
    a.fillStyle(0x283f5a).fillRoundedRect(x - 10 + lean, y - 10 + crouch, 20, 24, 5);
    a.fillStyle(suit).fillRoundedRect(x - 8 + lean, y - 11 + crouch, 17, 14, 4);
    a.lineStyle(5, 0x7293b0).lineBetween(x - this.facing * 8, y - 5, x - this.facing * 10 - step * .5, y + 9);
    a.fillStyle(accent).fillRect(x - 5 + lean, y - 5 + crouch, 10, 2);
    a.fillStyle(0x7995b7).fillRoundedRect(x - 10 + lean, y - 23 + crouch, 21, 16, 5);
    a.fillStyle(0x0c172a).fillRoundedRect(x - 7 + lean + this.facing * 2, y - 19 + crouch, 15, 7, 2);
    a.fillStyle(accent).fillRect(x - 5 + lean + this.facing * 3, y - 17 + crouch, 12, 3);
    a.fillStyle(secondary).fillTriangle(x - this.facing * 6, y - 9, x - this.facing * 29, y - 4 + Math.sin(this.stride * .5) * 3, x - this.facing * 9, y - 2);
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i]; spark.life -= dt;
      if (spark.life <= 0) { this.sparks.splice(i, 1); continue; }
      spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 250 * dt;
      a.fillStyle(spark.tint, Math.min(1, spark.life * 2)).fillRect(spark.x, spark.y, 2, 2);
    }
  }
}
