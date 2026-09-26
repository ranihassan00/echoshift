export default function HUD() {
  return (
    <header className="hud">
      <a className="brand" href="/" aria-label="EchoShift home">
        <span className="brand-mark" aria-hidden="true">E</span>
        <span className="brand-name">EchoShift</span>
      </a>
      <div className="hud-readout" aria-label="Prototype status">
        <span className="hud-readout__label">BUILD</span>
        <span className="hud-readout__value">FOUNDATION 01</span>
      </div>
      <div className="hud-readout hud-readout--state">
        <span className="hud-readout__label">PLAYER STATE</span>
        <span className="hud-readout__value">NOT CONNECTED</span>
      </div>
    </header>
  );
}
