export default function HUD() {
  return <header className="hud"><a className="brand" href="/" aria-label="EchoShift home"><span className="brand-mark" aria-hidden="true">E</span><span className="brand-name">EchoShift</span></a><div className="hud-readout"><span className="hud-readout__label">STATION</span><span className="hud-readout__value">ORBITAL RELAY / 01</span></div><div className="hud-readout"><span className="hud-readout__label">MISSION</span><span className="hud-readout__value">RESTORE THE SIGNAL</span></div></header>;
}
