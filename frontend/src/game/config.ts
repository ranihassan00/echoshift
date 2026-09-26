import Phaser from 'phaser';
import EchoScene from './scenes/EchoScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#10171b',
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [EchoScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
};
