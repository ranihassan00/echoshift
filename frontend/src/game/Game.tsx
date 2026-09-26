import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from './config';

export default function Game() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const game = new Phaser.Game({ ...GAME_CONFIG, parent: mount });
    return () => game.destroy(true);
  }, []);

  return (
    <div className="game-frame">
      <div className="game-mount" ref={mountRef} aria-label="2D game scene" />
    </div>
  );
}
