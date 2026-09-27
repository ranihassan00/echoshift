import Phaser from 'phaser';
import { MOVEMENT } from './run';
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, backgroundColor: '#080d1c', width: 1280, height: 720,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: MOVEMENT.gravity }, debug: false } },
  render: { antialias: true, pixelArt: false },
  audio: { noAudio: true },
};
