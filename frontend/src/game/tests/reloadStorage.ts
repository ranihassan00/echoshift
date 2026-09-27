import { HIGH_SCORE_KEY, HighScore } from '../run';
const marker = 'echoshift-test-reload';
const output = document.querySelector('#results')!;
try {
  const pending = sessionStorage.getItem(marker);
  if (pending) {
    const saved = JSON.parse(pending) as { original: string | null; expected: number };
    const actual = new HighScore().value;
    if (saved.original === null) localStorage.removeItem(HIGH_SCORE_KEY); else localStorage.setItem(HIGH_SCORE_KEY, saved.original);
    sessionStorage.removeItem(marker);
    output.textContent = actual === saved.expected ? 'PASS High score survives an actual page reload. Original score restored.' : 'FAIL Reload persistence';
  } else {
    const original = localStorage.getItem(HIGH_SCORE_KEY);
    const score = new HighScore(); const expected = score.value + 123;
    sessionStorage.setItem(marker, JSON.stringify({ original, expected })); score.record(expected);
    window.location.reload();
  }
} catch (error) { output.textContent = `FAIL ${String(error)}`; }
