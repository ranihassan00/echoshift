import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { PlayerState } from '../shared/contracts';
import { RunHUD } from '../ui/components/HUD';
import { GAME_CONFIG } from './config';
import EchoScene from './scenes/EchoScene';
import { PROFILES } from './profiles';
import { emptyRun, type RunSnapshot } from './run';

/** A supplied target is committed input; no target enables labelled simulation. */
export default function Game({ targetState }: { targetState?: PlayerState }) {
  const mount = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const scene = useRef<EchoScene | null>(null);
  const restartButton = useRef<HTMLButtonElement>(null);
  const [demoState, setDemoState] = useState<PlayerState>('UNKNOWN');
  const [run, setRun] = useState<RunSnapshot>({ ...emptyRun });
  const [settings, setSettings] = useState(false);
  const [reduced, setReduced] = useState(false);
  const state = targetState ?? demoState;
  const latest = useRef(state); latest.current = state;
  useEffect(() => {
    if (!mount.current) return;
    let active = true;
    const instance = new EchoScene(() => latest.current, value => { if (active) setRun(value); }, accent => shell.current?.style.setProperty('--signal', accent));
    scene.current = instance;
    const game = new Phaser.Game({ ...GAME_CONFIG, parent: mount.current, scene: [instance] });
    return () => { active = false; scene.current = null; game.destroy(true); };
  }, []);
  useEffect(() => { scene.current?.setTargetState(state); }, [state]);
  useEffect(() => { scene.current?.setReducedMotion(reduced); }, [reduced]);
  useEffect(() => { if (run.over) restartButton.current?.focus(); }, [run.over]);
  const restart = () => { scene.current?.restartRun(); mount.current?.focus(); };
  const companion = run.distance < 15 ? 'The grid is going dark. Keep moving, runner.' : run.distance < 60 ? 'Amber means danger. Hold your jump to clear it.' : run.distance < 160 ? 'Those fragments carry energy. Take what you can.' : run.distance < 230 ? 'Security is awake. Jump over it, or land on top.' : 'Stay above the noise. The city keeps going.';
  return <div className="game-shell" ref={shell}>
    <div className="game-mount" ref={mount} tabIndex={0} role="application" aria-label="EchoShift continuous run. A D or arrows move. Hold Space or Up to jump higher. R restarts." />
    <div className="cinema-vignette" aria-hidden="true" />
    <RunHUD run={run} state={state} simulated={targetState === undefined} />
    <div className="district-stamp"><span>SECTOR {String(Math.floor(run.distance / 432) + 1).padStart(2, '0')}</span><strong>{run.district}</strong><i /></div>
    <div className="companion"><div className="companion__icon">✧</div><div><small>ECHO / LOCAL TRANSMISSION</small><p>{companion}</p></div></div>
    <div className="bottom-controls"><span><kbd>A</kbd><kbd>D</kbd> MOVE</span><span><kbd>SPACE</kbd> HOLD TO JUMP</span><span><kbd>R</kbd> RESTART</span></div>
    <div className="game-settings">
      <button className="settings-trigger" aria-expanded={settings} aria-controls="signal-settings" onClick={() => setSettings(!settings)}>☷ {targetState === undefined ? 'DEMO / SETTINGS' : 'SETTINGS'}</button>
      {settings && <div id="signal-settings" className="settings-popover">
        {targetState === undefined && <><strong>SIMULATED SIGNAL</strong><p>Game states for demonstration. No live sensing.</p><div className="state-buttons">{(Object.keys(PROFILES) as PlayerState[]).map(value => <button key={value} aria-pressed={state === value} onClick={() => { setDemoState(value); mount.current?.focus(); }}>{PROFILES[value].symbol} {value}</button>)}</div></>}
        <label><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} /> Reduce motion & screen shake</label>
        <button onClick={() => { setSettings(false); mount.current?.focus(); }}>RETURN TO RUN ↗</button>
      </div>}
    </div>
    {run.newBest && !run.over && run.score > 100 && <div className="record-marker">↗ PERSONAL BEST</div>}
    {run.over && <div className="game-over" role="dialog" aria-modal="true" aria-labelledby="run-ended">
      <div className="game-over__panel"><span className="eyebrow">TRANSMISSION ENDED</span><h1 id="run-ended">One more<br /><em>run.</em></h1><p>{run.reason}</p>
        <div className="final-score"><small>FINAL SCORE</small><strong>{run.score.toLocaleString()}</strong>{run.newBest && <span>↗ NEW HIGH SCORE</span>}</div>
        <div className="final-stats"><div><small>BEST</small><b>{run.best.toLocaleString()}</b></div><div><small>DISTANCE</small><b>{run.distance} m</b></div><div><small>FRAGMENTS</small><b>{run.fragments}</b></div></div>
        {!run.saved && <p className="save-note">Saving unavailable. Your best stays available for this session.</p>}
        <button className="restart-button" ref={restartButton} onClick={restart}>RUN IT BACK <span>↗</span></button>
      </div>
    </div>}
  </div>;
}
