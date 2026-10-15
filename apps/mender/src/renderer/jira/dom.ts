import type { Jira, Person } from './data';

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const child of children) if (child) el.append(child);
  return el;
}

/** A gold word that does something when pressed. */
export function gold(text: Child, act: (event: MouseEvent) => void, cls = ''): HTMLSpanElement {
  const el = h('span', `gold ${cls}`.trim(), text);
  el.addEventListener('click', (event) => {
    event.stopPropagation();
    act(event);
  });
  return el;
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/* The village's own inks rather than Atlassian's, so a face reads as somebody
   here and not as a sticker off another app. */
const TONES = ['#b8502a', '#7a5fc4', '#3f8a5c', '#3d6fd1', '#a8851a', '#c8673a', '#3a9198'];
const toneOf = (id: string): string => {
  let n = 0;
  for (const c of id) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return TONES[n % TONES.length]!;
};

/** A person's face, square, their initials until the picture arrives; a dashed square for nobody. */
export function face(jira: Jira, who: Person | undefined, size: '' | 'small' | 'tiny' = ''): HTMLElement {
  const el = h('span', `jr-face${size ? ` ${size}` : ''}${who ? '' : ' none'}`);
  if (!who) {
    el.title = 'nobody has it';
    return el;
  }
  el.title = who.name;
  el.textContent = initials(who.name);
  el.style.backgroundColor = toneOf(who.id);
  if (who.avatar)
    void jira.image(who.avatar).then((data) => {
      if (!data) return;
      el.textContent = '';
      el.style.backgroundImage = `url("${data}")`;
    });
  return el;
}

export function icon(jira: Jira, url: string | undefined, title: string): HTMLElement {
  const img = h('img', 'jr-icon');
  img.alt = '';
  img.title = title;
  if (url)
    void jira.image(url).then((data) => {
      if (data) img.src = data;
    });
  else img.style.visibility = 'hidden';
  return img;
}

/**
 * A title with its bracketed prefixes lifted off as small stamps. Teams tag
 * every ticket "[Mobile] [iOS] ..." and the answer's face draws a square
 * bracket almost as an I, so left in the line they read as letters.
 */
export function titled(text: string, cls: string, tag: keyof HTMLElementTagNameMap = 'div'): HTMLElement {
  const tags: string[] = [];
  let rest = text;
  for (let m = rest.match(/^\s*\[([^\]]+)\]\s*[-:]?\s*/); m; m = rest.match(/^\s*\[([^\]]+)\]\s*[-:]?\s*/)) {
    tags.push(...m[1]!.split(/\s*[&+,/]\s*/).filter(Boolean));
    rest = rest.slice(m[0].length);
  }
  const el = h(tag, cls);
  if (tags.length) el.append(h('span', 'jr-tags', ...tags.map((one) => h('span', 'jr-tg', one))));
  el.append(rest || text);
  return el;
}

/** An epic's name without its own bracket prefix or the part after a colon, for a tape. */
export const shortSummary = (text: string, most: number): string =>
  text.length > most ? `${text.slice(0, most - 1).trimEnd()}…` : text;

export const shortEpic = (summary: string): string =>
  summary.replace(/^(\s*\[[^\]]+\]\s*)+/, '').split(/[:(]/)[0]!.trim() || summary;

/** Priority as pixel chevrons: up in red, down in blue, nothing for the middle. */
export function pri(name: string | undefined): HTMLElement | null {
  const n = ({ Highest: 3, Blocker: 3, Critical: 3, High: 2, Major: 2, Low: -1, Minor: -1, Lowest: -2, Trivial: -2 } as Record<string, number>)[name ?? ''] ?? 0;
  if (!n) return null;
  const el = h('span', `jr-pri ${n > 0 ? 'up' : 'down'}`);
  el.title = `${name} priority`;
  for (let i = 0; i < Math.abs(n); i++) el.append(h('i'));
  return el;
}

export function ago(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60;
  if (m < 60) return `${Math.round(m)} minute${Math.round(m) === 1 ? '' : 's'} ago`;
  const hr = m / 60;
  if (hr < 24) return `${Math.round(hr)} hour${Math.round(hr) === 1 ? '' : 's'} ago`;
  const d = hr / 24;
  if (d < 2) return 'yesterday';
  if (d < 30) return `${Math.round(d)} days ago`;
  return day(iso);
}

/** "14 oct", or "14 oct 2025" when it is not this year. */
export function day(iso: string | undefined): string {
  if (!iso) return '';
  const at = new Date(iso.length === 10 ? `${iso}T12:00` : iso);
  const same = at.getFullYear() === new Date().getFullYear();
  return at
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(same ? {} : { year: 'numeric' }) })
    .toLowerCase();
}

