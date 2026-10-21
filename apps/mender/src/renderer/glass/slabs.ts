/**
 * The small glass slabs: what a right-click on a workspace board, a lantern or
 * the yard's columns opens, and the card that comes down under a board on the
 * beam when it is pointed at. yard.ts places them and owns when they go.
 */

import '../glass/slabs.css';
import { cutOf, KIT_NAMES, sprite } from '../yard/sprite';
import { glaze } from './glass';
import { px } from './px';

type Look = { tint: string; blur: number; thick: number };
const POP: Look = { tint: 'rgba(14, 15, 18, 0.55)', blur: 22, thick: 24 };

function h(tag: string, cls = '', words = ''): HTMLElement {
  const made = document.createElement(tag);
  if (cls) made.className = cls;
  if (words) made.textContent = words;
  return made;
}

function popover(cls: string): HTMLElement {
  return glaze(h('div', `gs-pop ${cls}`), POP);
}

function row(icon: string, color: string, name: string, small: string, n = ''): HTMLElement {
  const r = h('div', 'gs-mrow');
  const ic = h('span', 'gs-ic');
  ic.append(px(icon, color, 16));
  const words = h('div', 'gs-mw');
  words.append(h('b', '', name));
  if (small) words.append(h('small', '', small));
  r.append(ic, words);
  if (n) r.append(h('span', 'gs-n', n));
  r.addEventListener('mousedown', (e) => e.preventDefault());
  return r;
}

/** "this throws away 2 files…, and mender/x." as one line per thing. */
function costLines(cost: string): { icon: string; color: string; said: string; fate: string }[] {
  const m = /^this throws away (.*)\.$/.exec(cost);
  if (!m) return [];
  const parts = m[1]!.split(/, (?:and )?/);
  return parts.map((said) => {
    if (/working/.test(said)) return { icon: 'flame', color: '#ff9a4a', said, fate: 'taken down' };
    if (/committed/.test(said)) return { icon: 'pen', color: '#f08a72', said, fate: 'gone' };
    if (/pushed/.test(said)) return { icon: 'up', color: '#7aaaff', said, fate: 'gone' };
    if (/session/.test(said))
      return { icon: 'hourglass', color: '#ff9a4a', said, fate: 'taken down' };
    return { icon: 'folder', color: '#f08a72', said: `its folder and ${said}`, fate: 'removed' };
  });
}

function strip(): HTMLElement {
  return h('div', 'g-danger gs-arm');
}

export interface WorkspaceMenu {
  name: string;
  branch?: string;
  dropCost(): Promise<string>;
  rename(): void;
  drop(): void;
  alive(): boolean;
  fit(): void;
  stand(yes: () => void, at: Element): void;
}

export function workspaceMenu(o: WorkspaceMenu): HTMLElement {
  const it = popover('gs-ws');
  const head = h('div', 'gs-mhead');
  head.append(h('span', 'gs-hname g-serif', o.name));
  if (o.branch && o.branch !== o.name) {
    const chip = h('span', 'g-chip');
    chip.append(px('merge', '#9bd28a', 11), document.createTextNode(o.branch));
    head.append(chip);
  }
  const rename = row(
    'pencil',
    '#f2c66d',
    'rename it',
    'a new name for the board, never for its branch'
  );
  rename.classList.add('g-press');
  rename.addEventListener('click', o.rename);
  const del = row(
    'trash',
    '#f08a72',
    'delete it',
    'its folder, its branch and every session in it'
  );
  del.classList.add('gs-sorerow', 'g-press');
  del.querySelector('b')!.style.color = 'var(--g-sore)';
  it.append(head, rename, del);

  let busy = false;
  let arm: HTMLElement | null = null;
  del.addEventListener('click', () => {
    if (busy || arm) return;
    busy = true;
    del.querySelector('small')!.textContent = 'looking at what is in there…';
    void o.dropCost().then((cost) => {
      if (!o.alive()) return;
      del.remove();
      const lines = costLines(cost);
      arm = strip();
      const t = h('div', 'gs-armt');
      t.append(px('trash', '#f08a72', 16), document.createTextNode('this deletes all of it'));
      arm.append(t);
      if (lines.length) {
        const what = h('div', 'gs-what');
        for (const l of lines) {
          const d = h('div');
          d.append(px(l.icon, l.color, 12), h('span', '', l.said), h('em', '', l.fate));
          what.append(d);
        }
        arm.append(what);
      } else {
        arm.append(h('p', 'gs-armp', cost));
      }
      const confirm = h('span', 'g-pill g-sore');
      confirm.append(px('trash', '#2b0f08', 13), document.createTextNode('delete all of it'));
      confirm.addEventListener('click', o.drop);
      arm.append(h('div', 'gs-armgo'));
      arm.lastElementChild!.append(confirm);
      it.append(arm);
      o.stand(o.drop, arm);
      o.fit();
    });
  });
  return it;
}

