import Phaser from 'phaser';
import { color, type Presentation } from './profiles';

/** Cached parallax textures, bounded rain strokes and a handful of animated landmarks. */
export default class City {
  private sky: Phaser.GameObjects.Graphics;
  private atmosphere: Phaser.GameObjects.Graphics;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private signs: Phaser.GameObjects.Text[] = [];
  private phase = 0;
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
    this.atmosphere = scene.add.graphics().setScrollFactor(0).setDepth(8);
    const labels = ['N E X U S', '夜 / CITY', 'AETHER\nSYSTEMS'];
    labels.forEach((label, i) => this.signs.push(scene.add.text(0, 0, label, {
      fontFamily: 'Consolas, monospace', fontSize: i === 2 ? '22px' : '17px', color: '#b3bef5', align: 'center', lineSpacing: 7,
    }).setScrollFactor(0).setDepth(-35).setAlpha(.7)));
  }
  update(delta: number, scroll: number, p: Presentation, reduced: boolean, district: number) {
    const camera = this.scene.cameras.main;
    const width = camera.width / camera.zoom;
    this.phase += reduced ? 0 : Math.min(delta, 40) / 1000 * (.65 + p.activity * .5);
    const t = this.phase, accent = color(p.ar, p.ag, p.ab), secondary = color(p.sr, p.sg, p.sb);
    const sky = this.sky.clear();
    sky.fillGradientStyle(color(p.r, p.g, p.b), 0x13102c, 0x213552, 0x152c44, 1).fillRect(0, -80, width + 20, 880);
    // Atmospheric depth and a distant reactor halo; never a full-screen flash.
    for (let i = 9; i > 0; i--) {
      sky.fillStyle(secondary, .011).fillEllipse(width * .68, 310, i * 95, i * 57);
      sky.fillStyle(accent, .012).fillEllipse(width * .18, 480, i * 90, i * 31);
    }
    sky.lineStyle(1, secondary, .3).strokeCircle(width * .73 - scroll * .015 % 80, 280, 135);
    sky.lineStyle(7, secondary, .04).strokeCircle(width * .73 - scroll * .015 % 80, 280, 140);
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].setSize(width + 20, 800).setTint(i === 1 ? secondary : accent);
      this.layers[i].tilePositionX = scroll * (.1 + i * .16);
    }
    const g = this.atmosphere.clear();
    // An elevated transit spine and moving air traffic behind gameplay geometry.
    this.signs.forEach((sign, i) => {
      const period = width + 500;
      const x = ((620 + i * 540 - scroll * .27) % period + period) % period - 100;
      sign.setPosition(x, 245 + i * 47).setTint(i % 2 ? accent : secondary);
      sign.setAlpha(.5 + .12 * Math.sin(t * 1.2 + i));
    });
    for (let i = 0; i < 6; i++) {
      const x = ((i * 317 + t * (14 + i * 5) - scroll * .08) % (width + 200) + width + 200) % (width + 200) - 100;
      const y = 220 + i * 39;
      g.lineStyle(1, i % 2 ? secondary : accent, .18).lineBetween(x - 28, y, x, y);
      g.fillStyle(accent, .7).fillRect(x, y, 10, 2);
    }
    if (!reduced) {
      // Thin localized lightning is low contrast, infrequent, and behind the HUD.
      const lightning = t % 19;
      if (lightning < .16) {
        const x = width * .84;
        g.lineStyle(1, 0xc8d3fc, .18).lineBetween(x, 60, x - 15, 140).lineBetween(x - 15, 140, x + 8, 155).lineBetween(x + 8, 155, x - 30, 230);
      }
    }
    const rainCount = reduced ? 16 : 72;
    g.lineStyle(1, accent, .10 + p.activity * .07);
    for (let i = 0; i < rainCount; i++) {
      const x = ((i * 113.7 - t * 62) % width + width) % width;
      const y = (i * 79.1 + t * (290 + i % 5 * 25)) % 760 - 20;
      g.lineBetween(x, y, x - 7, y + 20);
    }
    // Low haze stays below the platform tops; roof edges and threats remain clear.
    g.fillGradientStyle(0x263a5a, 0x263a5a, 0x050916, 0x050916, 0, 0, .35, .35).fillRect(0, 575, width, 200);
    if (district % 3 === 2) {
      g.lineStyle(2, secondary, .1).strokeCircle(width * .76, 340, 95);
      g.lineStyle(1, accent, .2).strokeCircle(width * .76, 340, 72);
    }
  }
  destroy() { this.signs.forEach(s => s.destroy()); this.layers.forEach(s => s.destroy()); this.sky.destroy(); this.atmosphere.destroy(); }
}