export function when(iso: string | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  return `${day(iso)}, ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase()}`;
}

const ALLOWED = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'sub', 'sup', 'code', 'pre',
  'span', 'div', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'tt', 'ins', 'cite', 'small', 'font',
]);

/**
 * What Jira itself rendered, made safe and shown: Jira's HTML is the most
 * faithful rendering of a description there is, but it is still somebody's
 * writing, so only plain formatting survives, links open in the browser and
 * pictures come through the signed-in pipe.
 */
export function rich(jira: Jira, html: string, open: (url: string) => void): HTMLElement {
  const out = h('div', 'jr-rich');
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const clean = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED.has(tag)) {
      if (['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'].includes(tag)) return null;
      const frag = document.createDocumentFragment();
      for (const child of Array.from(el.childNodes)) {
        const c = clean(child);
        if (c) frag.append(c);
      }
      return frag;
    }
    const copy = document.createElement(tag === 'font' ? 'span' : tag);
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '';
      const abs = href ? new URL(href, `https://${jira.site}`).href : '';
      if (/^https?:/i.test(abs)) {
        copy.setAttribute('href', abs);
        copy.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          open(abs);
        });
      }
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      const img = copy as HTMLImageElement;
      img.alt = el.getAttribute('alt') ?? '';
      const w = el.getAttribute('width');
      if (w) img.style.maxWidth = `${w}px`;
      if (src) {
        const abs = new URL(src, `https://${jira.site}`).href;
        void jira.image(abs).then((data) => {
          if (data) img.src = data;
        });
      }
    }
    if (el.classList.contains('panel') || el.classList.contains('code')) copy.className = 'panel';
    for (const child of Array.from(el.childNodes)) {
      const c = clean(child);
      if (c) copy.append(c);
    }
    return copy;
  };
  for (const child of Array.from(doc.body.childNodes)) {
    const c = clean(child);
    if (c) out.append(c);
  }
  return out;
}

// ── slabs ─────────────────────────────────────────────────────────────────

/**
 * One line on a slab. Pressing it does it; one with `arm` needs a second
 * press and the first says what it would cost; one with `sub` opens the
 * next slab beside it; one with a tick stays open so several can be ticked.
 */
export interface Row {
  label: Child;
  text?: string;
  hint?: string;
  on?: boolean;
  tick?: boolean;
  sore?: boolean;
  off?: boolean;
  arm?: string;
  pick?: (row: HTMLElement) => void;
  sub?: () => Items | Promise<Items>;
  subOpts?: SlabOpts;
}
export type Item = Row | 'hr' | { head: string; hint?: string };
/** Rows as they are, or worked out from what is written in the slab's search line. */
export type Items = Item[] | ((query: string) => Item[] | Promise<Item[]>);

export interface SlabOpts {
  /** A line to narrow the rows by, with this written in it until something is. */
  search?: string;
  /** Opens beside the row it came from, rather than under what was pressed. */
  side?: boolean;
  wide?: boolean;
  cls?: string;
}

interface Open {
  box: HTMLElement;
  done(): void;
  keys(event: KeyboardEvent): void;
}
const stack: Open[] = [];

