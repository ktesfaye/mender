import { clockOf, spanOf } from '@shared/five-hours';
import type { Hungry, HungryChoice } from '@shared/hungry';

import { ask } from './standing';

/**
 * A session caught eating the five hours, put to him over everything.
 *
 * The same window settings are in, because this is about the account rather
 * than the work: what the session took and how that compares with normal, a
 * strip of the window with its part in the sore red, what it is thinking
 * with, and the ways on. A number key picks one; Escape leaves it stopped.
 */

export interface HungryDoings {
  answer(choice: HungryChoice): void;
  /** Walk into it to look, leaving the question standing. */
  look(): void;
}

export interface HungryBoard {
  close(): void;
  task: string;
}

export function openHungry(flagged: Hungry, does: HungryDoings): HungryBoard {
  const back = el('div', 'settings-back');
  back.style.zIndex = '60';
  const panel = el('div', 'settings');
  panel.setAttribute('role', 'dialog');
  panel.style.width = 'min(560px, 100%)';
  back.appendChild(panel);

  const head = el('div', 'settings-head');
  const who = el('div', 'settings-who');
  const heading = el('div', 'settings-name founding-heading');
  heading.style.fontSize = '17px';
  heading.style.letterSpacing = '.12em';
  heading.textContent = `${flagged.title} is eating your five hours`;
  who.appendChild(heading);
  head.appendChild(who);

  const body = el('div', 'settings-body');
  body.style.cssText = 'padding:18px 22px 20px;display:flex;flex-direction:column;gap:10px';

  const took = percent(flagged.share);
  const usual =
    flagged.usual && flagged.usual >= 1.5
      ? ` That's about ${Math.round(flagged.usual)} times what a session here normally takes in that time.`
      : '';
  body.append(line(`It took ${took} of your five hours in the last ${flagged.over} minutes.${usual}`, true));

  body.append(strip(flagged));

  const now = Date.now();
  const pace = flagged.runsOutAt
    ? `At that pace it would run your window out on its own around ${clockOf(flagged.runsOutAt, now)}, ${spanOf(flagged.resetsAt - flagged.runsOutAt)} before it resets at ${clockOf(flagged.resetsAt, now)}.`
    : `Your window is ${Math.round(flagged.used * 100)}% used and resets at ${clockOf(flagged.resetsAt, now)}.`;
  body.append(line(pace));
  const thinking = flagged.model ? `It's on ${flagged.model}. ` : '';
  const since = `It's had ${percent(flagged.windowShare)} of this window so far.`;
  body.append(line(`${thinking}${since}`));
  if (flagged.paused) body.append(line('Stopped where it was, to ask you.', false, '#ff9a6a'));

  const choices: { said: string; does: () => void }[] = [
    {
      said: flagged.paused ? 'carry on' : 'let it carry on',
      does: () => finish({ kind: 'carry-on' }),
    },
    ...flagged.cheaper.slice(0, 2).map((one) => ({
      said: `carry on with ${one.name}`,
      does: () => finish({ kind: 'switch', model: one.id }),
    })),
    {
      said: flagged.paused ? 'leave it stopped' : 'stop it',
      does: () => finish({ kind: 'stop' }),
    },
    { said: 'walk in and look first', does: () => look() },
  ];
  /* Escape leaves it as it is: stopped if it was, running if it never was. */
  const leave: HungryChoice = flagged.paused ? { kind: 'stop' } : { kind: 'carry-on' };
  const list = el('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px';
  choices.forEach((choice, index) => {
    const row = el('button', 'settings-button');
    row.type = 'button';
    row.style.cssText += ';text-align:left;display:flex;gap:12px;align-items:baseline';
    const key = el('span');
    key.textContent = String(index + 1);
    key.style.cssText = "font-family:'Courier Prime',monospace;font-size:12px;color:#a89272";
    const said = el('span');
    said.textContent = choice.said;
    row.append(key, said);
    row.addEventListener('click', choice.does);
    list.appendChild(row);
  });
  body.appendChild(list);
  const keys = line('return takes the first · a number picks · escape leaves it as it is');
  keys.style.fontSize = '12px';
  keys.style.color = '#8f7d5c';
  body.appendChild(keys);

  panel.append(head, body);
  document.body.appendChild(back);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );

  let open = true;
  function close(): void {
    if (!open) return;
    open = false;
    window.removeEventListener('keydown', onKey, true);
    unask();
    back.remove();
  }
  function finish(choice: HungryChoice): void {
    close();
    does.answer(choice);
  }
  function look(): void {
    close();
    does.look();
  }
  function onKey(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const picked = Number(event.key);
    if (Number.isInteger(picked) && picked >= 1 && picked <= choices.length) {
      event.preventDefault();
      event.stopPropagation();
      choices[picked - 1]!.does();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish(leave);
      return;
    }
    /* Nothing else typed reaches the board under it while this is up. */
    event.stopPropagation();
  }
  const unask = ask({
    yes: () => choices[0]!.does(),
    no: () => finish(leave),
    at: back,
  });
  window.addEventListener('keydown', onKey, true);

  return { close, task: flagged.task };
}

/** The window as cells: what was spent before, and its last stretch in red. */
function strip(flagged: Hungry): HTMLElement {
  const it = el('div', 'windmill-five-strip');
  it.style.margin = '4px 0 2px';
  const cells = 40;
  const spent = Math.min(1, flagged.used);
  const its = Math.min(spent, flagged.share);
  for (let i = 0; i < cells; i += 1) {
    const cell = el('div', 'windmill-five-cell');
    const from = i / cells;
    if (from < spent - its) cell.classList.add('spent');
    else if (from < spent) cell.style.background = 'var(--yard-wrong)';
    it.appendChild(cell);
  }
  return it;
}

function percent(share: number): string {
  return share < 0.01 ? 'under 1%' : `${Math.round(share * 100)}%`;
}

function line(text: string, big = false, tone?: string): HTMLElement {
  const it = el('p');
  it.style.cssText = `margin:0;font-size:${big ? 18 : 15}px;line-height:1.45;color:${tone ?? (big ? '#f4e3c0' : '#dcc8a0')}`;
  it.textContent = text;
  return it;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  if (className) made.className = className;
  return made;
}
