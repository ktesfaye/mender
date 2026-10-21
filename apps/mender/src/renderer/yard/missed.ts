/**
 * What happened while he was away, said once, plainly, over the island.
 *
 * Not a toast: a slip of glass with nothing to dismiss. Gold is reserved for
 * what is pressable and this is not — it is read and it settles back on
 * its own, the same way a result on the wood settles once it has had time to
 * be read. It stands over the top of the island rather than inside whatever
 * board happens to be open, since it is not about any one session; it names
 * a session, but does not offer a way in — landing there is one click on the
 * rail or the finder away, same as it always was.
 */

import { glaze } from '../glass/glass';
import { ISLAND_LOOK } from '../glass/island-look';
import '../glass/island.css';
import { cutOf, KIT_NAMES, sprite } from './sprite';

/** Long enough on screen to read a short list, then it fades. */
const STAND_MS = 7000;
const FADE_MS = 600;

const MOODS: Record<string, { dot: string; glow: boolean }> = {
  asked: { dot: 'var(--g-ember)', glow: true },
  finished: { dot: 'var(--g-moss)', glow: false },
  broke: { dot: 'var(--g-sore)', glow: false },
};

/* When the window last lost his eyes, so how long he was gone can be said. */
let blurredAt: number | null = null;
window.addEventListener('blur', () => {
  blurredAt = Date.now();
});

function awayFor(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(ms / 360_000) / 10;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function showMissed(lines: string[]): void {
  if (lines.length === 0) return;

  document.querySelector('.i-missed')?.remove();

  const line = glaze(document.createElement('div'), {
    ...ISLAND_LOOK,
    tint: 'rgba(16, 18, 22, 0.72)',
  });
  line.className += ' i-missed';

  const lantern = document.createElement('div');
  const cut = cutOf(KIT_NAMES.lanternOn);
  lantern.style.cssText = `position:relative;flex:none;width:${cut?.w ?? 16}px;height:${cut?.h ?? 16}px`;
  lantern.appendChild(sprite(KIT_NAMES.lanternOn, 1));
  const title = document.createElement('b');
  title.textContent = 'while you were away';
  const lead = document.createElement('div');
  lead.className = 'i-lh';
  const words = document.createElement('div');
  words.appendChild(title);
  if (blurredAt !== null) {
    const small = document.createElement('small');
    small.textContent = awayFor(Date.now() - blurredAt);
    words.appendChild(small);
  }
  lead.append(lantern, words);

  const chips = document.createElement('div');
  chips.className = 'i-ch';
  for (const said of lines) {
    const chip = document.createElement('span');
    chip.className = 'g-chip';
    const verb = Object.keys(MOODS).find((one) => said.endsWith(` ${one}`));
    if (verb) {
      const mood = MOODS[verb]!;
      const dot = document.createElement('span');
      dot.className = 'g-dot';
      dot.style.background = mood.dot;
      if (mood.glow) dot.style.boxShadow = `0 0 8px ${mood.dot}`;
      const who = document.createElement('span');
      who.textContent = said.slice(0, -verb.length - 1);
      who.style.cssText = 'max-width:220px;overflow:hidden;text-overflow:ellipsis';
      const what = document.createElement('em');
      what.textContent = verb;
      chip.append(dot, who, what);
    } else {
      chip.className = 'g-chip g-faint';
      chip.textContent = said.replace(/^(\d+) more$/, 'and $1 more');
    }
    chips.appendChild(chip);
  }

  const fade = document.createElement('div');
  fade.className = 'i-fade';
  const run = document.createElement('i');
  run.style.setProperty('--i-stand', `${STAND_MS}ms`);
  fade.appendChild(run);

  line.append(lead, chips, fade);
  document.body.appendChild(line);

  requestAnimationFrame(() => {
    line.style.opacity = '1';
  });

  window.setTimeout(() => {
    line.style.opacity = '0';
    window.setTimeout(() => line.remove(), FADE_MS);
  }, STAND_MS);
}