export const closeSlabs = (depth = 0): void => {
  while (stack.length > depth) stack.pop()!.done();
};
export const slabsUp = (): boolean => stack.length > 0;

let wired = false;
const wire = (): void => {
  if (wired) return;
  wired = true;
  document.addEventListener(
    'mousedown',
    (event) => {
      if (!stack.length) return;
      const target = event.target as Node;
      const inside = stack.findIndex((one) => one.box.contains(target));
      closeSlabs(inside + 1);
    },
    true
  );
  document.addEventListener(
    'keydown',
    (event) => {
      const top = stack[stack.length - 1];
      if (top) top.keys(event);
    },
    true
  );
};

/** Where a slab hangs: under what was pressed, or beside the row it opened from. */
export function place(host: HTMLElement, box: HTMLElement, anchor: HTMLElement | { x: number; y: number }, side = false): void {
  const at = host.getBoundingClientRect();
  const r =
    anchor instanceof HTMLElement
      ? anchor.getBoundingClientRect()
      : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  box.style.left = `${(side ? r.right + 2 : r.left) - at.left}px`;
  box.style.top = `${(side ? r.top - 7 : r.bottom + 8) - at.top}px`;
  const b = box.getBoundingClientRect();
  if (b.right > at.right - 8)
    box.style.left = `${Math.max(8, side ? r.left - b.width - 2 - at.left : at.width - b.width - 12)}px`;
  if (b.bottom > at.bottom - 8) {
    const above = r.top - b.height - 8 - at.top;
    box.style.top = `${Math.max(8, side || above < 8 ? at.height - b.height - 12 : above)}px`;
  }
}

const narrow = (items: Item[], query: string): Item[] =>
  query
    ? items.filter(
        (item): item is Row =>
          typeof item === 'object' &&
          'label' in item &&
          (item.text ?? (typeof item.label === 'string' ? item.label : ''))
            .toLowerCase()
            .includes(query.toLowerCase())
      )
    : items;

