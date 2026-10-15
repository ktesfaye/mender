import type { Board, Card, Jira, Person } from './data';
import { epicColor } from './data';
import { avatar, button, h, icon, menu, type MenuItem } from './dom';

/** A session here on a ticket, and its lantern's colour and pulse. */
export interface Lit {
  task: string;
  name: string;
  mood: string;
}

export const MOODS: Record<string, { color: string; says: string; pulse: string }> = {
  working: { color: '#f5a524', says: 'working', pulse: 'breathe' },
  arriving: { color: '#f5a524', says: 'waking', pulse: 'breathe' },
  asking: { color: '#ff7a1a', says: 'wants you', pulse: 'flicker' },
  resting: { color: '#4bce97', says: 'done', pulse: '' },
  hurt: { color: '#f87168', says: 'broken', pulse: '' },
  empty: { color: '#8c9bab', says: 'idle', pulse: '' },
};
export const moodOf = (mood: string) => MOODS[mood] ?? MOODS.empty!;

export function sessionPill(on: Lit): HTMLElement {
  const mood = moodOf(on.mood);
  const pill = h('span', 'jr-session', `${on.name} · ${mood.says}`);
  pill.style.setProperty('--lit', mood.color);
  pill.title = 'A session in Mender is on this';
  return pill;
}

/** What is narrowed on the board, kept while it stays open. */
export interface Filters {
  text: string;
  people: Set<string>;
  mine: boolean;
  epics: Set<string>;
  types: Set<string>;
  quick: Set<number>;
}

export const noFilters = (): Filters => ({
  text: '',
  people: new Set(),
  mine: false,
  epics: new Set(),
  types: new Set(),
  quick: new Set(),
});

export interface BoardHands {
  open(key: string): void;
  take(key: string): void;
  move(key: string, column: number, before?: string, after?: string): void;
  create(column: number): void;
  quick(ids: Set<number>): void;
  changed(): void;
}

const UNASSIGNED = '#none';

