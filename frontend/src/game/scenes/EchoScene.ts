import Phaser from 'phaser';
import type { PlayerState } from '../../shared/contracts';
import { LEVEL, PROFILES, TRANSITION_MS } from '../profiles';

type Painted = { red: number; green: number; blue: number; ar: number; ag: number; ab: number; activity: number };
const channels = (state: PlayerState): Painted => {
  const p = PROFILES[state];
  const b = Phaser.Display.Color.IntegerToRGB(p.background);
  const a = Phaser.Display.Color.IntegerToRGB(p.accent);
  return { red: b.r, green: b.g, blue: b.b, ar: a.r, ag: a.g, ab: a.b, activity: p.activity };
};

export default class EchoScene extends Phaser.Scene {
  private target: PlayerState = 'UNKNOWN';
  private painted = channels('UNKNOWN');
  private transition?: Phaser.Tweens.Tween;
  private player!: Phaser.GameObjects.Rectangle;
  private enemy!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private actors!: Phaser.GameObjects.Graphics;
  private scenery!: Phaser.GameObjects.Graphics;
  private platformLights!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private direction = 1;
  private patrolSpeed = 45;
  private phase = 0;
  private groundedAt = -1000;
  private bufferedAt = -1000;
  private jumping = false;
  private won = false;
  private ready = false;
  private reduced = false;
  private attempts = 0;
  constructor(private initialState: () => PlayerState = () => 'UNKNOWN') { super('EchoScene'); }

  setTargetState(state: PlayerState) {
    if (!this.ready || state === this.target) return;
    this.target = state;
    // Stop in place: painted contains the currently rendered interpolated values.
    this.transition?.stop();
    this.transition = this.tweens.add({ targets: this.painted, ...channels(state), duration: TRANSITION_MS, ease: 'Sine.easeInOut' });
  }