export function slab(
  host: HTMLElement,
  anchor: HTMLElement | { x: number; y: number },
  items: Items,
  opts: SlabOpts = {}
): () => void {
  wire();
  const parent = anchor instanceof HTMLElement ? stack.findIndex((one) => one.box.contains(anchor)) : -1;
  closeSlabs(opts.side ? parent + 1 : 0);
  const depth = stack.length;
  const box = h('div', `jr-slab${opts.cls ? ` ${opts.cls}` : ''}`);
  const search = opts.search !== undefined ? h('input', 'q') : null;
  if (search) {
    search.placeholder = opts.search ?? '';
    box.append(search);
  }
  const body = h('div');
  box.append(body);
  let rows: { item: Row; row: HTMLElement }[] = [];
  let lit = -1;
  let subTimer: number | undefined;

  const light = (at: number): void => {
    rows[lit]?.row.classList.remove('lit');
    lit = at;
    const now = rows[lit];
    if (now) {
      now.row.classList.add('lit');
      now.row.scrollIntoView({ block: 'nearest' });
    }
  };

  const openSub = (item: Row, row: HTMLElement): void => {
    if (!item.sub) return;
    const sub = item.sub;
    let made: Items | null = null;
    slab(
      host,
      row,
      async (query) => {
        made ??= await sub();
        return typeof made === 'function' ? made(query) : narrow(made, query);
      },
      { ...item.subOpts, side: true }
    );
  };

  const press = (item: Row, row: HTMLElement): void => {
    if (item.off) return;
    if (item.sub) {
      openSub(item, row);
      return;
    }
    if (item.arm && !row.classList.contains('armed')) {
      row.classList.add('armed');
      const label = row.firstElementChild as HTMLElement;
      label.replaceChildren(item.arm);
      return;
    }
    if (item.tick !== undefined) {
      item.tick = !item.tick;
      row.querySelector('.tick')?.classList.toggle('on', item.tick);
      item.pick?.(row);
      return;
    }
    closeSlabs(0);
    item.pick?.(row);
  };

  const paint = (list: Item[]): void => {
    rows = [];
    lit = -1;
    const els = list.map((item) => {
      if (item === 'hr') return h('hr');
      if ('head' in item) return h('div', 'h', h('span', '', item.head), item.hint ? h('span', '', item.hint) : null);
      const row = h(
        'div',
        `r${item.on ? ' on' : ''}${item.sore ? ' sore' : ''}${item.off ? ' off' : ''}`,
        h('span', '', item.tick !== undefined ? h('span', `tick${item.tick ? ' on' : ''}`) : null, item.label)
      );
      const hint = [item.hint, item.sub ? '›' : ''].filter(Boolean).join(' ');
      if (hint) row.append(h('small', '', hint));
      row.addEventListener('mousedown', (event) => event.preventDefault());
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        press(item, row);
      });
      const at = rows.length;
      row.addEventListener('mouseenter', () => {
        light(at);
        window.clearTimeout(subTimer);
        if (item.sub) subTimer = window.setTimeout(() => openSub(item, row), 160);
        else closeSlabs(depth + 1);
      });
      rows.push({ item, row });
      return row;
    });
    body.replaceChildren(...(els.length ? els : [h('div', 'empty', search?.value ? 'nothing by that' : 'nothing here')]));
  };

  let asked = 0;
  const fill = async (query: string): Promise<void> => {
    const mine = ++asked;
    let got: Item[];
    try {
      got = Array.isArray(items)
        ? narrow(items, query)
        : await items(query);
    } catch (cause) {
      got = [{ label: (cause as Error).message || 'Jira did not answer.', sore: true, off: true }];
    }
    if (mine !== asked) return;
    paint(got);
    if (search?.value) light(0);
    place(host, box, anchor, opts.side);
  };

  const keys = (event: KeyboardEvent): void => {
    const go = (step: number): void => {
      if (!rows.length) return;
      let at = lit;
      for (let i = 0; i < rows.length; i++) {
        at = (at + step + rows.length) % rows.length;
        if (!rows[at]!.item.off) break;
      }
      light(at);
    };
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      go(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'ArrowRight' && rows[lit]?.item.sub) {
      event.preventDefault();
      event.stopPropagation();
      openSub(rows[lit]!.item, rows[lit]!.row);
    } else if (event.key === 'ArrowLeft' && opts.side) {
      event.preventDefault();
      event.stopPropagation();
      closeSlabs(depth);
    } else if (event.key === 'Enter') {
      const now = rows[lit] ?? (search?.value ? rows[0] : undefined);
      if (!now) return;
      event.preventDefault();
      event.stopPropagation();
      press(now.item, now.row);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeSlabs(depth);
    }
  };

  const me: Open = {
    box,
    keys,
    done: () => {
      window.clearTimeout(subTimer);
      box.remove();
    },
  };
  stack.push(me);
  host.append(box);
  body.append(h('div', 'empty', '…'));
  place(host, box, anchor, opts.side);
  void fill('');
  if (search) {
    let wait: number | undefined;
    search.addEventListener('input', () => {
      window.clearTimeout(wait);
      wait = window.setTimeout(() => void fill(search.value), Array.isArray(items) ? 0 : 220);
    });
    requestAnimationFrame(() => search.focus());
  }
  return () => closeSlabs(depth);
}

/**
 * What pressing something did, said once under the board and settling back,
 * except a failure, which stays until the next thing is pressed.
 */
export function saidBack(host: HTMLElement, said: string, sore = false): void {
  host.querySelector('.jr-said-back')?.remove();
  const el = h('div', `jr-said-back${sore ? ' sore' : ''}`, said);
  host.append(el);
  const go = (): void => {
    el.remove();
    document.removeEventListener('mousedown', go, true);
  };
  if (sore) setTimeout(() => document.addEventListener('mousedown', go, true), 400);
  setTimeout(go, sore ? 12_000 : 2600);
}
