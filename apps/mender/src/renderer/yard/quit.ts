/**
 * Quitting with the fire still lit, named before it happens.
 *
 * A pane of glass stands over the village saying what quitting costs — the
 * same shape as every other two-press cost on the wood. Pressing the sore
 * button, or Return, is the second press; anything else,
 * including just waiting, is no.
 */

import { glaze } from '../glass/glass';
import { ISLAND_LOOK } from '../glass/island-look';
import '../glass/island.css';
import { px } from '../glass/px';
import { cutOf, KIT_NAMES, sprite } from './sprite';
import { ask } from './standing';

/** How long the offer stands before it withdraws on its own. */
const STAND_MS = 4000;

export interface Villager {
  name: string;
  doing: string;
  for?: string;
}

const LISTED = 5;

export function showQuitCost(n: number, working: readonly Villager[] = []): void {
  if (document.querySelector('.quit-cost')) return;

  const scrim = document.createElement('div');
  scrim.className = 'quit-cost i-quit-scrim';

  const card = glaze(document.createElement('div'), ISLAND_LOOK);
  card.className += ' i-quit';

  const lanterns = document.createElement('div');
  lanterns.className = 'i-lan';
  const cut = cutOf(KIT_NAMES.lanternOn);
  for (let i = 0; i < Math.min(n, 4); i++) {
    const holder = document.createElement('div');
    holder.style.cssText = `position:relative;width:${cut?.w ?? 16}px;height:${cut?.h ?? 16}px`;
    holder.appendChild(sprite(KIT_NAMES.lanternOn, 1));
    lanterns.appendChild(holder);
  }
  const label = document.createElement('div');
  label.className = 'g-pix';
  label.style.marginBottom = '8px';
  label.textContent = 'quitting the village';
  const title = document.createElement('h1');
  title.className = 'g-serif';
  title.textContent = `${n} villager${n === 1 ? ' is' : 's are'} still working`;
  const top = document.createElement('div');
  top.className = 'i-top';
  const words = document.createElement('div');
  words.append(label, title);
  top.append(lanterns, words);

  const warn = document.createElement('div');
  warn.className = 'i-warn';
  const note = document.createElement('span');
  note.textContent =
    'quitting stops them mid-turn. they pick up from where they were the next time the village opens.';
  warn.append(px('warn_i', '#f08a72', 18), note);

  const keep = document.createElement('span');
  keep.className = 'g-ghost';
  keep.textContent = 'keep working';
  const line = document.createElement('span');
  line.className = 'g-pill g-sore';
  line.append(px('cross_i', '#2b0f08', 13), document.createTextNode('quit anyway'));
  const buttons = document.createElement('div');
  buttons.className = 'i-btns';
  buttons.append(keep, line);

  card.append(top);
  if (working.length > 0) {
    const list = document.createElement('div');
    list.className = 'g-card i-list';
    for (const one of working.slice(0, LISTED)) {
      const row = document.createElement('div');
      row.className = 'i-r';
      const dot = document.createElement('span');
      dot.className = 'g-dot';
      dot.style.background = 'var(--g-ember)';
      dot.style.boxShadow = '0 0 8px var(--g-ember)';
      const who = document.createElement('b');
      who.textContent = one.name;
      const what = document.createElement('span');
      what.className = 'g-mute';
      what.textContent = one.doing;
      row.append(dot, who, what);
      if (one.for) {
        const long = document.createElement('span');
        long.className = 'i-d';
        long.textContent = one.for;
        row.appendChild(long);
      }
      list.appendChild(row);
    }
    if (working.length > LISTED) {
      const more = document.createElement('div');
      more.className = 'i-r g-faint';
      more.textContent = `and ${working.length - LISTED} more`;
      list.appendChild(more);
    }
    card.appendChild(list);
  }
  card.append(warn, buttons);
  scrim.appendChild(card);
  document.body.appendChild(scrim);

  let done = false;
  let timer = 0;
  let unask = (): void => {};

  const withdraw = (): void => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('keydown', onKey, true);
    unask();
    scrim.remove();
  };

  const confirm = (): void => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('keydown', onKey, true);
    unask();
    scrim.remove();
    window.mender?.confirmQuit?.();
  };

  function onKey(event: KeyboardEvent): void {
    // Holding the modifier on its way to a chord is not a key of its own,
    // and Cmd+Q itself is answered in the main process — the one place that
    // actually knows whether a second press landed in time. Everything
    // else typed or pressed here is no.
    if (event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') return;
    if (event.key === 'Shift') return;
    if (event.metaKey && event.key.toLowerCase() === 'q') return;
    withdraw();
  }

  line.addEventListener('click', confirm);
  // Anywhere else on the scrim is the same as walking away.
  keep.addEventListener('click', withdraw);
  scrim.addEventListener('click', (event) => {
    if (card.contains(event.target as Node)) return;
    withdraw();
  });
  /* Return is the same as pressing the line; Escape, like any other key, is no. */
  unask = ask({ yes: confirm, no: withdraw, at: scrim });
  window.addEventListener('keydown', onKey, true);
  timer = window.setTimeout(withdraw, STAND_MS);
}
