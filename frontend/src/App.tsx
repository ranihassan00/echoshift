import { useMemo, useState } from 'react';
import Game from './game/Game';
import { usePlayerSensing } from './state/usePlayerSensing';
import { DemoMetricsProvider } from './presage/DemoMetricsProvider';
import { PresageMetricsProvider, type LiveStatus } from './presage/PresageMetricsProvider';
import HUD from './ui/components/HUD';
import './ui/styles/global.css';
import './presage/controls.css';

const demoProvider = () => new DemoMetricsProvider();
const errors: Record<string, string> = {
  unavailable: 'Local sensing service unavailable. Start it, then stop and retry here.',
  busy: 'Another tab is using the camera. Stop that session, then retry.',
  missing_key: 'Add your API key to the sensing service .env file and restart the service.',
  authentication_failed: 'Presage authentication failed. Check the local API key.',
  credits_exhausted: 'Presage credits are exhausted. Live sensing has stopped.',
  camera_unavailable: 'Camera unavailable. Check Windows camera permissions and other camera apps.',
  network_error: 'Presage network connection failed. Live sensing has stopped.',
  disconnected: 'Sensing connection lost. Stop and retry when the service is ready.',
  startup_failed: 'Could not start Presage. Check the local key, camera and service setup.',
};
function statusText(value: LiveStatus) {
  if (value.status === 'error') return errors[value.code ?? ''] ?? 'Live sensing stopped. Check the service, then stop and retry.';
  if (value.status === 'receiving') return 'Receiving reliable Presage measurements.';
  if (value.status === 'connecting') return 'Connecting to the local sensing service…';
  if (value.status === 'positioning') return 'Camera needs a clear view: one face, centered, with good lighting and chest visible.';
  return 'Waiting for reliable measurements. If this persists, check camera positioning and your plan’s pulse/breathing access.';
}

export default function App() {
  const [live, setLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({ status: 'connecting' });
  const provider = useMemo(() => live ? () => new PresageMetricsProvider({ onStatus: setLiveStatus }) : demoProvider, [live]);
  const sensing = usePlayerSensing(provider);
  const liveError = live && liveStatus.status === 'error' ? statusText(liveStatus) : null;
  return (
    <main className="app-shell">
      <HUD />
      <section className="play-area" aria-label="EchoShift game preview">
        <div className="stage-heading"><span>01 / THE QUIET FIELD</span><span className="stage-heading__status"><span className="status-dot" aria-hidden="true" />SCENE PREVIEW</span></div>
        <Game targetState={liveError ? 'UNKNOWN' : sensing.state} signalSource={live ? 'presage' : 'demo'} signalError={sensing.error} />
        <aside className="sensing-controls" aria-label="Sensing controls">
          <button type="button" onClick={() => { setLiveStatus({ status: 'connecting' }); setLive(!live); }}>
            {live ? 'Stop live sensing' : 'Start live sensing'}
          </button>
          <p role="status" aria-live="polite">{live ? statusText(liveStatus) : 'Demo is active. Live sensing uses your webcam and Presage credits.'}</p>
          {live && <span>Stop returns to Demo Mode.</span>}
        </aside>
        <footer className="stage-footer"><span>FIELD NOTES</span><span>Prototype environment</span><span>ECHOSHIFT // 001</span></footer>
      </section>
    </main>
  );
}
