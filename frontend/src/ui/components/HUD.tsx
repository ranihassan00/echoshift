import type { PlayerState } from '../../shared/contracts';
import type { RunSnapshot } from '../../game/run';
import { PROFILES } from '../../game/profiles';

/** Legacy shell slot: the connected HUD is mounted inside Game. */
export default function HUD() { return null; }
export function RunHUD({ run, state, sourceLabel, preview, error }: { run: RunSnapshot; state: PlayerState; sourceLabel: string; preview: boolean; error?: string | null }) {
  return <div className="run-hud">
    <div className="run-hud__left">
      <div className="wordmark">ECHO<span>SHIFT</span><i>↗</i></div>
      <div className="score-line"><div><small>SCORE</small><strong>{String(run.score).padStart(6, '0')}</strong></div><div className="best-score"><small>PERSONAL BEST</small><b>{String(run.best).padStart(6, '0')}</b></div></div>
      <div className="run-vitals"><span className="health" aria-label={`${run.health} of 3 health`}>{[0, 1, 2].map(i => <i key={i} className={i < run.health ? 'filled' : ''} />)}</span><span className="fragment-count">◇ {String(run.fragments).padStart(2, '0')}</span><span>{run.distance} m</span></div>
    </div>
    <div className="run-hud__right"><span className="signal-label">{sourceLabel}</span><div className="signal-value"><i>{PROFILES[state].symbol}</i>{PROFILES[state].label}</div>{preview && <span className="signal-label" style={{ display: 'block' }}>Visual preview — manual states</span>}<small>{PROFILES[state].description}</small>{error && <p role="alert" style={{ maxWidth: 230, fontSize: 12, color: '#ffd1a0' }}>{error}</p>}</div>
  </div>;
}