export interface LanternMenu {
  name: string;
  sides: { said: string; small: string; icon: string; names: string[]; ids: string[] }[];
  cost(ids: string[]): Promise<string>;
  close(ids: string[]): void;
  alive(): boolean;
  fit(): void;
  stand(yes: () => void, at: Element): void;
}

export function lanternMenu(o: LanternMenu): HTMLElement {
  const it = popover('gs-lt');
  const who = h('div', 'gs-who');
  const cut = cutOf(KIT_NAMES.lanternOn);
  const mark = h('div', 'gs-mark');
  if (cut) {
    const s = sprite(KIT_NAMES.lanternOn, 1);
    s.style.position = 'relative';
    mark.append(s);
  }
  who.append(mark, h('span', 'gs-hname g-serif', o.name));
  it.append(who);

  let open: { strip: HTMLElement; row: HTMLElement } | null = null;
  for (const side of o.sides) {
    const n = side.ids.length;
    const r = row(
      side.icon,
      n ? '#f2c66d' : 'rgba(246,236,219,.4)',
      side.said,
      side.small,
      String(n)
    );
    if (!n) r.classList.add('gs-off');
    else r.classList.add('g-press');
    it.append(r);
    if (!n) continue;
    r.addEventListener('click', () => {
      if (open?.row === r) return;
      open?.strip.remove();
      open?.row.classList.remove('gs-hot');
      r.classList.add('gs-hot');
      const arm = strip();
      open = { strip: arm, row: r };
      r.after(arm);
      arm.append(h('p', 'gs-armp', 'looking at what is in them…'));
      o.fit();
      void o.cost(side.ids).then((cost) => {
        if (!o.alive() || open?.strip !== arm) return;
        arm.replaceChildren();
        const which = n === 1 ? 'it' : `all ${n}`;
        const body = h('p', 'gs-armp');
        body.textContent =
          `${n === 1 ? 'one session comes' : `${n} sessions come`} down, and what was said in ${n === 1 ? 'it' : 'them'} goes too.` +
          (cost ? ` ${cost}` : '');
        arm.append(body);
        const go = h('div', 'gs-armgo');
        const yes = h('span', 'g-pill g-sore');
        yes.append(px('close', '#2a0e08', 12), document.createTextNode(`close ${which}`));
        const no = h('span', 'g-ghost g-plain', n === 1 ? 'leave it' : 'leave them');
        const ok = (): void => o.close(side.ids);
        yes.addEventListener('click', ok);
        no.addEventListener('click', () => {
          arm.remove();
          r.classList.remove('gs-hot');
          open = null;
          o.fit();
        });
        go.append(yes, no);
        arm.append(go);
        o.stand(ok, arm);
        o.fit();
      });
    });
  }
  return it;
}

export interface ColumnOffer {
  said: string;
  kind: 'away' | 'back' | 'rules';
  small: string;
  run(): void;
}