  create() {
    this.target = this.initialState();
    this.painted = channels(this.target);
    this.patrolSpeed = PROFILES[this.target].speed;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scenery = this.add.graphics().setScrollFactor(0).setDepth(-3);
    this.platformLights = this.add.graphics().setDepth(1);
    this.actors = this.add.graphics().setDepth(6);
    const surfaces = this.physics.add.staticGroup();
    for (const p of LEVEL) {
      const slab = this.add.rectangle(p.x + p.width / 2, p.y + 20, p.width, 40, 0x263949).setStrokeStyle(1, 0x71828d);
      surfaces.add(slab);
      this.add.rectangle(p.x + p.width / 2, p.y + 43, p.width - 16, 5, 0x101923);
      for (let x = p.x + 15; x < p.x + p.width; x += 44) this.add.rectangle(x, p.y + 20, 17, 3, 0x435562);
    }
    this.add.text(30, 385, '01 / DEPARTURE\nUPLINK ->', { fontFamily: 'monospace', fontSize: '15px', color: '#d7e6ef', lineSpacing: 8 });
    this.add.text(1810, 290, 'PATROL ZONE\nJump over the drone', { fontFamily: 'monospace', fontSize: '13px', color: '#ffce9e' });
    this.add.rectangle(2110, 367, 42, 106, 0x263c4e).setStrokeStyle(3, 0xace5ef);
    this.add.text(2055, 289, 'UPLINK\nEXIT', { fontFamily: 'monospace', fontSize: '17px', color: '#e1f7ff', align: 'center' });
    this.player = this.add.rectangle(80, 440, 26, 38, 0xe9f1f3).setStrokeStyle(2, 0x8fe0e5).setDepth(4);
    this.physics.add.existing(this.player);
    this.body = this.player.body as Phaser.Physics.Arcade.Body;
    this.body.setMaxVelocity(250, 800);
    this.physics.add.collider(this.player, surfaces);
    this.enemy = this.add.rectangle(1990, 402, 32, 30, 0xbb795c).setStrokeStyle(2, 0xffdab3).setDepth(3);
    this.physics.add.existing(this.enemy);
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    enemyBody.setAllowGravity(false).setImmovable(true);
    this.physics.add.overlap(this.player, this.enemy, () => this.restartRun());
    this.enemyLabel = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffdfba' }).setOrigin(0.5).setDepth(5);
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,A,D,SPACE,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.removeCapture(['SPACE', 'UP', 'LEFT', 'RIGHT']);
    const preventScroll = (event: KeyboardEvent) => {
      if (document.activeElement?.closest('.game-mount') && ['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    };
    window.addEventListener('keydown', preventScroll);
    this.input.on('pointerdown', () => (this.game.canvas.parentElement as HTMLElement)?.focus());
    this.cameras.main.setBounds(0, 0, 2200, 540);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.status = this.add.text(24, 22, '', { fontFamily: 'monospace', fontSize: '14px', color: '#deedf5', backgroundColor: '#101b29', padding: { x: 12, y: 10 } }).setScrollFactor(0).setDepth(10);
    this.ready = true;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { this.reduced = media.matches; };
    media.addEventListener('change', motionChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', preventScroll);
      this.ready = false; this.transition?.stop(); media.removeEventListener('change', motionChanged);
    });
  }

  private restartRun() {
    this.body.reset(80, 440); this.body.setVelocity(0, 0);
    this.groundedAt = -1000; this.bufferedAt = -1000; this.jumping = false;
    this.won = false; this.attempts++;
  }

  update(time: number, delta: number) {
    if (!this.ready) return;
    const active = document.activeElement;
    const typing = active instanceof HTMLElement && /BUTTON|INPUT|SELECT|TEXTAREA/.test(active.tagName);
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.UP);
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) && !typing) this.restartRun();
    if (!this.won) {
      const axis = typing ? 0 : Number(this.keys.RIGHT.isDown || this.keys.D.isDown) - Number(this.keys.LEFT.isDown || this.keys.A.isDown);
      this.body.setVelocityX(axis * 245);
      if (this.body.blocked.down) { this.groundedAt = time; this.jumping = false; }
      if (jumpPressed && !typing) this.bufferedAt = time;
      if (time - this.bufferedAt < 130 && time - this.groundedAt < 100 && !this.jumping) {
        this.body.setVelocityY(-500); this.jumping = true; this.bufferedAt = -1000; this.groundedAt = -1000;
      }
      if (this.player.y > 590 || this.player.x < -20) this.restartRun();
      if (this.player.x > 2070 && this.body.blocked.down) { this.won = true; this.body.setVelocityX(0); }
    }
    // Presentation changes immediately; speed changes only at a fixed patrol endpoint.
    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    if ((this.direction === 1 && this.enemy.x >= 2040) || (this.direction === -1 && this.enemy.x <= 1950)) {
      this.direction *= -1;
      this.patrolSpeed = PROFILES[this.target].speed;
    }
    enemyBody.setVelocityX(this.direction * this.patrolSpeed);
    this.enemyLabel.setPosition(this.enemy.x, this.enemy.y - 38).setText(`${this.direction > 0 ? '>' : '<'} ${Math.round(this.patrolSpeed)}${this.patrolSpeed !== PROFILES[this.target].speed ? ' / queued' : ''}`);
    this.status.setText(this.won ? 'SIGNAL DELIVERED\nStation online. Press R to replay.' : `RELAY / ${Math.min(99, Math.round(this.player.x / 2110 * 100))}%    ${PROFILES[this.target].symbol} ${this.target}\nReach the uplink / retries ${this.attempts}`);
    this.drawWorld(delta);
  }

  private drawWorld(delta: number) {
    const p = this.painted;
    const accent = Phaser.Display.Color.GetColor(Math.round(p.ar), Math.round(p.ag), Math.round(p.ab));
    const bg = Phaser.Display.Color.GetColor(Math.round(p.red), Math.round(p.green), Math.round(p.blue));
    this.phase += this.reduced ? 0 : Math.min(delta, 40) * (0.00012 + p.activity * 0.0002);
    const g = this.scenery.clear();
    g.fillStyle(bg).fillRect(0, 0, 960, 540);
    g.lineStyle(1, accent, 0.08);
    for (let x = 0; x < 1000; x += 64) g.lineBetween(x, 0, x, 540);
    for (let y = 0; y < 540; y += 64) g.lineBetween(0, y, 960, y);
    g.lineStyle(2, accent, 0.25).strokeCircle(745, 166, 84).strokeCircle(745, 166, 105);
    g.fillStyle(accent, 0.12).fillCircle(745, 166, 63);
    for (let i = 0; i < 13; i++) {
      const x = ((i * 193 - this.cameras.main.scrollX * 0.18) % 1050 + 1050) % 1050;
      g.fillStyle(0x0d1926, 0.65).fillRect(x, 230 + (i % 3) * 30, 65, 310);
      g.fillStyle(accent, 0.2 + p.activity * 0.18);
      for (let j = 0; j < 5; j++) g.fillRect(x + 12, 258 + j * 30 + (i % 3) * 30, 5 + 23 * (0.5 + 0.5 * Math.sin(this.phase + i + j)), 3);
    }
    this.platformLights.clear().lineStyle(3, accent, 0.65);
    for (const slab of LEVEL) this.platformLights.lineBetween(slab.x + 2, slab.y, slab.x + slab.width - 2, slab.y);
    this.player.setStrokeStyle(2, accent);
    this.enemy.setStrokeStyle(2, accent);
    const a = this.actors.clear();
    const x = this.player.x, y = this.player.y;
    a.fillStyle(0x1b3445).fillRoundedRect(x - 9, y - 14, 18, 10, 3);
    a.fillStyle(accent).fillRect(x - 6, y - 11, 13, 3);
    a.fillStyle(0x58788e).fillRect(x - 9, y + 5, 18, 4);
    a.fillStyle(0x182a38).fillRect(x - 2, y + 11, 4, 8);
    a.fillStyle(accent, 0.75).fillRect(x - 16, y - 1, 3, 15);
    const ex = this.enemy.x, ey = this.enemy.y;
    a.fillStyle(0x1c2632).fillRect(ex - 12, ey - 7, 24, 10);
    a.fillStyle(0xffdcad).fillCircle(ex + this.direction * 7, ey - 2, 4);
    a.lineStyle(2, 0xffdcad, 0.7).lineBetween(ex - 24, ey - 9, ex + 24, ey - 9);
  }
}
