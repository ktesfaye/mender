import { clockOf, spanOf } from '@shared/five-hours';
import type { Hungry, HungryChoice } from '@shared/hungry';
import { glaze, TINT_ISLAND } from '../glass/glass';
import '../glass/settings.css';
import { px } from '../glass/px';
import { overIsland } from './settings';
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
  const back = el('div', 'st-back');
  back.style.zIndex = '60';
  const panel = glaze(el('div', 'st-ask'), { tint: overIsland() ? TINT_ISLAND : undefined });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  back.appendChild(panel);

  const hd = el('div', 'st-ask-hd');
  const tag = el('span', 'st-tag sore');
  tag.append(px('hourglass', '#f08a72', 11), text('the five hours'));
  hd.appendChild(tag);
  const dear = /fable|mythos/i.test(flagged.model ?? '');
  if (dear) {
    const r = el('span', 'r');
    const vio = el('span', 'st-tag violet');
    vio.append(px('gem', '#c9b2ff', 11), text(modelTag(flagged.model)));
    r.appendChild(vio);
    hd.appendChild(r);
  }

  const heading = el('h2', '');
  heading.textContent = `${flagged.title} is eating your five hours`;

  const stat = el('div', 'st-stat-row');
  const pc = el('div', 'st-pc');
  pc.textContent = flagged.share < 0.01 ? '<1' : String(Math.round(flagged.share * 100));
  const unit = el('small', '');
  unit.textContent = '%';
  pc.appendChild(unit);
  const say = el('div', 'st-say');
  say.append(text(`of your five hours went in the last ${flagged.over} minutes.`));
  if (flagged.usual && flagged.usual >= 1.5) {
    say.append(el('br'), text('that is '));
    const b = el('b', '');
    b.textContent = `about ${Math.round(flagged.usual)} times`;
    say.append(b, text(' what a session here normally takes.'));
  }
  stat.append(pc, say);

  const now = Date.now();
  const facts = el('div', 'st-facts');
  const thinking = el('div', dear ? 'st-fc vio' : 'st-fc');
  thinking.append(px(dear ? 'gem' : 'bolt', dear ? '#c9b2ff' : '#f2c66d', 16));
  const t1 = el('div', '');
  const t1b = el('b', '');
  t1b.textContent = flagged.model ? `thinking with ${flagged.model}` : 'thinking with its default';
  t1.append(t1b);
  if (dear) t1.append(el('br'), text('the dearest of them'));
  thinking.appendChild(t1);
  const spent = el('div', 'st-fc');
  spent.append(px('hourglass', '#ff9a4a', 16));
  const t2 = el('div', '');
  const t2b = el('b', '');
  t2b.textContent = `${percent(flagged.windowShare)} of this window`;
  t2.append(t2b, text(' so far'), el('br'));
  t2.append(text(`${spanOf(flagged.resetsAt - now)} before it would reset`));
  spent.appendChild(t2);
  facts.append(thinking, spent);

  const choices: {
    said: string;
    d: string;
    icon: string;
    cls: string;
    does: () => void;
  }[] = [
    {
      said: flagged.paused ? 'Carry on' : 'Let it carry on',
      d: flagged.paused ? 'it picks up where it was' : 'leave it be',
      icon: 'flame',
      cls: 'hot',
      does: () => finish({ kind: 'carry-on' }),
    },
    ...flagged.cheaper.slice(0, 2).map((one, at) => ({
      said: one.name,
      d: at === 0 ? 'a step down' : 'lighter still',
      icon: 'down',
      cls: 'mod',
      does: () => finish({ kind: 'switch', model: one.id }),
    })),
    {
      said: flagged.paused ? 'Leave it stopped' : 'Stop it',
      d: 'takes its helpers too',
      icon: 'stop',
      cls: 'bad',
      does: () => finish({ kind: 'stop' }),
    },
    {
      said: 'Walk in, look first',
      d: 'the question waits',
      icon: 'eye',
      cls: '',
      does: () => look(),
    },
  ];
  /* Escape leaves it as it is: stopped if it was, running if it never was. */
  const leave: HungryChoice = flagged.paused ? { kind: 'stop' } : { kind: 'carry-on' };

  const keyCap = (n: number): HTMLElement => {
    const k = el('span', 'g-kc');
    k.textContent = String(n);
    return k;
  };
  const tile = (index: number): HTMLElement => {
    const choice = choices[index]!;
    const row = el('button', `st-tile${choice.cls ? ` ${choice.cls}` : ''}`);
    row.type = 'button';
    const wrap = el('div', '');
    const b = el('b', '');
    b.textContent = choice.said;
    const d = el('span', 'd');
    d.textContent = choice.d;
    wrap.append(b, d);
    row.append(
      px(choice.icon, choice.cls === 'bad' ? '#f08a72' : '#f2c66d', 18),
      wrap,
      keyCap(index + 1)
    );
    row.addEventListener('click', choice.does);
    return row;
  };
  const ways = el('div', 'st-ways');
  const cheap = choices.filter((one) => one.cls === 'mod');
  const stopAt = choices.findIndex((one) => one.cls === 'bad');
  const lookAt = choices.length - 1;
  ways.append(tile(0), tile(lookAt), tile(stopAt));

  const sec = el('div', '');
  const lab = el('div', 'g-pix g-label st-sec-lab');
  lab.textContent = 'ways on · it keeps going while you choose';
  sec.append(lab, ways);
  if (cheap.length) {
    const lab2 = el('div', 'g-pix g-label st-sec-lab second');
    lab2.textContent = 'or carry on with a cheaper model';
    const mods = el('div', 'st-mods');
    choices.forEach((one, index) => {
      if (one.cls !== 'mod') return;
      const m = el('button', 'st-mod');
      m.type = 'button';
      const h = el('div', 'st-mod-h');
      const b = el('b', '');
      b.textContent = one.said;
      h.append(b, keyCap(index + 1));
      const d = el('span', 'd');
      d.style.cssText = 'display:block;font-size:12px;color:var(--g-ink-3);margin-top:3px';
      d.textContent = one.d;
      m.append(h, d);
      m.addEventListener('click', one.does);
      mods.appendChild(m);
    });
    sec.append(lab2, mods);
  }

  panel.append(hd, heading, stat, strip(flagged, now), facts, sec);
  if (flagged.paused) {
    const stopped = el('p', 'st-hint');
    stopped.style.margin = '14px 0 0';
    stopped.style.color = 'var(--g-ember)';
    stopped.textContent = 'Stopped where it was, to ask you.';
    panel.appendChild(stopped);
  }
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
function strip(flagged: Hungry, at: number): HTMLElement {
  const wrap = el('div', '');
  wrap.style.marginTop = '22px';
  const it = el('div', 'st-strip');
  const cells = 40;
  const spent = Math.min(1, flagged.used);
  const its = Math.min(spent, flagged.share);
  const nowAt = Math.min(cells - 1, Math.max(0, Math.round(spent * cells) - 1));
  for (let i = 0; i < cells; i += 1) {
    const cell = el('i', '');
    const from = i / cells;
    if (i === nowAt && spent > 0) cell.classList.add('now');
    else if (from < spent - its) cell.classList.add('o');
    else if (from < spent) cell.classList.add('s');
    it.appendChild(cell);
  }
  const lab = el('div', 'st-lab');
  const k1 = el('span', 'k');
  const sw1 = el('i', '');
  sw1.style.background = '#e8664f';
  k1.append(sw1, text('this session, last 15 minutes'));
  const k2 = el('span', 'k');
  const sw2 = el('i', '');
  sw2.style.background = 'rgba(242,198,109,.4)';
  k2.append(sw2, text('everything else'));
  const e = el('span', 'e');
  e.textContent = flagged.runsOutAt
    ? `would run out about ${clockOf(flagged.runsOutAt, at)} · resets ${clockOf(flagged.resetsAt, at)}`
    : `${Math.round(flagged.used * 100)}% used · resets ${clockOf(flagged.resetsAt, at)}`;
  lab.append(k1, k2, e);
  wrap.append(it, lab);
  return wrap;
}

function modelTag(model: string | null): string {
  return (model ?? 'fable')
    .replace(/^claude-/i, '')
    .replace(/-/g, ' ')
    .slice(0, 14);
}

function text(said: string): Text {
  return document.createTextNode(said);
}

function percent(share: number): string {
  return share < 0.01 ? 'under 1%' : `${Math.round(share * 100)}%`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  if (className) made.className = className;
  return made;
}