export function columnMenu(offers: ColumnOffer[], done: () => void): HTMLElement {
  const it = popover('gs-col');
  const head = h('div', 'gs-mhead');
  head.append(
    h('span', 'g-pix', 'what is on the board'),
    h('span', 'gs-hnote', 'this sitting only')
  );
  it.append(head);
  let sep = false;
  for (const o of offers) {
    if (o.kind !== 'away' && !sep && it.children.length > 1) {
      it.append(h('div', 'gs-sep'));
    }
    if (o.kind !== 'away') sep = true;
    const icon = o.kind === 'away' ? 'close' : o.kind === 'back' ? 'eye' : 'layout';
    const r = row(icon, '#f2c66d', o.said, o.small);
    r.classList.add('g-press');
    r.addEventListener('click', () => {
      o.run();
      done();
    });
    it.append(r);
  }
  return it;
}

const POSTURE: Record<string, { word: string; color: string }> = {
  'wants-you': { word: 'wants you', color: '#ff9a4a' },
  working: { word: 'working', color: '#ff9a4a' },
  done: { word: 'done', color: '#9bd28a' },
  waiting: { word: 'waiting out a limit', color: '#f08a72' },
  broken: { word: 'broken', color: '#f08a72' },
  resting: { word: 'idle', color: 'rgba(246,236,219,.42)' },
};

export interface CardBoard {
  id: string;
  name: string;
  branch?: string;
  here: boolean;
  sessions?: readonly { id: string; name: string; posture: string; saying: string }[];
}

export function signCardPane(board: CardBoard): HTMLElement {
  const it = glaze(h('div', 'gs-card-pop'), {
    tint: 'rgba(14, 15, 18, 0.55)',
    blur: 22,
    thick: 24,
  });
  it.style.pointerEvents = 'none';
  const sessions = board.sessions ?? [];
  const wants = sessions.filter((s) => s.posture === 'wants-you').length;
  const head = h('div', 'gs-ch');
  head.append(h('h3', 'g-serif', board.name));
  const sub = h('div', 'gs-sub');
  if (board.branch && board.branch !== board.name) {
    const c = h('span', 'g-chip g-mono');
    c.append(px('branch', '#7aaaff', 12), document.createTextNode(board.branch));
    sub.append(c);
  }
  const state = h('span', 'g-chip');
  const dot = h('span', 'g-dot');
  dot.style.background = wants ? '#ff9a4a' : sessions.length ? '#9bd28a' : 'rgba(246,236,219,.3)';
  state.append(
    dot,
    document.createTextNode(
      sessions.length
        ? `${sessions.length} in here${wants ? `, ${wants} want${wants === 1 ? 's' : ''} you` : ''}`
        : 'nobody in here yet'
    )
  );
  sub.append(state);
  head.append(sub);
  it.append(head);
  if (sessions.length) {
    const order = ['wants-you', 'broken', 'working', 'done', 'waiting', 'resting'];
    const ranked = [...sessions].sort(
      (a, b) => order.indexOf(a.posture) - order.indexOf(b.posture)
    );
    const who = h('div', 'gs-whom');
    for (const one of ranked) {
      const look = POSTURE[one.posture] ?? POSTURE.resting!;
      const p = h('div', one.posture === 'wants-you' ? 'gs-p gs-ask' : 'gs-p');
      const art = h('div', 'gs-lamp');
      const lit =
        one.posture === 'working' || one.posture === 'wants-you' || one.posture === 'done';
      const s = sprite(lit ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 1);
      s.style.position = 'relative';
      art.append(s);
      const words = h('div', 'gs-pw');
      const b = h('b');
      b.style.color = one.posture === 'resting' ? 'var(--g-ink-2)' : 'var(--g-ink)';
      const em = h('em', '', look.word);
      em.style.color = look.color;
      b.append(document.createTextNode(one.name), em);
      words.append(b);
      if (one.saying) words.append(h('small', '', one.saying));
      p.append(art, words);
      who.append(p);
    }
    it.append(who);
  }
  return it;
}
