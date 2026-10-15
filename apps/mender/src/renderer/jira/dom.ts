import type { Jira, Person } from './data';

type Child = Node | string | null | undefined | false;

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

export function button(text: Child, cls: string, act: (event: MouseEvent) => void): HTMLButtonElement {
  const b = h('button', `jr-btn ${cls}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', (event) => {
    event.stopPropagation();
    act(event);
  });
  return b;
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const TONES = ['#579dff', '#9f8fef', '#6cc3e0', '#4bce97', '#e2b203', '#faa53d', '#f87168'];
const toneOf = (id: string): string => {
  let n = 0;
  for (const c of id) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return TONES[n % TONES.length]!;
};

/** A person's face, or their initials until it arrives; a dashed ring for nobody. */
export function avatar(jira: Jira, who: Person | undefined, big = false): HTMLElement {
  const el = h('span', `jr-avatar${big ? ' big' : ''}${who ? '' : ' none'}`);
  if (!who) {
    el.title = 'Unassigned';
    return el;
  }
  el.title = who.name;
  el.textContent = initials(who.name);
  el.style.background = toneOf(who.id);
  if (who.avatar)
    void jira.image(who.avatar).then((data) => {
      if (!data) return;
      el.textContent = '';
      el.style.background = `#454f59 url("${data}") center/cover no-repeat`;
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
  return img;
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
  if (d < 30) return `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function when(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

export interface MenuItem {
  label: Child;
  text: string;
  on?: boolean;
  pick: () => void;
}

/**
 * A dropdown under whatever was pressed, the way Jira's own pickers are: a
 * search line when there is anything to search, arrows and return to pick.
 */
export function menu(
  host: HTMLElement,
  anchor: HTMLElement,
  items: MenuItem[] | ((query: string) => Promise<MenuItem[]>),
  searchable = Array.isArray(items) ? items.length > 8 : true
): () => void {
  const box = h('div', 'jr-menu');
  const list = h('div');
  let lit = 0;
  let shown: MenuItem[] = [];
  const search = searchable ? h('input', 'jr-input search') : null;
  if (search) {
    search.placeholder = 'Search';
    box.append(search);
  }
  box.append(list);
  const paint = (): void => {
    list.replaceChildren(
      ...(shown.length
        ? shown.map((item, at) => {
            const row = h('div', `item${item.on ? ' on' : ''}${at === lit ? ' lit' : ''}`, item.label);
            row.addEventListener('mousedown', (event) => event.preventDefault());
            row.addEventListener('click', (event) => {
              event.stopPropagation();
              close();
              item.pick();
            });
            return row;
          })
        : [h('div', 'empty', 'No matches')])
    );
  };
  let asked = 0;
  const fill = async (query: string): Promise<void> => {
    const mine = ++asked;
    const got = Array.isArray(items)
      ? items.filter((item) => item.text.toLowerCase().includes(query.toLowerCase()))
      : await items(query).catch(() => []);
    if (mine !== asked) return;
    shown = got;
    lit = 0;
    paint();
  };
  const r = anchor.getBoundingClientRect();
  const at = host.getBoundingClientRect();
  box.style.left = `${Math.min(r.left - at.left, at.width - 380)}px`;
  box.style.top = `${r.bottom - at.top + 4}px`;
  host.append(box);
  const below = at.bottom - r.bottom - 12;
  if (below < 200) {
    box.style.top = '';
    box.style.bottom = `${at.bottom - r.top + 4}px`;
  }
  const away = (event: Event): void => {
    if (!box.contains(event.target as Node)) close();
  };
  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      lit = Math.max(0, Math.min(shown.length - 1, lit + (event.key === 'ArrowDown' ? 1 : -1)));
      paint();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = shown[lit];
      if (item) {
        close();
        item.pick();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    box.remove();
    document.removeEventListener('mousedown', away, true);
    document.removeEventListener('keydown', keys, true);
  };
  setTimeout(() => document.addEventListener('mousedown', away, true));
  document.addEventListener('keydown', keys, true);
  search?.addEventListener('input', () => void fill(search.value));
  void fill('');
  search?.focus();
  return close;
}

export const JIRA_MARK = `<svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="5" fill="#1868db"/><path d="M17.6 6H11.7a2.6 2.6 0 0 0 2.6 2.6h1.1v1a2.6 2.6 0 0 0 2.6 2.6V6.4a.4.4 0 0 0-.4-.4Z" fill="#fff"/><path d="M14.7 8.9H8.8a2.6 2.6 0 0 0 2.6 2.6h1.1v1a2.6 2.6 0 0 0 2.6 2.6V9.3a.4.4 0 0 0-.4-.4Z" fill="#fff" opacity=".85"/><path d="M11.8 11.8H5.9a2.6 2.6 0 0 0 2.6 2.6h1.1v1a2.6 2.6 0 0 0 2.6 2.6v-5.8a.4.4 0 0 0-.4-.4Z" fill="#fff" opacity=".7"/></svg>`;