export function boardView(
  jira: Jira,
  board: Board,
  lit: Record<string, Lit>,
  filters: Filters,
  hands: BoardHands,
  overlay: HTMLElement
): HTMLElement {
  const root = h('div', 'jr-main');

  // ── header ────────────────────────────────────────────────────────────
  const head = h('div', 'jr-head');
  const crumbs = h('div', 'jr-crumbs', 'Projects', h('span', '', '/'));
  if (board.projectAvatar) crumbs.append(icon(jira, board.projectAvatar, board.projectName));
  crumbs.append(board.projectName);
  const title = h('div', 'jr-title', h('h1', '', board.sprint?.name ?? board.name));
  if (board.sprint?.end) {
    const days = Math.ceil((new Date(board.sprint.end).getTime() - Date.now()) / 86_400_000);
    title.append(
      h('span', 'jr-sprint', days >= 0 ? `${days} day${days === 1 ? '' : 's'} left` : 'sprint overdue')
    );
  }
  if (board.sprint?.goal) title.append(h('span', 'jr-sprint', `· ${board.sprint.goal}`));
  head.append(crumbs, title);

  // ── tools ─────────────────────────────────────────────────────────────
  const tools = h('div', 'jr-tools');
  const search = h('input', 'jr-search');
  search.placeholder = 'Search board';
  search.value = filters.text;
  search.addEventListener('input', () => {
    filters.text = search.value;
    paintColumns();
  });
  tools.append(search);

  const people = new Map<string, Person>();
  let anyoneUnassigned = false;
  for (const card of board.cards) {
    if (card.assignee) people.set(card.assignee.id, card.assignee);
    else anyoneUnassigned = true;
  }
  const faces = h('div', 'jr-people');
  const sortedPeople = [...people.values()].sort((a, b) =>
    a.id === board.me ? -1 : b.id === board.me ? 1 : a.name.localeCompare(b.name)
  );
  const shownFaces = sortedPeople.slice(0, 9);
  const face = (id: string, el: HTMLElement): void => {
    if (filters.people.has(id)) el.classList.add('on');
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      if (filters.people.has(id)) filters.people.delete(id);
      else filters.people.add(id);
      el.classList.toggle('on');
      paintColumns();
    });
    faces.append(el);
  };
  for (const who of shownFaces) face(who.id, avatar(jira, who, true));
  if (anyoneUnassigned) face(UNASSIGNED, avatar(jira, undefined, true));
  if (sortedPeople.length > shownFaces.length) {
    const more = h('span', 'jr-avatar big', `+${sortedPeople.length - shownFaces.length}`);
    more.style.background = '#454f59';
    more.style.color = '#dee4ea';
    more.addEventListener('click', (event) => {
      event.stopPropagation();
      menu(
        overlay,
        more,
        sortedPeople.slice(shownFaces.length).map(
          (who): MenuItem => ({
            label: h('span', '', avatar(jira, who), ` ${who.name}`),
            text: who.name,
            on: filters.people.has(who.id),
            pick: () => {
              if (filters.people.has(who.id)) filters.people.delete(who.id);
              else filters.people.add(who.id);
              paintColumns();
            },
          })
        )
      );
    });
    faces.append(more);
  }
  tools.append(faces);

  const toggle = (label: string, on: () => boolean, flip: () => void): HTMLButtonElement => {
    const b = button(label, `subtle${on() ? ' on' : ''}`, () => {
      flip();
      b.classList.toggle('on', on());
    });
    return b;
  };
  if (board.me)
    tools.append(
      toggle('Only my issues', () => filters.mine, () => {
        filters.mine = !filters.mine;
        paintColumns();
      })
    );

  const parents = new Map<string, Card['parent'] & object>();
  for (const card of board.cards) if (card.parent) parents.set(card.parent.key, card.parent);
  const dropdown = (label: string, chosen: Set<string>, options: { id: string; label: Node | string; text: string }[]) => {
    const b = button(`${label} ▾`, `subtle${chosen.size ? ' on' : ''}`, () => {
      menu(
        overlay,
        b,
        options.map((one) => ({
          label: one.label,
          text: one.text,
          on: chosen.has(one.id),
          pick: () => {
            if (chosen.has(one.id)) chosen.delete(one.id);
            else chosen.add(one.id);
            b.classList.toggle('on', chosen.size > 0);
            paintColumns();
          },
        }))
      );
    });
    return b;
  };
  if (parents.size)
    tools.append(
      dropdown(
        'Epic',
        filters.epics,
        [...parents.values()].map((p) => ({ id: p.key, label: `${p.key} ${p.summary}`, text: `${p.key} ${p.summary}` }))
      )
    );
  const types = new Map<string, Card['type']>();
  for (const card of board.cards) types.set(card.type.name, card.type);
  if (types.size > 1)
    tools.append(
      dropdown(
        'Type',
        filters.types,
        [...types.values()].map((t) => ({
          id: t.name,
          label: h('span', '', icon(jira, t.icon, t.name), ` ${t.name}`),
          text: t.name,
        }))
      )
    );
  for (const quick of board.quickFilters)
    tools.append(
      toggle(quick.name, () => filters.quick.has(quick.id), () => {
        if (filters.quick.has(quick.id)) filters.quick.delete(quick.id);
        else filters.quick.add(quick.id);
        hands.quick(filters.quick);
      })
    );
  const clear = button('Clear filters', 'subtle', () => {
    const hadQuick = filters.quick.size > 0;
    Object.assign(filters, noFilters());
    if (hadQuick) hands.quick(filters.quick);
    hands.changed();
  });
  tools.append(clear);
  head.append(tools);
  root.append(head);

  // ── columns ───────────────────────────────────────────────────────────
  const columns = h('div', 'jr-columns');
  root.append(columns);

  const shows = (card: Card): boolean => {
    const text = filters.text.trim().toLowerCase();
    if (text && !`${card.key} ${card.summary}`.toLowerCase().includes(text)) return false;
    if (filters.people.size && !filters.people.has(card.assignee?.id ?? UNASSIGNED)) return false;
    if (filters.mine && card.assignee?.id !== board.me) return false;
    if (filters.epics.size && !filters.epics.has(card.parent?.key ?? '')) return false;
    if (filters.types.size && !filters.types.has(card.type.name)) return false;
    return true;
  };

  let dragging: Card | null = null;

  const cardEl = (card: Card): HTMLElement => {
    const el = h('div', `jr-card${card.flagged ? ' flagged' : ''}`);
    el.draggable = true;
    el.dataset.key = card.key;
    const on = lit[card.key];
    if (on) {
      const mood = moodOf(on.mood);
      el.dataset.lit = on.mood;
      el.style.setProperty('--lit', mood.color);
      if (mood.pulse) el.dataset.pulse = mood.pulse;
      el.append(sessionPill(on));
    }
    el.append(h('div', 'summary', card.summary));
    const tags = h('div', 'tags');
    if (card.parent) {
      const [bg, fg] = epicColor(card.parent.color, card.parent.key);
      const tag = h('span', 'jr-tag', card.parent.summary);
      tag.style.background = bg;
      tag.style.color = fg;
      tag.title = `${card.parent.key} ${card.parent.summary}`;
      tags.append(tag);
    }
    for (const label of card.labels.slice(0, 3)) tags.append(h('span', 'jr-label', label));
    if (tags.childElementCount) el.append(tags);
    const meta = h('div', 'meta', icon(jira, card.type.icon, card.type.name));
    meta.append(h('span', `key${card.category === 'done' ? ' done' : ''}`, card.key));
    if (card.flagged) meta.append(h('span', 'flag', '⚑'));
    meta.append(h('span', 'grow'));
    if (card.points !== undefined) meta.append(h('span', 'points', String(card.points)));
    if (card.priority) meta.append(icon(jira, card.priority.icon, card.priority.name));
    meta.append(avatar(jira, card.assignee));
    el.append(meta);
    if (!on && card.category !== 'done') {
      const take = button('Take it on', 'small mender take', () => hands.take(card.key));
      take.title = 'Start a Mender session on this, in its own workspace';
      el.append(take);
    }
    el.addEventListener('click', () => hands.open(card.key));
    el.addEventListener('dragstart', (event) => {
      dragging = card;
      event.dataTransfer?.setData('text/plain', card.key);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => el.classList.add('dragging'));
      for (const [at, col] of board.columns.entries()) {
        const target = columns.children[at] as HTMLElement | undefined;
        if (target && col.statuses.includes(card.statusId)) target.dataset.home = 'yes';
      }
    });
    el.addEventListener('dragend', () => {
      dragging = null;
      el.classList.remove('dragging');
      for (const col of Array.from(columns.children) as HTMLElement[]) {
        col.classList.remove('over');
        delete col.dataset.home;
      }
      marker.remove();
    });
    return el;
  };

  const marker = h('div');
  marker.style.cssText = 'height:2px;background:#579dff;border-radius:1px;margin:-4px 2px';

  const paintColumns = (): void => {
    const scroll = columns.scrollLeft;
    const inner = new Map<number, number>();
    Array.from(columns.children).forEach((col, at) => {
      const list = col.querySelector('.jr-cards');
      if (list) inner.set(at, list.scrollTop);
    });
    columns.replaceChildren(
      ...board.columns.map((column, at) => {
        const cards = board.cards.filter((card) => column.statuses.includes(card.statusId));
        const shown = cards.filter(shows);
        const col = h('div', 'jr-column');
        const over = column.max !== undefined && cards.length > column.max;
        const count = h(
          'span',
          'count',
          shown.length === cards.length ? String(cards.length) : `${shown.length} of ${cards.length}`
        );
        if (column.max !== undefined) count.append(` · max ${column.max}`);
        if (over) count.style.color = '#f87168';
        const colhead = h('div', 'jr-colhead', column.name, count);
        if (column.category === 'done') colhead.append(h('span', 'done-mark', '✓'));
        const list = h('div', 'jr-cards', ...shown.map(cardEl));
        col.append(colhead, list);
        if (column.category !== 'done')
          col.append(button('+ Create', 'subtle jr-create-inline', () => hands.create(at)));

        col.addEventListener('dragover', (event) => {
          if (!dragging) return;
          event.preventDefault();
          col.classList.add('over');
          const items = Array.from(list.querySelectorAll<HTMLElement>('.jr-card:not(.dragging)'));
          const next = items.find((item) => {
            const r = item.getBoundingClientRect();
            return event.clientY < r.top + r.height / 2;
          });
          if (next) list.insertBefore(marker, next);
          else list.append(marker);
        });
        col.addEventListener('dragleave', (event) => {
          if (!col.contains(event.relatedTarget as Node)) {
            col.classList.remove('over');
            marker.remove();
          }
        });
        col.addEventListener('drop', (event) => {
          event.preventDefault();
          const card = dragging;
          if (!card) return;
          const nextEl = marker.nextElementSibling as HTMLElement | null;
          const prevEl = marker.previousElementSibling as HTMLElement | null;
          marker.remove();
          col.classList.remove('over');
          const before = nextEl?.dataset.key;
          const after = prevEl?.dataset.key;
          hands.move(card.key, at, before !== card.key ? before : undefined, after !== card.key ? after : undefined);
        });
        return col;
      })
    );
    columns.scrollLeft = scroll;
    Array.from(columns.children).forEach((col, at) => {
      const list = col.querySelector('.jr-cards');
      const top = inner.get(at);
      if (list && top) list.scrollTop = top;
    });
  };
  paintColumns();
  return root;
}
