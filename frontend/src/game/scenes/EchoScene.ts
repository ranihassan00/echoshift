import Phaser from 'phaser';

export default class EchoScene extends Phaser.Scene {
  constructor() {
    super('EchoScene');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    const graphics = this.add.graphics();

    graphics.fillGradientStyle(0x142a2d, 0x142a2d, 0x10171b, 0x10171b, 1);
    graphics.fillRect(0, 0, width, height);

    graphics.fillStyle(0xe2c58d, 0.75);
    graphics.fillCircle(width * 0.77, height * 0.27, 36);
    graphics.fillStyle(0x142a2d, 0.48);
    graphics.fillCircle(width * 0.79, height * 0.25, 36);

    graphics.fillStyle(0x263b38, 1);
    graphics.fillTriangle(0, height * 0.72, width * 0.29, height * 0.34, width * 0.61, height * 0.72);
    graphics.fillStyle(0x304742, 1);
    graphics.fillTriangle(width * 0.33, height * 0.74, width * 0.68, height * 0.4, width, height * 0.74);

    graphics.fillStyle(0x182927, 1);
    graphics.fillRect(0, height * 0.72, width, height * 0.28);
    graphics.lineStyle(1, 0x91a68b, 0.24);
    graphics.lineBetween(0, height * 0.72, width, height * 0.72);

    const stars = [
      [0.1, 0.2], [0.19, 0.11], [0.31, 0.24], [0.43, 0.13],
      [0.55, 0.2], [0.68, 0.1], [0.88, 0.16], [0.93, 0.32],
    ];
    graphics.fillStyle(0xe8e4cb, 0.68);
    for (const [x, y] of stars) {
      graphics.fillCircle(width * x, height * y, 1.5);
    }

    graphics.fillStyle(0x10201f, 0.4);
    graphics.fillEllipse(width * 0.5, height * 0.84, 115, 19);
    graphics.fillStyle(0xd4a978, 1);
    graphics.fillCircle(width * 0.5, height * 0.69, 14);
    graphics.fillStyle(0xe8d5ae, 1);
    graphics.fillRoundedRect(width * 0.5 - 10, height * 0.72, 20, 42, 8);
    graphics.fillStyle(0x8d5745, 1);
    graphics.fillRoundedRect(width * 0.5 - 12, height * 0.83, 9, 16, 4);
    graphics.fillRoundedRect(width * 0.5 + 3, height * 0.83, 9, 16, 4);
    graphics.fillStyle(0x253b3a, 1);
    graphics.fillCircle(width * 0.5 + 5, height * 0.69, 3);
  }
}
