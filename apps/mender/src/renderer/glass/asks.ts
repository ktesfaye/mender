/**
 * What an agent asks, drawn as one pane of lantern glass pinned over the line
 * it is answered on: a question with its answers, several questions in turn,
 * the check before they go back, and several permissions marked together.
 *
 * The keyboard is the same everywhere: the arrows walk a light over whatever
 * can be pressed, return or space presses what it is on, a number presses that
 * answer outright, and tab sends whatever is ticked. Writing anything on the
 * line is answering in your own words, so the keys stand down.
 */

import { SEND_ALL } from '../board/work';
import { figure } from '../yard/pictures';
import type { Asking } from '../yard/what';
import { glaze } from './glass';
import { previewOf } from './preview';
import { px } from './px';
import './asks.css';

export interface AskDoings {
  answer(id: string, requestId?: string): void;
}

type Answer = Asking['answers'][number];

/** Where the keyboard is standing on the question up at the gate. It is kept
 *  per question, so moving on starts at the top of the next one, or on "send
 *  it" at the check. */
let askFocus = { key: '', at: 0 };

function askKeyOf(asking: Asking): string {
  return `${asking.said}|${asking.answers.map((one) => one.id).join(',')}`;
}

const isSubmit = (one: Answer): boolean => one.kind === 'submit' || one.id === SEND_ALL;
const isAction = (one: Answer): boolean => isSubmit(one) || one.kind === 'talk';
const isCheck = (asking: Asking): boolean => asking.answers.some((one) => one.id.startsWith('q:'));

function askFocusOf(asking: Asking): number {
  const key = askKeyOf(asking);
  if (askFocus.key !== key) {
    const send = asking.answers.findIndex(isSubmit);
    askFocus = { key, at: isCheck(asking) && send >= 0 ? send : 0 };
  }
  return Math.min(askFocus.at, asking.answers.length - 1);
}

/** Lights the line the keyboard is on, without drawing the question again. */
function lightAsk(at: number): void {
  for (const each of document.querySelectorAll<HTMLElement>('[data-ask-at]')) {
    each.classList.toggle('ga-cur', Number(each.dataset.askAt) === at);
  }
}

/**
 * The question's own keys. True when it took the key: the arrows, return and
 * the numbers, but only while nothing is written on the line, because
 * anything written there is your own answer and return sends that instead.
 */
export function askKey(
  asking: Asking | undefined,
  written: string,
  event: KeyboardEvent,
  does: AskDoings
): boolean {
  if (!asking || written.trim()) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const at = askFocusOf(asking);
  const count = asking.answers.length;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    askFocus.at = (at + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
    lightAsk(askFocus.at);
    return true;
  }
  /* "send it" and "talk it over instead" sit side by side, so left and right
     walk between them, and from any answer step down onto that line. */
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const doings = asking.answers
      .map((one, index) => ({ one, index }))
      .filter(({ one }) => isAction(one))
      .map(({ index }) => index);
    if (!doings.length) return true;
    const along = doings.indexOf(at);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    askFocus.at =
      along < 0
        ? doings[step > 0 ? 0 : doings.length - 1]!
        : doings[(along + step + doings.length) % doings.length]!;
    lightAsk(askFocus.at);
    return true;
  }
  const pick = (index: number): boolean => {
    const answer = asking.answers[index];
    if (!answer) return false;
    askFocus.at = index;
    lightAsk(index);
    does.answer(answer.id, answer.requestId);
    return true;
  };
  if (event.key === 'Enter' || event.key === ' ') return pick(at) || true;
  /* Tab sends whatever is ticked, so a question that takes several is never
     a walk down past every answer to reach the line that sends them. */
  if (event.key === 'Tab' && !event.shiftKey) {
    const send = asking.answers.findIndex(isSubmit);
    return send >= 0 ? pick(send) : false;
  }
  if (/^[1-9]$/.test(event.key)) {
    const numbered = asking.answers
      .map((one, index) => ({ one, index }))
      .filter(({ one }) => !isAction(one));
    const hit = numbered[Number(event.key) - 1];
    return hit ? pick(hit.index) : true;
  }
  return false;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  text?: string
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const upper = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** One thing on the pane that can be pressed, lit when the keyboard is on it. */
function pressable<T extends HTMLElement>(node: T, i: number, answer: Answer, does: AskDoings): T {
  node.dataset.askAt = String(i);
  node.addEventListener('mousedown', (event) => event.preventDefault());
  node.addEventListener('mouseenter', () => {
    askFocus.at = i;
    lightAsk(i);
  });
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    askFocus.at = i;
    does.answer(answer.id, answer.requestId);
  });
  return node;
}

