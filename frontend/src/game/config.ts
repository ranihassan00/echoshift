import Phaser from 'phaser';
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, backgroundColor: '#1c2632', width: 960, height: 540,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1100 }, debug: false } },
  render: { antialias: true, pixelArt: false },
};
