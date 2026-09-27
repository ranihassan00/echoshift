import Phaser from 'phaser';
import EchoScene from '../scenes/EchoScene';
import { GAME_CONFIG } from '../config';
import { CHUNK_WIDTH, HIGH_SCORE_KEY } from '../run';
import { PROFILES } from '../profiles';
import type { PlayerState } from '../../shared/contracts';
import { AREAS } from '../levels';
const previous = localStorage.getItem(HIGH_SCORE_KEY);
const scene = new EchoScene(() => 'UNKNOWN', run => { document.querySelector('#status')!.textContent = `${run.district} · ${run.hint} · Health ${run.health}`; });
new Phaser.Game({ ...GAME_CONFIG, parent: 'game', scene: [scene] });
const inspect = scene as unknown as { body: Phaser.Physics.Arcade.Body; keys: object; invulnerableUntil: number };
for (let id = 0; id < 8; id++) {
  const button = document.createElement('button'); button.textContent = `${id + 1} ${AREAS[Math.floor(id / 2)].name}`;
  button.onclick = () => { if (!inspect.keys) return; scene.restartRun(); inspect.body.reset(id * CHUNK_WIDTH + 140, 566); button.blur(); };
  document.querySelector('#buttons')!.append(button);
}
for (const state of Object.keys(PROFILES) as PlayerState[]) {
  const button = document.createElement('button'); button.textContent = PROFILES[state].label;
  button.onclick = () => { scene.setTargetState(state); inspect.invulnerableUntil = Infinity; button.blur(); };
  document.querySelector('#buttons')!.append(button);
}
window.addEventListener('pagehide', () => { if (previous === null) localStorage.removeItem(HIGH_SCORE_KEY); else localStorage.setItem(HIGH_SCORE_KEY, previous); });