function tag(text: string, sign: string, kind = ''): HTMLElement {
  const t = el('span', `ga-tag ${kind}`);
  t.appendChild(px(sign, 'currentColor', 11));
  t.appendChild(el('span', 'g-pix', text));
  return t;
}

/** Which of how many, as short bars, the one it is on lit. */
function steps(step: string | undefined): HTMLElement | null {
  const m = step?.match(/^(\d+) of (\d+)$/);
  if (!m) return null;
  const at = Number(m[1]);
  const all = Number(m[2]);
  const bars = el('span', 'ga-of');
  bars.title = step!;
  for (let n = 1; n <= all; n += 1) bars.appendChild(el('i', n === at ? 'on' : ''));
  return bars;
}

export function gate(wide: number, asking: Asking, does: AskDoings): HTMLElement {
  const holder = el('div', 'ga-holder');
  const card = glaze(el('div', 'ga'), {
    tint: 'rgba(14, 15, 18, 0.55)',
    blur: 26,
    thick: 26,
  });
  card.style.maxWidth = `${wide}px`;
  holder.appendChild(card);
  const focus = askFocusOf(asking);

  const checking = isCheck(asking);
  const several = !checking && asking.answers.some((one) => one.kind === 'submit');
  const permits = !!asking.multi && asking.answers.some((one) => one.requestId);

  const numbers = new Map<number, number>();
  let counted = 0;
  asking.answers.forEach((one, i) => {
    if (!isAction(one)) numbers.set(i, (counted += 1));
  });
  const picked = (one: Answer): boolean => one.said.startsWith('✓ ');
  const plain = (one: Answer): string => one.said.replace(/^✓ /, '');

  const head = el('div', 'ga-head');
  card.appendChild(head);
  const body = el('div', 'ga-body');
  card.appendChild(body);
  const foot = el('div', 'ga-foot');

  if (permits) {
    const asked = new Map<string, { i: number; one: Answer }[]>();
    asking.answers.forEach((one, i) => {
      if (isAction(one) || !one.requestId) return;
      const list = asked.get(one.requestId) ?? [];
      list.push({ i, one });
      asked.set(one.requestId, list);
    });
    const marked = [...asked.values()].filter((list) => list.some(({ one }) => picked(one))).length;
    head.appendChild(tag(`${asked.size} things want your yes`, 'lock'));
    const count = el('span', 'ga-count');
    const b = el('b', '', String(marked));
    count.append(b, ` of ${asked.size} marked`);
    head.appendChild(count);
    body.appendChild(el('h2', 'ga-q', 'Mark each one, then send them together'));
    const list = el('div', 'ga-list');
    for (const options of asked.values()) {
      const deed = plain(options[0]!.one).split(' — ')[0] ?? '';
      const row = el('div', 'ga-row');
      const icon = el('span', 'ga-ic');
      const [sign, tone] = /^(wrote|changed|removed)\b/.test(deed)
        ? ['pen', '#f2c66d']
        : /^(read|looked for)\b/.test(deed)
          ? ['eye', '#f6ecdb']
          : /^[\w.-]+: /.test(deed)
            ? ['bolt', '#7aaaff']
            : ['flame', '#ff9a4a'];
      icon.appendChild(px(sign!, tone!, 17));
      row.appendChild(icon);
      const what = el('div', 'ga-what');
      what.appendChild(el('b', '', deed));
      row.appendChild(what);
      const segs = el('span', 'ga-ans');
      for (const { i, one } of options) {
        const name = plain(one).split(' — ').slice(1).join(' — ');
        const refuse = /^(reject|deny|no|don)/i.test(name);
        const seg = el('span', `ga-seg${picked(one) ? (refuse ? ' no' : ' on') : ''}`);
        seg.appendChild(el('span', 'g-kc', String(numbers.get(i))));
        seg.appendChild(document.createTextNode(name));
        segs.appendChild(pressable(seg, i, one, does));
      }
      row.appendChild(segs);
      list.appendChild(row);
    }
    body.appendChild(list);
  } else {
    head.appendChild(
      tag(
        checking
          ? "it's asking you · last look"
          : ["it's asking you", asking.header?.toLowerCase()].filter(Boolean).join(' · '),
        'spark',
        'ember'
      )
    );
    const bars = steps(asking.step);
    if (bars) head.appendChild(bars);
    body.appendChild(el('h2', 'ga-q', checking ? 'Check before it goes' : asking.said));
    if (several) {
      const n = asking.answers.filter((one) => !isAction(one) && picked(one)).length;
      body.appendChild(el('div', 'ga-sub', n ? `${n} ticked` : 'none ticked yet'));
    }
    const shown = asking.answers.some((one) => one.preview);
    if (!shown && asking.pictures?.length) {
      const row = el('div', 'ask-pictures');
      for (const one of asking.pictures) row.appendChild(figure({ name: one.name, url: one.path }));
      body.appendChild(row);
    }
    const list = el('div', checking ? 'ga-list' : 'ga-opts');
    asking.answers.forEach((one, i) => {
      if (isAction(one)) return;
      const n = numbers.get(i)!;
      if (checking) {
        const row = el('div', 'ga-row ga-check');
        row.appendChild(el('span', 'ga-n', String(n)));
        row.appendChild(el('span', 'ga-qn', plain(one)));
        const a = el('span', 'ga-a');
        const said = one.about ?? '';
        if (said === 'not answered') a.appendChild(el('span', 'none', said));
        else for (const part of said.split(', ')) a.appendChild(el('span', '', part));
        row.appendChild(a);
        row.appendChild(el('span', 'ga-ch', 'change'));
        list.appendChild(pressable(row, i, one, does));
        return;
      }
      const other = one.kind === 'other';
      const on = picked(one);
      const o = el('div', `ga-o${several ? ' box' : ''}${on ? ' on' : ''}${other ? ' else' : ''}`);
      const look = one.preview ? previewOf(one.preview) : null;
      if (look) {
        o.classList.add('has-prev');
        o.appendChild(look);
      }
      const ring = el('span', 'ga-rg');
      o.appendChild(ring);
      const text = el('div', 'ga-t');
      const name = el('b', '', plain(one).replace(/\s*\(recommended\)\s*$/i, ''));
      if (/\(recommended\)\s*$/i.test(plain(one)))
        name.appendChild(el('em', 'ga-rec', 'recommended'));
      text.appendChild(name);
      const about = one.about ?? (other ? 'write it on the line below' : undefined);
      if (about) text.appendChild(el('span', 'ga-d', about));
      o.appendChild(text);
      o.appendChild(el('span', 'g-kc', String(n)));
      list.appendChild(pressable(o, i, one, does));
    });
    body.appendChild(list);
    const last = list.lastElementChild;
    if (!checking && last?.classList.contains('else') && list.childElementCount % 2 === 1)
      last.classList.add('wide');
  }

  asking.answers.forEach((one, i) => {
    if (!isAction(one)) return;
    const act = isSubmit(one)
      ? el('span', 'g-pill ga-pill', upper(one.said))
      : el('span', 'ga-talk', one.said);
    foot.appendChild(pressable(act, i, one, does));
  });
  if (foot.childElementCount) card.appendChild(foot);

  requestAnimationFrame(() => lightAsk(focus));
  return holder;
}
