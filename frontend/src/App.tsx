import Game from './game/Game';
import HUD from './ui/components/HUD';
import './ui/styles/global.css';

export default function App() {
  return (
    <main className="app-shell">
      <HUD />
      <section className="play-area" aria-label="EchoShift game preview">
        <div className="stage-heading">
          <span>01 / THE QUIET FIELD</span>
          <span className="stage-heading__status">
            <span className="status-dot" aria-hidden="true" />
            SCENE PREVIEW
          </span>
        </div>
        <Game />
        <footer className="stage-footer">
          <span>FIELD NOTES</span>
          <span>Prototype environment</span>
          <span>ECHOSHIFT // 001</span>
        </footer>
      </section>
    </main>
  );
}
