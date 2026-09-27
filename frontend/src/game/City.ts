import Phaser from 'phaser';
import { type Presentation } from './profiles';
import { AREAS } from './levels';

/** Cached parallax textures, bounded rain strokes and a handful of animated landmarks. */
export default class City {
  private sky: Phaser.GameObjects.Graphics;
  private atmosphere: Phaser.GameObjects.Graphics;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private signs: Phaser.GameObjects.Text[] = [];
  private phase = 0;
  private scenery: Phaser.GameObjects.Graphics;
  private palette = { r: 8, g: 21, b: 46 };
  constructor(private scene: Phaser.Scene) {
    this.sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
    const colors = [0x25304d, 0x18223b, 0x0d172c];
    for (let layer = 0; layer < 3; layer++) {
      const key = `city-${layer}`;
      if (!scene.textures.exists(key)) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        for (let i = 0; i < 24; i++) {
          const x = i * 110;
          const w = 60 + ((i * 31 + layer * 13) % 55);
          const h = (layer === 0 ? 290 : 130) + ((i * 79 + layer * 37) % (layer === 0 ? 360 : 310));
          const y = 690 - h + layer * 12;
          g.fillStyle(colors[layer]).fillRect(x, y, w, h + 80);
          g.fillStyle(0x35445f, 0.45).fillRect(x, y, 3, h);
          g.fillStyle(colors[layer]).fillRect(x + w * .3, y - 14, w * .4, 14);
          if (i % 5 === 2) {
            g.fillStyle(0x627091, .25).fillTriangle(x, y, x + w * .8, y - 45, x + w, y);
            g.lineStyle(1, 0xd2caff, .32).lineBetween(x + w * .8, y - 45, x + w * .8, y + h);
          }
          if (i % 3 === 0) {
            g.lineStyle(1, 0x667994, 0.55).lineBetween(x + w / 2, y - 55, x + w / 2, y);
            g.fillStyle(0xf2a4cc, 0.8).fillCircle(x + w / 2, y - 55, 2);
          }
          for (let row = 0; row < h / 15 - 1; row++) for (let col = 0; col < w / 13 - 1; col++) {
            if ((row * 7 + col * 11 + i) % 5 < 2) continue;
            const lit = (row + i) % 7 === 0;
            g.fillStyle(lit ? 0xe7d9ff : 0xa1bfd4, lit ? 0.7 : 0.22 + layer * 0.04);
            g.fillRect(x + 9 + col * 13, y + 12 + row * 15, 3 + (lit ? 3 : 0), 5);
          }
          if ((i + layer) % 4 === 0) {
            g.fillStyle(0xb9c9ed, 0.09).fillRect(x + w - 13, y + 30, 20, h * .5);
            g.fillStyle(0xa7c9ef, 0.55).fillRect(x + w - 5, y + 30, 2, h * .5);
          }
          if (layer === 1 && i % 5 === 1) {
            g.fillStyle(0xb898f3, .08).fillRect(x - 8, y + 50, w + 16, 65);
            g.fillStyle(0xb898f3, .7).fillRect(x, y + 58, w, 2).fillRect(x, y + 105, w, 2);
            for (let n = 0; n < 4; n++) {
              g.lineStyle(2, 0xe0ccff, .6).strokeRect(x + 9 + n * 16, y + 70, 9, 22);
            }
          }
        }
        g.generateTexture(key, 2640, 800); g.destroy();
      }
      this.layers.push(scene.add.tileSprite(0, 0, 1280, 800, key).setOrigin(0).setScrollFactor(0).setDepth(-80 + layer * 12));
    }
    this.scenery = scene.add.graphics().setScrollFactor(0).setDepth(-25);
    this.atmosphere = scene.add.graphics().setScrollFactor(0).setDepth(8);
    const labels = ['N E X U S', '夜 / CITY', 'AETHER\nSYSTEMS'];
    labels.forEach((label, i) => this.signs.push(scene.add.text(0, 0, label, {
      fontFamily: 'Consolas, monospace', fontSize: i === 2 ? '22px' : '17px', color: '#b3bef5', align: 'center', lineSpacing: 7,
    }).setScrollFactor(0).setDepth(-35).setAlpha(.7)));
  }
  update(delta: number, scroll: number, p: Presentation, reduced: boolean, district: number) {
    const area = district % 4, theme = AREAS[area];
    const camera = this.scene.cameras.main, width = camera.width / camera.zoom;
    const dt = Math.min(delta, 40) / 1000;
    this.phase += reduced ? 0 : dt * (.65 + p.activity * .5);
    const t = this.phase, accent = theme.color;
    const target = Phaser.Display.Color.IntegerToRGB(theme.sky);
    this.palette.r = Phaser.Math.Linear(this.palette.r, target.r, dt * 3);
    this.palette.g = Phaser.Math.Linear(this.palette.g, target.g, dt * 3);
    this.palette.b = Phaser.Math.Linear(this.palette.b, target.b, dt * 3);
    const skyColor = Phaser.Display.Color.GetColor(this.palette.r, this.palette.g, this.palette.b);
    const sky = this.sky.clear();
    sky.fillGradientStyle(skyColor, skyColor, theme.floor, 0x080e1b, 1).fillRect(0, -300, width + 20, 1200);
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].setVisible(area === 0 || area === 2).setSize(width + 20, 800).setTint(accent).setAlpha(area === 0 ? 1 : .5);
      this.layers[i].tilePositionX = scroll * (.1 + i * .16);
    }
    const labels = area === 0 ? ['N E X U S', 'RAIN / LINE', 'AETHER SYSTEMS'] : area === 1 ? ['CORE 07', 'BIO / REACTOR', 'COOLANT FLOW'] : area === 2 ? ['NEON TRANSIT', 'PLATFORM 09 →', 'EXPRESS // 240'] : ['CONTAINMENT LOST', 'LAB / 04', 'EVACUATE'];
    this.signs.forEach((sign, i) => {
      const period = width + 500;
      const x = ((280 + i * 540 - scroll * .22) % period + period) % period - 100;
      sign.setText(labels[i]).setPosition(x, 220 + i * 52).setTint(accent);
      sign.setAlpha(reduced ? .6 : area === 3 ? .4 + .3 * Math.max(0, Math.sin(t * 7 + i)) : .65);
    });
    const g = this.scenery.clear(), rain = this.atmosphere.clear();
    const wrap = (x: number, parallax = .3) => ((x - scroll * parallax) % (width + 600) + width + 600) % (width + 600) - 250;
    if (area === 0) {
      // Antennas, holographic billboards, flying traffic and wind-driven rain.
      for (let i = 0; i < 5; i++) {
        const x = wrap(i * 390);
        g.lineStyle(2, 0x607ca6, .6).lineBetween(x, 560, x, 370).lineBetween(x - 28, 395, x + 28, 395).lineBetween(x - 18, 414, x + 18, 414);
        g.fillStyle(accent, .08).fillRect(x + 65, 280, 170, 80);
        g.lineStyle(2, 0xc99aff, .5).strokeRect(x + 65, 280, 170, 80);
        for (let k = 0; k < 5; k++) g.fillStyle(accent, .35).fillRect(x + 78 + k * 28, 300, 15, 38);
      }
      for (let i = 0; i < 8; i++) {
        const x = wrap(i * 277 + t * (35 + i * 9), .08), y = 175 + i * 37;
        g.lineStyle(2, accent, .15).lineBetween(x - 60, y, x, y);
        g.fillStyle(0x8aaacd).fillRoundedRect(x, y - 4, 24, 8, 4);
        g.fillStyle(0xffbde9).fillRect(x + 21, y - 1, 5, 2);
      }
      rain.lineStyle(1, 0xa3cfff, .22);
      for (let i = 0; i < (reduced ? 20 : 145); i++) {
        const x = ((i * 113.7 - t * 130) % width + width) % width;
        const y = (i * 79.1 + t * (380 + i % 5 * 25)) % 760 - 20;
        rain.lineBetween(x, y, x - 13, y + 26);
      }
      if (!reduced && t % 17 < .15) g.lineStyle(2, 0xb8caff, .35).lineBetween(width * .8, 30, width * .78, 130).lineBetween(width * .78, 130, width * .82, 150).lineBetween(width * .82, 150, width * .77, 260);
    } else if (area === 1) {
      // Enormous reactor vessels, coolant pipes, bioluminescent vines and steam.
      for (let i = 0; i < 4; i++) {
        const x = wrap(i * 490);
        g.lineStyle(18, 0x235449).lineBetween(x - 100, 640, x - 100, 350).lineBetween(x - 100, 350, x + 170, 350);
        g.lineStyle(3, accent, .5).lineBetween(x - 100, 640, x - 100, 350).lineBetween(x - 100, 350, x + 170, 350);
        g.fillStyle(0x102e2d).fillRoundedRect(x, 240, 150, 360, 45);
        for (let n = 6; n > 0; n--) g.fillStyle(accent, .018).fillEllipse(x + 75, 420, 125 + n * 24, 280 + n * 10);
        g.fillStyle(accent, .24).fillRoundedRect(x + 30, 290, 90, 240, 35);
        g.lineStyle(4, accent, .6).strokeEllipse(x + 75, 420, 130, 310);
        for (let j = 0; j < 6; j++) {
          g.lineStyle(2, accent, .2).lineBetween(x + 32, 300 + j * 40, x + 115, 300 + j * 40);
          const vineX = x + 185 + j * 9, vineY = 570 - j * 25;
          g.lineStyle(3, 0x428d68).lineBetween(x + 195, 650, vineX, vineY);
          g.fillStyle(j % 2 ? 0x79d77d : 0x2fa58b, .8).fillEllipse(vineX + 12, vineY, 30, 10);
          const steamY = 550 - ((t * 32 + j * 25) % 160);
          g.fillStyle(0xabf5d9, .045).fillEllipse(x - 70 + Math.sin(t + j) * 14, steamY, 45 + j * 5, 20);
          g.fillStyle(accent, .7).fillCircle(x - 100, 370 + ((t * 80 + j * 40) % 240), 3);
        }
      }
    } else if (area === 2) {
      // Elevated rail infrastructure and visibly moving multi-car express trains.
      for (let lane = 0; lane < 2; lane++) {
        const y = 350 + lane * 130;
        g.lineStyle(5, 0x6e527c).lineBetween(0, y + 45, width, y + 45);
        g.lineStyle(1, accent, .5).lineBetween(0, y + 52, width, y + 52);
        for (let i = 0; i < 8; i++) {
          const x = wrap(i * 250 + t * (lane ? -240 : 170), .18);
          g.fillStyle(lane ? 0x40335c : 0x584364).fillRoundedRect(x, y - 34, 230, 74, 12);
          g.fillStyle(accent, .8).fillRect(x + 10, y + 26, 210, 3);
          for (let k = 0; k < 5; k++) g.fillStyle(0xacdeff, .4).fillRoundedRect(x + 16 + k * 42, y - 20, 30, 27, 4);
        }
        for (let i = 0; i < 6; i++) { const x = wrap(i * 350); g.lineStyle(8, 0x302843).lineBetween(x, y + 50, x, 740); }
      }
      for (let i = 0; i < 12; i++) { const x = wrap(i * 170 + t * 350, .06); g.lineStyle(2, accent, .25).lineBetween(x - 75, 190 + i * 8, x, 190 + i * 8); }
    } else {
      // Enclosed lab architecture replaces the city skyline entirely.
      for (let i = 0; i < 5; i++) {
        const x = wrap(i * 370);
        g.fillStyle(0x241d2e).fillRect(x, 170, 330, 530);
        g.lineStyle(4, 0x57404c).strokeRect(x, 170, 330, 530);
        g.fillStyle(0x090e20).fillRect(x + 20, 270, 175, 250);
        g.lineStyle(2, 0x7f9fa9, .45).lineBetween(x + 20, 270, x + 100, 365).lineBetween(x + 100, 365, x + 70, 430).lineBetween(x + 100, 365, x + 195, 400);
        g.fillStyle(0x83b7c7, .15).fillTriangle(x + 20, 270, x + 65, 315, x + 20, 360);
        g.fillStyle(accent, reduced ? .5 : .25 + Math.max(0, Math.sin(t * 5 + i)) * .4).fillRect(x + 35, 195, 245, 5);
        g.fillStyle(0x8e304c, .1).fillTriangle(x + 155, 200, x - 80, 650, x + 380, 650);
        g.fillStyle(0x50334a).fillRect(x + 220, 310, 80, 70);
        g.lineStyle(2, accent, .7).strokeTriangle(x + 260, 321, x + 235, 365, x + 285, 365);
        g.lineStyle(10, 0x4d4758).lineBetween(x + 245, 600, x + 215, 560).lineBetween(x + 215, 560, x + 260, 530);
        g.fillStyle(0x555062).fillCircle(x + 260, 524, 18);
        for (let j = 0; j < 7; j++) g.fillStyle(0x88abb5, .4).fillTriangle(x + j * 26, 645, x + j * 26 + 18, 651, x + j * 26 + 7, 634);
      }
    }
    rain.fillGradientStyle(theme.floor, theme.floor, 0x050916, 0x050916, 0, 0, .3, .3).fillRect(0, 620, width, 180);
  }
  destroy() { this.signs.forEach(s => s.destroy()); this.layers.forEach(s => s.destroy()); this.sky.destroy(); this.atmosphere.destroy(); this.scenery.destroy(); }
}
