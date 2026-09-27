import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { PlayerState } from '../shared/contracts';
import { GAME_CONFIG } from './config';
import EchoScene from './scenes/EchoScene';
import { PROFILES } from './profiles';

/** Omit targetState for simulated controls; pass committed state for integration. */
export default function Game({ targetState }: { targetState?: PlayerState }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EchoScene | null>(null);
  const [demoState, setDemoState] = useState<PlayerState>('UNKNOWN');
  const state = targetState ?? demoState;
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new EchoScene(() => latest.current);
    sceneRef.current = scene;
    const game = new Phaser.Game({ ...GAME_CONFIG, parent: mountRef.current, scene: [scene] });
    return () => { sceneRef.current = null; game.destroy(true); };
  }, []);
  useEffect(() => { sceneRef.current?.setTargetState(state); }, [state]);
  return <div className="game-console">
    <div className="mission"><span>RELAY / 01</span><h1>Bring the signal home.</h1><p>Cross the station, jump over the patrol drone, and reach the uplink.</p></div>
    <div className="state-panel" aria-live="polite">
      <strong>{targetState === undefined ? 'DEMO MODE · SIMULATED' : 'COMMITTED GAME STATE'}</strong>
      <span>{PROFILES[state].symbol} Target: {state}</span>
      <small>{PROFILES[state].description}</small>
    </div>
    {targetState === undefined && <div className="state-controls" aria-label="Simulated state controls">
      {(Object.keys(PROFILES) as PlayerState[]).map(value => <button key={value} type="button" aria-pressed={state === value} onClick={() => setDemoState(value)}>{PROFILES[value].symbol} {value}</button>)}
    </div>}
    <div className="game-frame"><div className="game-mount" ref={mountRef} tabIndex={0} role="application" aria-label="Relay platformer. Arrow keys or A D to move, Space to jump, R to restart." /></div>
    <div className="controls-legend"><span>← → / A D <b>Move</b></span><span>SPACE / ↑ <b>Jump</b></span><span>R <b>Restart</b></span><span>Fixed route · all states playable</span></div>
  </div>;
}
