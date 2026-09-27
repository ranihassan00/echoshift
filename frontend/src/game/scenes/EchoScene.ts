import Phaser from 'phaser';
import type { PlayerState } from '../../shared/contracts';
import City from '../City';
import { AREAS, hazardFrame, hazardHits, type HazardSpec, type HazardFrame } from '../levels';
import { color, presentation, biomeColor, normalizeState, TRANSITION_MS } from '../profiles';
import { CHUNK_WIDTH, emptyRun, HighScore, MOVEMENT, patrolSpeed, SCORE, sectionAt, type Roof, type RunSnapshot, type Section } from '../run';

type Drone = { object: Phaser.GameObjects.Rectangle; left: number; right: number; direction: number; speed: number; tier: number; mode: 'patrol' | 'warn' | 'attack' | 'recover'; until: number; awarded: boolean; defeated: boolean };
type Fragment = { x: number; y: number; collected: boolean };
type DeckBody = { object: Phaser.GameObjects.Rectangle; roof: Roof; touched: number; fallen: number; exposure: number; elapsed: number };
type Threat = { spec: HazardSpec; started: number; frame: HazardFrame; spent: boolean; elapsed: number; cycle: number; motion: number; shot: number };
type Chunk = { decks: DeckBody[]; threats: Threat[]; spec: Section; bodies: Phaser.GameObjects.Rectangle[]; fragments: Fragment[]; drone: Drone; awarded: boolean };
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
  private landing = 0;
  private lastAccent = '';
  private droneClock = 0;
  private dashUntil = 0;
  private dashReady = true;
  private wallKickUntil = 0;
  constructor(private initialState: () => PlayerState = () => 'UNKNOWN', private onRun: (run: RunSnapshot) => void = () => {}, private onAccent: (accent: string) => void = () => {}) { super('EchoScene'); }

  setTargetState(state: PlayerState) {
    state = normalizeState(state);
    if (!this.ready || this.target === state) return;
    this.target = state;
    this.transition?.stop();
    this.transition = this.tweens.add({ targets: this.painted, ...presentation(state), duration: TRANSITION_MS, ease: 'Sine.easeInOut' });
  }
  setReducedMotion(value: boolean) { this.userReduced = value; }

  create() {
    this.target = normalizeState(this.initialState());
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
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,A,D,SPACE,R,SHIFT,X') as Record<string, Phaser.Input.Keyboard.Key>;
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
    this.groundedAt = -1000; this.bufferedAt = -1000; this.jumping = false; this.jumpCut = false; this.facing = 1; this.wasGrounded = false;
    this.dashUntil = 0; this.dashReady = true; this.wallKickUntil = 0; this.body.setAllowGravity(true);
    this.invulnerableUntil = this.time.now + 700; this.publishAt = 0;
    this.cameras.main.setScroll(0, 0);
    for (let id = 0; id < 3; id++) this.addChunk(id);
    this.publish();
  }

  private addChunk(id: number) {
    const spec = sectionAt(id);
    const decks = spec.roofs.map(roof => {
      const height = roof.height ?? 28;
      const object = this.add.rectangle(roof.x + roof.width / 2, roof.y + height / 2, roof.width, height, 0xffffff, 0);
      this.roofs.add(object);
      if (roof.kind !== 'wall') {
        const body = object.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false; body.checkCollision.left = false; body.checkCollision.right = false;
      }
      return { object, roof, touched: -1, fallen: 0, exposure: 0, elapsed: 0 };
    });
    const bodies = decks.map(d => d.object);
    const object = this.add.rectangle(spec.droneLeft + 60, 566, 40, 28, 0xffffff, 0);
    this.physics.add.existing(object);
    (object.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setImmovable(true);
    const fragments: Fragment[] = [];
    spec.roofs.filter(r => r.kind !== 'wall').forEach((roof, index) => {
      for (let n = 0; n < 3; n++) fragments.push({ x: roof.x + roof.width * (n + 1) / 4, y: roof.y - 48 - Math.sin(n / 2 * Math.PI) * 15, collected: false });
      if (index === 1) fragments.push({ x: roof.x + roof.width / 2, y: roof.y - 120, collected: false });
    });
    this.chunks.push({ spec, bodies, decks, threats: spec.hazards.map(h => ({ spec: h, started: -1, spent: false, elapsed: 0, cycle: 0, motion: 0, shot: 0, frame: hazardFrame(h, 0, spec.tier) })), fragments, awarded: false, drone: { object, left: spec.droneLeft, right: spec.droneRight, direction: 1, speed: patrolSpeed(spec.tier, 0) * this.painted.enemySpeed, tier: spec.tier, mode: 'patrol', until: 0, awarded: false, defeated: id % 8 !== 0 } });
    if (id % 8 !== 0) (object.body as Phaser.Physics.Arcade.Body).enable = false;
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
    if (!this.run.over) this.droneClock += dt * 1000 * this.painted.fireRate;
    const active = document.activeElement;
    const typing = active instanceof HTMLElement && /BUTTON|INPUT|SELECT|TEXTAREA/.test(active.tagName);
    const justJump = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.UP);
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) && !(active instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(active.tagName))) this.restartRun();
    if (!this.run.over) {
      const axis = typing ? 0 : Number(this.keys.RIGHT.isDown || this.keys.D.isDown) - Number(this.keys.LEFT.isDown || this.keys.A.isDown);
      if (time >= this.wallKickUntil) this.body.setAccelerationX(axis * MOVEMENT.acceleration);
      if (axis) this.facing = axis;
      const grounded = this.body.blocked.down;
      if (grounded) {
        this.groundedAt = time; this.jumping = false; if (time >= this.dashUntil) this.dashReady = true;
        if (!this.wasGrounded) { this.landing = 1; this.burst(this.player.x, this.player.y + 20, 0x90c7db, 7); }
      }
      this.wasGrounded = grounded;
      if (justJump && !typing) this.bufferedAt = time;
      if (time - this.bufferedAt < MOVEMENT.buffer && time - this.groundedAt < MOVEMENT.coyote && !this.jumping) {
        this.body.setVelocityY(-MOVEMENT.jump); this.jumping = true; this.jumpCut = false;
        this.groundedAt = -1000; this.bufferedAt = -1000;
      }
      const wall = this.body.blocked.left ? 1 : this.body.blocked.right ? -1 : 0;
      if (!grounded && wall && justJump && !typing) {
        this.body.setVelocity(wall * 360, -MOVEMENT.jump); this.body.setAccelerationX(0);
        this.wallKickUntil = time + 180; this.jumping = true; this.jumpCut = false; this.dashReady = true;
        this.bufferedAt = -1000; this.facing = wall;
      }
      if (wall && !grounded && this.body.velocity.y > 120) this.body.setVelocityY(120);
      const justDash = Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.X);
      if (justDash && !typing && this.dashReady) {
        this.dashReady = false; this.dashUntil = time + MOVEMENT.dashMs;
        this.burst(this.player.x, this.player.y, 0xa1ecff, 8);
      }
      const dashing = time < this.dashUntil;
      this.body.setDragX(time < this.wallKickUntil || dashing ? 0 : MOVEMENT.brake);
      this.body.setAllowGravity(!dashing).setMaxVelocity(dashing ? MOVEMENT.dash : Math.max(MOVEMENT.speed, time < this.wallKickUntil ? 360 : 0), 850);
      if (dashing) this.body.setVelocity(this.facing * MOVEMENT.dash, 0).setAccelerationX(0);
      const holdingJump = this.keys.SPACE.isDown || this.keys.UP.isDown;
      if (!dashing && !holdingJump && this.body.velocity.y < -220 && this.jumping && !this.jumpCut) {
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
        this.updateEncounter(chunk, time, dt);
        for (const f of chunk.fragments) if (!f.collected && Math.abs(f.x - this.player.x) < 29 && Math.abs(f.y - this.player.y) < 34) {
          f.collected = true; this.run.fragments++; this.bonus += SCORE.fragment; this.burst(f.x, f.y, 0x7df6dd, 7);
        }
      }
      this.run.distance = Math.floor(Math.max(0, this.farthest - 140) / 10);
      this.run.score = Math.floor(Math.max(0, this.farthest - 140) / SCORE.pixelsPerPoint) + this.bonus;
      this.ledger.record(this.run.score); this.run.best = this.ledger.value; this.run.saved = this.ledger.saved;
      this.run.newBest = this.run.score > this.bestAtStart;
      const section = sectionAt(currentId);
      this.run.district = section.district; this.run.stage = currentId + 1; this.run.hint = section.hint; this.run.dashReady = this.dashReady;
      if (this.player.y > 830) this.finish('Lost below the skyline');
    }
    const camera = this.cameras.main, visibleWidth = camera.width / camera.zoom;
    const aim = Math.max(this.leftEdge, this.player.x - visibleWidth * .3 + this.body.velocity.x * .18);
    camera.scrollX = Phaser.Math.Linear(camera.scrollX, aim, 1 - Math.exp(-dt * 5));
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, Math.min(0, this.player.y - 360), 1 - Math.exp(-dt * 3));
    this.stride += Math.abs(this.body.velocity.x) * dt * .045;
    this.landing = Math.max(0, this.landing - dt * 7);
    this.city.update(delta, camera.scrollX, this.painted, this.reduced || this.userReduced, Math.floor(this.farthest / (CHUNK_WIDTH * 2)));
    this.drawWorld(time, dt);
    const p = this.painted;
    const accent = `rgb(${Math.round(p.ar)}, ${Math.round(p.ag)}, ${Math.round(p.ab)})`;
    if (accent !== this.lastAccent) { this.lastAccent = accent; this.onAccent(accent); }
    if (time >= this.publishAt) { this.publishAt = time + 100; this.publish(); }
  }

  private updateEncounter(chunk: Chunk, time: number, dt: number) {
    for (const d of chunk.decks) {
      const b = d.object.body as Phaser.Physics.Arcade.StaticBody, p = d.roof;
      const standing = b.enable && this.body.blocked.down && Math.abs(this.body.bottom - b.top) < 5 && this.body.right > b.left && this.body.left < b.right;
      if (standing && d.touched < 0 && (p.kind === 'falling' || p.kind === 'vanish')) { d.touched = time; d.exposure = 0; d.elapsed = 0; }
      if (d.touched >= 0) {
        const elapsed = Math.max(0, time - d.touched);
        d.exposure += Math.max(0, elapsed - d.elapsed) * this.painted.collapseRate;
        d.elapsed = elapsed;
      }
      let x = p.x + p.width / 2, y = p.y + (p.height ?? 28) / 2;
      if (p.kind === 'moving') {
        const offset = Math.sin(time / 1400 + chunk.spec.id) * (p.travel ?? 60);
        if (p.vertical) y += offset; else x += offset;
      }
      if (d.touched >= 0 && d.exposure > 650) {
        if (p.kind === 'vanish') b.enable = false;
        if (p.kind === 'falling') { d.fallen += dt * 300; y += d.fallen; if (d.fallen > 260) b.enable = false; }
        if (time - d.touched > 3500) { d.touched = -1; d.fallen = 0; d.exposure = 0; d.elapsed = 0; b.enable = true; y = p.y + (p.height ?? 28) / 2; }
      }
      const dx = x - d.object.x, dy = y - d.object.y;
      if (standing && b.enable) { this.body.position.x += dx; this.body.position.y += dy; }
      d.object.setPosition(x, y); b.updateFromGameObject();
    }
    for (const h of chunk.threats) {
      if (h.spent) continue;
      const proximity = Math.abs(this.player.x - h.spec.x);
      if (h.started < 0 && proximity < (h.spec.kind === 'mine' ? 110 : 600)) h.started = time;
      const realElapsed = h.started < 0 ? 0 : Math.max(0, time - h.started);
      const step = Math.max(0, realElapsed - h.elapsed);
      h.elapsed = realElapsed;
      const oldCycle = h.cycle;
      h.cycle += step * (h.spec.kind === 'turret' ? this.painted.fireRate : this.painted.hazardRate);
      h.motion += step * (h.spec.kind === 'flyer' || h.spec.kind === 'ground' ? this.painted.enemySpeed : this.painted.motionRate);
      const elapsed = h.cycle;
      if (h.spec.kind === 'mine') {
        h.frame = { ...h.spec, width: elapsed >= 700 ? 90 : 28, height: elapsed >= 700 ? 60 : 16,
          active: h.started >= 0 && elapsed >= 700, warning: h.started >= 0 && elapsed < 700 };
        if (elapsed > 1050) { h.spent = true; continue; }
      } else {
        const cycleLength = Math.max(2400, 3600 - chunk.spec.tier * 150);
        const phase = elapsed % cycleLength;
        const newShot = Math.floor(oldCycle / cycleLength) !== Math.floor(elapsed / cycleLength) || oldCycle % cycleLength < 1800;
        if (phase >= 1800 && phase < 2400) {
          h.shot = newShot ? Math.max(0, phase - 1800) / this.painted.fireRate * this.painted.projectileSpeed : h.shot + step * this.painted.projectileSpeed;
        } else h.shot = 0;
        h.frame = hazardFrame(h.spec, elapsed, chunk.spec.tier, { motionElapsed: h.motion, projectileElapsed: h.shot });
      }
      if (h.started < 0) h.frame.active = false;
      if (hazardHits(h.frame, this.player.x, this.player.y)) this.damage(time);
    }
  }

  private drawThreats(g: Phaser.GameObjects.Graphics, chunk: Chunk, time: number) {
    for (const h of chunk.threats) {
      if (h.spent) continue;
      const f = h.frame, s = h.spec, tint = f.active ? 0xff668b : f.warning ? 0xffcf79 : 0x7b9dab;
      const pulse = this.reduced || this.userReduced ? .8 : .6 + .3 * Math.sin(time / 90);
      if (s.kind === 'turret') {
        g.fillStyle(0x384256).fillRect(s.x - 17, s.y - 17, 34, 34);
        g.lineStyle(6, tint).lineBetween(s.x, s.y, s.x - 26, s.y);
        if (f.warning) g.lineStyle(1, tint, .65).lineBetween(s.x, s.y, s.x - 410, s.y);
      } else if (s.kind === 'debris') {
        g.lineStyle(1, 0xffcf79, f.warning ? .8 : .16).strokeRect(s.x - 24, s.y, 48, (s.travel ?? 300) + 34);
        if (f.warning) g.fillStyle(0xffcf79, pulse).fillTriangle(s.x - 9, s.y + (s.travel ?? 300), s.x + 9, s.y + (s.travel ?? 300), s.x, s.y + (s.travel ?? 300) - 16);
      } else if (s.kind === 'crusher') {
        g.lineStyle(7, 0x50616e).lineBetween(s.x, s.y - 150, s.x, f.y);
        g.lineStyle(1, 0xffcf79, f.warning ? .85 : .2).strokeRect(s.x - 35, s.y + 45, 70, s.travel ?? 100);
      } else if (s.kind === 'electric') {
        g.fillStyle(0x243b36).fillRect(s.x - s.width / 2, s.y - 6, s.width, 12);
        for (let i = 0; i < s.width; i += 14) g.lineStyle(2, tint, f.active ? 1 : .4).lineBetween(s.x - s.width / 2 + i, s.y + 4, s.x - s.width / 2 + i + 7, s.y - (f.active ? 14 : 4));
      } else if (s.kind === 'flyer' || s.kind === 'ground') {
        g.fillStyle(0x263248).fillRoundedRect(f.x - 22, f.y - 14, 44, 28, 5);
        g.fillStyle(0xff789c).fillRect(f.x - 13, f.y - 5, 26, 4);
        if (s.kind === 'flyer') g.lineStyle(3, 0x8fd4f0).lineBetween(f.x - 32, f.y - 16, f.x + 32, f.y - 16);
        else { g.fillStyle(0x8898b1).fillCircle(f.x - 14, f.y + 14, 7).fillCircle(f.x + 14, f.y + 14, 7); }
        continue;
      } else if (s.kind === 'rotor') {
        const dx = Math.cos(f.angle!) * f.width / 2, dy = Math.sin(f.angle!) * f.width / 2;
        g.lineStyle(14, tint, .15 * this.painted.glow).lineBetween(f.x - dx, f.y - dy, f.x + dx, f.y + dy);
        g.lineStyle(7, tint).lineBetween(f.x - dx, f.y - dy, f.x + dx, f.y + dy);
        g.fillStyle(0xe6edff).fillCircle(f.x, f.y, 6); continue;
      }
      if (s.kind === 'pulse' || s.kind === 'sweepV' || s.kind === 'sweepH') {
        g.lineStyle(1, tint, f.warning ? pulse : .25).strokeRect(f.x - f.width / 2, f.y - f.height / 2, f.width, f.height);
        g.fillStyle(tint).fillRect(f.x - f.width / 2 - 4, f.y - f.height / 2 - 5, f.width + 8, 5);
      }
      if (f.active) {
        g.fillStyle(tint, .12 * this.painted.glow).fillRect(f.x - f.width / 2 - 5, f.y - f.height / 2 - 5, f.width + 10, f.height + 10);
        g.fillStyle(tint, .9).fillRect(f.x - f.width / 2, f.y - f.height / 2, f.width, f.height);
      } else if (s.kind === 'mine' || s.kind === 'crusher' || s.kind === 'debris') {
        g.fillStyle(tint, f.warning ? pulse : .45).fillRect(f.x - f.width / 2, f.y - f.height / 2, f.width, f.height);
      }
      if (f.warning) {
        g.fillStyle(0xffcf79).fillTriangle(s.x, s.y - 36, s.x - 7, s.y - 24, s.x + 7, s.y - 24);
      }
    }
  }

  private updateDrone(d: Drone, time: number) {
    if (d.defeated) return;
    const body = d.object.body as Phaser.Physics.Arcade.Body;
    const dx = this.player.x - d.object.x, dy = this.player.y - d.object.y;
    const clock = this.droneClock;
    d.speed = patrolSpeed(d.tier, 0) * this.painted.enemySpeed;
    if (d.mode === 'patrol') {
      if ((d.direction > 0 && d.object.x >= d.right) || (d.direction < 0 && d.object.x <= d.left)) {
        d.direction *= -1;
      }
      body.setVelocityX(d.direction * d.speed);
      if (dx * d.direction > 0 && Math.abs(dx) < 155 && Math.abs(dy) < 50) { d.mode = 'warn'; d.until = clock + 650; body.setVelocityX(0); }
    } else {
      body.setVelocityX(0);
      if (clock >= d.until) {
        if (d.mode === 'warn') { d.mode = 'attack'; d.until = clock + 150; }
        else if (d.mode === 'attack') { d.mode = 'recover'; d.until = clock + 1000; }
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
    g.fillGradientStyle(0x1d2940, 0x1d2940, 0x080e1c, 0x080e1c, 1).fillRect(x, y, width, roof.kind === 'wall' ? roof.height ?? 220 : 28);
    g.fillStyle(0x35485c).fillRect(x, y, width, 8);
    g.fillStyle(0x0a1423).fillRect(x + 5, y + 12, width - 10, 20);
    g.lineStyle(9 + this.painted.glow * 3, accent, .05 * this.painted.glow).lineBetween(x, y + 1, x + width, y + 1);
    g.lineStyle(2, accent, .8).lineBetween(x, y + 1, x + width, y + 1);
    g.lineStyle(1, 0x68829e, .3).lineBetween(x + 6, y + 34, x + width - 6, y + 34);
    for (let n = 0; n < width; n += 80) {
      g.fillStyle(0x314058).fillRect(x + n + 12, y + 18, 25, 3);
      if (roof.kind === 'wall') g.fillStyle(accent, .5).fillRect(x + 5, y + 10, 3, (roof.height ?? 220) - 20);

    }
    g.fillStyle(accent, .13).fillEllipse(x + width / 2, y + 6, Math.min(85, width - 10), 4);

  }

  private drawWorld(time: number, dt: number) {
    const p = this.painted, accent = color(p.ar, p.ag, p.ab), secondary = color(p.sr, p.sg, p.sb);
    const g = this.worldArt.clear(), a = this.actorArt.clear();
    const camera = this.cameras.main, right = camera.scrollX + camera.width / camera.zoom;
    for (const chunk of this.chunks) {
      if (chunk.spec.end < camera.scrollX - 100 || chunk.spec.start > right + 100) continue;
      const areaColor = biomeColor(AREAS[chunk.spec.area].color, p);
      for (const deck of chunk.decks) {
        if (!(deck.object.body as Phaser.Physics.Arcade.StaticBody).enable) continue;
        const roof = { ...deck.roof, x: deck.object.x - deck.roof.width / 2, y: deck.object.y - (deck.roof.height ?? 28) / 2 };
        this.drawRoof(g, roof, areaColor);
        if (roof.kind === 'falling' || roof.kind === 'vanish') {
          g.lineStyle(2, deck.touched >= 0 ? 0xffbe75 : areaColor).lineBetween(roof.x + 12, roof.y + 4, roof.x + roof.width / 2, roof.y + 14).lineBetween(roof.x + roof.width / 2, roof.y + 14, roof.x + roof.width - 12, roof.y + 4);
          const remaining = deck.touched < 0 ? 1 : Math.max(0, 1 - deck.exposure / 650);
          g.fillStyle(0xffcf88).fillRect(roof.x, roof.y - 5, roof.width * remaining, 3);
        }
        if (roof.kind === 'moving') {
          g.fillStyle(0x30263f).fillRoundedRect(roof.x + 2, roof.y + 16, roof.width - 4, 48, 8);
          for (let w = 14; w < roof.width - 24; w += 34) g.fillStyle(areaColor, .35).fillRect(roof.x + w, roof.y + 25, 23, 19);
          g.lineStyle(1, areaColor, .25).lineBetween(roof.x - (roof.travel ?? 0), roof.y + 40, roof.x + roof.width + (roof.travel ?? 0), roof.y + 40);
          g.fillStyle(areaColor, .6).fillRect(roof.x + 10, roof.y + 9, roof.width - 20, 3);
        }
        if (roof.kind === 'wall') for (let y = roof.y + 30; y < roof.y + (roof.height ?? 220) - 20; y += 42) {
          g.lineStyle(2, areaColor, .8).lineBetween(roof.x + 12, y + 8, roof.x + roof.width / 2, y).lineBetween(roof.x + roof.width / 2, y, roof.x + roof.width - 12, y + 8);
        }
      }
      this.drawThreats(g, chunk, time);
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
