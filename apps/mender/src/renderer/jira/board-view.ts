import type { Board, Card, Column, Jira, Person, RawIssue } from './data';
import { personOf, tapeOf } from './data';
import { KIT_NAMES, sprite } from '../yard/sprite';
import { day, face, gold, h, icon, pri, shortEpic, shortSummary, slab, titled, type Item, type Row } from './dom';

/** A session here on a ticket, and its lantern's colour and pulse. */
export interface Lit {
  task: string;
  name: string;
  mood: string;
}

export const MOODS: Record<string, { color: string; says: string; pulse: string; on: boolean }> = {
  working: { color: '#ffb24d', says: 'working', pulse: 'breathe', on: true },
  arriving: { color: '#ffb24d', says: 'waking', pulse: 'breathe', on: true },
  asking: { color: '#ff9a6a', says: 'wants you', pulse: 'flicker', on: true },
  resting: { color: '#a8c469', says: 'done, not looked at yet', pulse: '', on: true },
  hurt: { color: '#f2665a', says: 'broken', pulse: '', on: true },
  empty: { color: '#a89272', says: 'idle', pulse: '', on: false },
};
export const moodOf = (mood: string) => MOODS[mood] ?? MOODS.empty!;

/** The session's lantern, hung where it is drawn. */
export function lantern(on: Lit, cls: string): HTMLElement {
  const mood = moodOf(on.mood);
  const el = sprite(mood.on ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 2);
  el.classList.add(...cls.split(' '));
  el.style.setProperty('--lit', mood.color);
  if (mood.pulse) el.dataset.pulse = mood.pulse;
  return el;
}

/** What is narrowed on the board, kept while it stays open. */
export interface Filters {
  text: string;
  people: Set<string>;
  mine: boolean;
  today: boolean;
  flagged: boolean;
  epics: Set<string>;
  types: Set<string>;
  labels: Set<string>;
  versions: Set<string>;
  priorities: Set<string>;
  columns: Set<string>;
  quick: Set<number>;
  jql: string;
  group: Group;
}
export type Group = 'none' | 'epic' | 'people' | 'labels';

export const noFilters = (): Filters => ({
  text: '',
  people: new Set(),
  mine: false,
  today: false,
  flagged: false,
  epics: new Set(),
  types: new Set(),
  labels: new Set(),
  versions: new Set(),
  priorities: new Set(),
  columns: new Set(),
  quick: new Set(),
  jql: '',
  group: 'none',
});

/** How the board is drawn, kept on this machine. */
export interface Look {
  show: { epic: boolean; labels: boolean; due: boolean; priority: boolean; points: boolean; subtasks: boolean };
  allDone: boolean;
  folded: Record<string, string[]>;
}
const LOOK = 'mender.jira.look';
export function readLook(): Look {
  const base: Look = {
    show: { epic: true, labels: true, due: true, priority: true, points: true, subtasks: true },
    allDone: false,
    folded: {},
  };
  try {
    const got = JSON.parse(localStorage.getItem(LOOK) ?? '{}') as Partial<Look>;
    return { ...base, ...got, show: { ...base.show, ...got.show } };
  } catch {
    return base;
  }
}
export const keepLook = (look: Look): void => localStorage.setItem(LOOK, JSON.stringify(look));

export interface BoardHands {
  open(key: string): void;
  go(task: string): void;
  take(key: string): void;
  move(key: string, column: number, before?: string, after?: string): Promise<void>;
  /** Asks Jira for the board again, for what only Jira can narrow by. */
  reload(quiet?: boolean): Promise<void>;
  /** Moved here by other means than a drag, so the lagging feed does not undo it. */
  moved(key: string, statusId: string): void;
  pickBoard(): void;
  outside(url: string): void;
  said(text: string, sore?: boolean): void;
}

const NOBODY = '#nobody';
const NO_EPIC = '#none';
const DONE_SHOWN = 30;

const enc = encodeURIComponent;

export function boardView(
  jira: Jira,
  board: Board,
  lit: () => Record<string, Lit>,
  filters: Filters,
  look: Look,
  host: HTMLElement,
  hands: BoardHands
): { top: HTMLElement; body: HTMLElement; paint(): void } {
  const top = h('div', 'jr-top');
  const body = h('div', 'jr-body');
  const folded = new Set(look.folded[`${board.site}/${board.id}`] ?? []);
  let doneAll = look.allDone;
  let writing: { column: number; el: HTMLElement } | null = null;
  const boardUrl =
    board.kind === 'project'
      ? `https://${board.site}/browse/${board.projectKey}`
      : `https://${board.site}/jira/software/c/projects/${board.projectKey}/boards/${board.id}`;

  const columnOf = (card: Card): number => board.columns.findIndex((column) => column.statuses.includes(card.statusId));
  const parents = (): Map<string, NonNullable<Card['parent']>> => {
    const out = new Map<string, NonNullable<Card['parent']>>();
    for (const card of board.cards) if (card.parent) out.set(card.parent.key, card.parent);
    return out;
  };
  const people = (): Person[] => {
    const out = new Map<string, Person>();
    for (const card of board.cards) if (card.assignee) out.set(card.assignee.id, card.assignee);
    return [...out.values()].sort((a, b) => (a.id === board.me ? -1 : b.id === board.me ? 1 : a.name.localeCompare(b.name)));
  };

  const shows = (card: Card): boolean => {
    const text = filters.text.trim().toLowerCase();
    if (text && !`${card.key} ${card.summary} ${card.parent?.summary ?? ''} ${card.labels.join(' ')}`.toLowerCase().includes(text))
      return false;
    if (filters.people.size && !filters.people.has(card.assignee?.id ?? NOBODY)) return false;
    if (filters.mine && card.assignee?.id !== board.me) return false;
    if (filters.flagged && !card.flagged) return false;
    if (filters.today && !(card.updated && new Date(card.updated).toDateString() === new Date().toDateString())) return false;
    if (filters.epics.size && !filters.epics.has(card.parent?.key ?? NO_EPIC)) return false;
    if (filters.types.size && !filters.types.has(card.type.name)) return false;
    if (filters.labels.size && !card.labels.some((one) => filters.labels.has(one))) return false;
    if (filters.versions.size && !card.versions.some((one) => filters.versions.has(one))) return false;
    if (filters.priorities.size && !filters.priorities.has(card.priority?.name ?? '')) return false;
    if (filters.columns.size && !filters.columns.has(board.columns[columnOf(card)]?.name ?? '')) return false;
    return true;
  };

  // ── the heading ─────────────────────────────────────────────────────────
  const paintTop = (): void => {
    const proj = gold(board.projectName, (event) => boardSlab(event.currentTarget as HTMLElement), 'proj');
    proj.classList.remove('gold');
    proj.title = 'this board';
    const here = h('div', 'jr-here sh', proj, h('span', 'slash', '/'), h('span', 'where', board.sprint?.name ?? board.name));
    const sub = h('div', 'jr-sub sh');
    if (board.sprint?.end) {
      const days = Math.ceil((new Date(board.sprint.end).getTime() - Date.now()) / 86_400_000);
      sub.append(
        days >= 0
          ? h('b', '', days === 0 ? 'ends today' : `${days} day${days === 1 ? '' : 's'} left`)
          : h('b', 'late', `${-days} day${days === -1 ? '' : 's'} over`)
      );
      if (board.sprint.goal) sub.append(` · ${board.sprint.goal}`);
    } else sub.append(board.kind === 'project' ? `everything open in ${board.projectKey}` : board.kind === 'kanban' ? 'kanban · done drops off after a fortnight' : board.name);

    const tools = h('div', 'jr-tools sh');
    const find = h('input', 'jr-find');
    find.placeholder = 'find on the board…';
    find.value = filters.text;
    find.addEventListener('input', () => {
      filters.text = find.value;
      paintBody();
    });
    find.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && find.value.trim()) {
        event.preventDefault();
        acrossJira(find);
      }
    });
    tools.append(find);

    const faces = h('div', 'jr-faces');
    const everyone = people();
    const shown = everyone.slice(0, 8);
    const faceOf = (id: string, el: HTMLElement): void => {
      el.classList.toggle('on', filters.people.has(id));
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        if (filters.people.has(id)) filters.people.delete(id);
        else filters.people.add(id);
        el.classList.toggle('on', filters.people.has(id));
        paintBody();
      });
      faces.append(el);
    };
    for (const who of shown) faceOf(who.id, face(jira, who));
    if (everyone.length > shown.length) {
      const more = h('span', 'jr-face more', `+${everyone.length - shown.length}`);
      more.addEventListener('click', (event) => {
        event.stopPropagation();
        slab(host, more, everyone.slice(shown.length).map((who) => ({
          label: h('span', 'face-row', face(jira, who, 'tiny'), who.name),
          text: who.name,
          tick: filters.people.has(who.id),
          pick: () => {
            toggle(filters.people, who.id);
            paintBody();
          },
        })));
      });
      faces.append(more);
    }
    if (board.cards.some((card) => !card.assignee)) faceOf(NOBODY, face(jira, undefined));
    tools.append(faces);

    const filterBtn = gold('filter', () => filterSlab(filterBtn));
    tools.append(filterBtn);
    for (const [said, clear] of chosen()) {
      const x = h('b', '', '×');
      x.title = 'take it off';
      x.addEventListener('click', (event) => {
        event.stopPropagation();
        clear();
      });
      tools.append(h('span', 'jr-chosen', said, x));
    }
    if (filters.group === 'none') {
      const groupBtn = gold('group', () => groupSlab(groupBtn));
      tools.append(groupBtn);
    }
    const settingsBtn = gold('settings', () => settingsSlab(settingsBtn));
    tools.append(settingsBtn);
    if (board.kind !== 'project' || board.projectKey) tools.append(gold('new ticket', () => write(0)));

    const done = board.cards.filter((card) => card.category === 'done' || board.columns[columnOf(card)]?.category === 'done').length;
    const total = board.cards.length;
    const meter = h('span', 'jr-meter');
    for (let i = 0; i < 14; i++) meter.append(h('i', total && i < Math.round((done / total) * 14) ? 'on' : ''));
    const state = h('div', 'jr-state sh');
    if (board.sprint) {
      const open = total - done;
      const end = h('div', 'k gold', 'complete the sprint');
      let armed = false;
      end.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!armed) {
          armed = true;
          end.classList.add('armed');
          end.textContent = open ? `${open} not done go back to the backlog · press again` : 'close it · press again';
          /* Armed only for as long as it takes to mean it. */
          window.setTimeout(() => {
            if (!armed || !end.isConnected) return;
            armed = false;
            end.classList.remove('armed');
            end.textContent = 'complete the sprint';
          }, 5000);
          return;
        }
        end.textContent = 'completing…';
        void jira
          .send('POST', `/rest/agile/1.0/sprint/${board.sprint!.id}`, { state: 'closed' })
          .then(() => {
            hands.said(`${board.sprint!.name} is complete`);
            return hands.reload();
          })
          .catch((cause: Error) => {
            hands.said(cause.message || 'Jira would not close it.', true);
            paintTop();
          });
      });
      state.append(end);
    }
    state.append(h('div', 'm', meter, `${done} of ${total} done`));
    top.replaceChildren(here, sub, tools, state);
  };

  const toggle = <T>(set: Set<T>, one: T): void => {
    if (set.has(one)) set.delete(one);
    else set.add(one);
  };

  /** Every narrowing that is on, said as a phrase with a way to take it off. */
  const chosen = (): [string, () => void][] => {
    const out: [string, () => void][] = [];
    const list = (set: Set<string>, name: (id: string) => string, what: string): void => {
      if (!set.size) return;
      const names = [...set].map(name);
      out.push([
        `${what}: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`,
        () => {
          set.clear();
          repaint();
        },
      ]);
    };
    const epics = parents();
    list(filters.epics, (id) => (id === NO_EPIC ? 'none' : shortEpic(epics.get(id)?.summary ?? id)), 'epic');
    list(filters.columns, (id) => id.toLowerCase(), 'where');
    list(filters.types, (id) => id.toLowerCase(), 'kind');
    list(filters.labels, (id) => id, 'labels');
    list(filters.versions, (id) => id, 'release');
    list(filters.priorities, (id) => id.toLowerCase(), 'priority');
    const flag = (on: boolean, said: string, off: () => void): void => {
      if (on)
        out.push([
          said,
          () => {
            off();
            repaint();
          },
        ]);
    };
    flag(filters.mine, 'only mine', () => (filters.mine = false));
    flag(filters.flagged, 'flagged', () => (filters.flagged = false));
    flag(filters.today, 'changed today', () => (filters.today = false));
    for (const quick of board.quickFilters)
      if (filters.quick.has(quick.id))
        out.push([
          quick.name.toLowerCase(),
          () => {
            filters.quick.delete(quick.id);
            void hands.reload();
          },
        ]);
    if (filters.jql.trim())
      out.push([
        `jql: ${filters.jql.length > 28 ? `${filters.jql.slice(0, 28)}…` : filters.jql}`,
        () => {
          filters.jql = '';
          void hands.reload();
        },
      ]);
    if (filters.group !== 'none')
      out.push([
        `grouped by ${filters.group === 'people' ? 'who has it' : filters.group}`,
        () => {
          filters.group = 'none';
          repaint();
        },
      ]);
    return out;
  };

  const repaint = (): void => {
    paintTop();
    paintBody();
  };

  // ── slabs off the heading ───────────────────────────────────────────────
  const acrossJira = (anchor: HTMLElement): void => {
    const text = filters.text.trim().replace(/"/g, '');
    slab(host, anchor, async () => {
      const jql = /^[A-Z][A-Z0-9_]+-\d+$/i.test(text) ? `key = "${text.toUpperCase()}"` : `text ~ "${text}*" ORDER BY updated DESC`;
      const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
        jql,
        fields: ['summary', 'issuetype', 'status'],
        maxResults: 20,
      });
      return [
        { head: `across all of jira`, hint: got.issues.length ? '' : 'nothing' },
        ...got.issues.map(
          (one): Row => ({
            label: h('span', '', icon(jira, one.fields.issuetype?.iconUrl, ''), h('span', 'k', one.key), shortSummary(one.fields.summary ?? '', 48)),
            hint: one.fields.status?.name?.toLowerCase() ?? '',
            pick: () => hands.open(one.key),
          })
        ),
      ];
    });
  };

  const boardSlab = (anchor: HTMLElement): void => {
    slab(host, anchor, [
      { head: board.name },
      { label: 'open it in jira', pick: () => hands.outside(boardUrl) },
      { label: 'read it again now', pick: () => void hands.reload() },
      { label: 'tie this project to another board', pick: () => hands.pickBoard() },
    ]);
  };

  const filterSlab = (anchor: HTMLElement): void => {
    const counted = <T extends string>(values: Map<T, { label: Node | string; text: string; n: number }>, set: Set<T>): Item[] =>
      [...values.entries()].map(([id, one]) => ({
        label: one.label,
        text: one.text,
        hint: String(one.n),
        tick: set.has(id),
        pick: () => {
          toggle(set, id);
          repaint();
        },
      }));
    const tally = <T extends string>(of: (card: Card) => (T | undefined)[], label: (id: T) => Node | string, text: (id: T) => string) => {
      const out = new Map<T, { label: Node | string; text: string; n: number }>();
      for (const card of board.cards)
        for (const id of of(card)) {
          if (id === undefined) continue;
          const was = out.get(id);
          if (was) was.n++;
          else out.set(id, { label: label(id), text: text(id), n: 1 });
        }
      return out;
    };
    const epics = parents();
    const dims: [string, Set<string>, () => Item[]][] = [
      ['epic', filters.epics, () => counted(tally((card) => [card.parent?.key ?? NO_EPIC], (id) => {
        if (id === NO_EPIC) return 'no epic';
        const e = epics.get(id);
        const sw = h('span', 'sw');
        sw.style.background = tapeOf(e?.color, id);
        return h('span', '', sw, shortEpic(e?.summary ?? id));
      }, (id) => epics.get(id)?.summary ?? 'no epic'), filters.epics)],
      ['who has it', filters.people, () => counted(tally((card) => [card.assignee?.id ?? NOBODY], (id) => {
        const who = people().find((one) => one.id === id);
        return h('span', 'face-row', face(jira, who, 'tiny'), who?.name ?? 'nobody');
      }, (id) => people().find((one) => one.id === id)?.name ?? 'nobody'), filters.people)],
      ['where it stands', filters.columns, () => counted(tally((card) => [board.columns[columnOf(card)]?.name], (id) => id.toLowerCase(), (id) => id), filters.columns)],
      ['kind', filters.types, () => {
        const icons = new Map(board.cards.map((card) => [card.type.name, card.type.icon]));
        return counted(tally((card) => [card.type.name], (id) => h('span', '', icon(jira, icons.get(id), id), id.toLowerCase()), (id) => id), filters.types);
      }],
      ['labels', filters.labels, () => counted(tally((card) => card.labels, (id) => id, (id) => id), filters.labels)],
      ['release', filters.versions, () => counted(tally((card) => card.versions, (id) => id, (id) => id), filters.versions)],
      ['priority', filters.priorities, () => counted(tally((card) => [card.priority?.name], (id) => h('span', '', pri(id) ?? h('span', 'jr-pri'), id.toLowerCase()), (id) => id), filters.priorities)],
    ];
    const items: Item[] = [{ head: 'narrow it by' }];
    for (const [name, set, rows] of dims)
      items.push({ label: name, hint: set.size ? String(set.size) : '', sub: rows, subOpts: { search: `find ${name === 'labels' ? 'a label' : 'one'}…` } });
    items.push('hr');
    const flag = (label: string, on: () => boolean, flip: () => void): Row => ({
      label,
      tick: on(),
      pick: () => {
        flip();
        repaint();
      },
    });
    if (board.me) items.push(flag('only mine', () => filters.mine, () => (filters.mine = !filters.mine)));
    items.push(flag('flagged', () => filters.flagged, () => (filters.flagged = !filters.flagged)));
    items.push(flag('changed today', () => filters.today, () => (filters.today = !filters.today)));
    if (board.quickFilters.length) {
      items.push('hr', { head: "the board's own" });
      for (const quick of board.quickFilters)
        items.push({
          label: quick.name.toLowerCase(),
          tick: filters.quick.has(quick.id),
          pick: () => {
            toggle(filters.quick, quick.id);
            void hands.reload();
          },
        });
    }
    items.push('hr', { label: 'write it in jql', hint: '⇧F', pick: () => jqlSlab(anchor) });
    items.push({
      label: 'clear everything',
      pick: () => {
        const ask = filters.quick.size > 0 || filters.jql.trim() !== '';
        const group = filters.group;
        Object.assign(filters, noFilters(), { group });
        if (ask) void hands.reload();
        else repaint();
      },
    });
    slab(host, anchor, items);
  };

  const jqlSlab = (anchor: HTMLElement): void => {
    const area = h('textarea', 'q');
    area.placeholder = 'priority = High AND labels = mobile';
    area.value = filters.jql;
    const apply = (): void => {
      filters.jql = area.value.trim();
      box.remove();
      void hands.reload();
    };
    area.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        apply();
      }
      if (event.key === 'Escape') box.remove();
    });
    const box = h('div', 'jr-slab', h('div', 'h', h('span', '', 'only what this jql finds'), h('span', '', 'return')), area);
    box.style.width = '420px';
    host.append(box);
    const r = anchor.getBoundingClientRect();
    box.style.left = `${r.left}px`;
    box.style.top = `${r.bottom + 8}px`;
    const away = (event: MouseEvent): void => {
      if (box.contains(event.target as Node)) return;
      box.remove();
      document.removeEventListener('mousedown', away, true);
    };
    setTimeout(() => document.addEventListener('mousedown', away, true));
    requestAnimationFrame(() => area.focus());
  };

  const groupSlab = (anchor: HTMLElement): void => {
    const by = (label: string, group: Group): Row => ({
      label,
      on: filters.group === group,
      pick: () => {
        filters.group = group;
        repaint();
      },
    });
    slab(host, anchor, [{ head: 'group the board by' }, by('nothing', 'none'), by('epic', 'epic'), by('who has it', 'people'), by('labels', 'labels')]);
  };

  const settingsSlab = (anchor: HTMLElement): void => {
    const show = (label: string, key: keyof Look['show']): Row => ({
      label,
      tick: look.show[key],
      pick: () => {
        look.show[key] = !look.show[key];
        keepLook(look);
        paintBody();
      },
    });
    slab(host, anchor, [
      { head: 'on the notes' },
      show('its epic', 'epic'),
      show('labels', 'labels'),
      show('due date', 'due'),
      show('priority', 'priority'),
      show('points', 'points'),
      show('subtasks', 'subtasks'),
      'hr',
      { head: 'done' },
      {
        label: `only the last ${DONE_SHOWN}`,
        on: !look.allDone,
        pick: () => {
          look.allDone = doneAll = false;
          keepLook(look);
          paintBody();
        },
      },
      {
        label: 'all of it',
        on: look.allDone,
        pick: () => {
          look.allDone = doneAll = true;
          keepLook(look);
          paintBody();
        },
      },
      'hr',
      { label: 'unfold every column', off: !folded.size, pick: () => setFolded(() => folded.clear()) },
      { label: 'open it in jira', pick: () => hands.outside(boardUrl) },
      { label: 'tie this project to another board', pick: () => hands.pickBoard() },
    ]);
  };

  const setFolded = (change: () => void): void => {
    change();
    look.folded[`${board.site}/${board.id}`] = [...folded];
    keepLook(look);
    paintBody();
  };

  // ── a note ──────────────────────────────────────────────────────────────
  let dragging: Card | null = null;
  const marker = h('div', 'jr-mark');

  const noteOf = (card: Card): HTMLElement[] => {
    const el = h('div', `jr-note${card.flagged ? ' flag' : ''}`);
    el.draggable = true;
    el.dataset.key = card.key;
    if (card.parent && look.show.epic) {
      const tape = h('div', 'tape', shortEpic(card.parent.summary));
      tape.style.background = tapeOf(card.parent.color, card.parent.key);
      tape.title = `${card.parent.key} ${card.parent.summary}`;
      tape.addEventListener('click', (event) => {
        event.stopPropagation();
        hands.open(card.parent!.key);
      });
      el.append(tape);
    } else el.append(h('div', 'tack'));
    el.append(titled(card.summary, 'sum'));
    if (look.show.labels && card.labels.length) el.append(h('div', 'labels', ...card.labels.map((one) => h('span', 'lab', one))));
    const due = card.due ? new Date(`${card.due}T12:00`) : null;
    const soon = due && (due.getTime() - Date.now()) / 86_400_000 < 3;
    const foot = h(
      'div',
      'foot',
      icon(jira, card.type.icon, card.type.name),
      h('span', '', card.key),
      h('span', 'grow'),
      look.show.due && card.due ? h('span', `due${soon ? ' soon' : ''}`, day(card.due)) : null,
      look.show.priority ? pri(card.priority?.name) : null,
      look.show.points && card.points !== undefined ? h('span', 'jr-pts', String(card.points)) : null,
      face(jira, card.assignee, 'small')
    );
    el.append(foot);
    if (look.show.subtasks && card.subtasks.length) {
      const done = card.subtasks.filter((one) => one.done).length;
      el.append(
        h(
          'div',
          'subs',
          'subtasks',
          ...card.subtasks.slice(0, 12).map((one) => h('i', one.done ? 'd' : '')),
          h('span', '', `${done}/${card.subtasks.length}`)
        )
      );
    }
    if (card.flagged) el.append(h('div', 'ribbon'));
    const on = lit()[card.key];
    const acts = h('div', 'acts');
    if (!on && card.category !== 'done') {
      const take = h('span', '', 'take it on');
      take.title = 'its own workspace, its own branch, and a session told what this says';
      take.addEventListener('click', (event) => {
        event.stopPropagation();
        hands.take(card.key);
      });
      acts.append(take);
    }
    const more = h('span', '', '•••');
    more.addEventListener('click', (event) => {
      event.stopPropagation();
      cardSlab(card, more, el);
    });
    acts.append(more);
    el.append(acts);
    const out: HTMLElement[] = [el];
    if (on) {
      const mood = moodOf(on.mood);
      el.classList.add('lit');
      el.style.setProperty('--lit', mood.color);
      el.append(lantern(on, 'jr-lantern'));
      const who = h('div', 'jr-who sh', h('i'), `${on.name} · ${mood.says}`);
      who.style.setProperty('--lit', mood.color);
      who.title = 'walk into that session';
      who.addEventListener('click', (event) => {
        event.stopPropagation();
        hands.go(on.task);
      });
      out.push(who);
    }
    el.addEventListener('click', () => hands.open(card.key));
    el.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      cardSlab(card, { x: event.clientX, y: event.clientY }, el);
    });
    drags(el, card);
    return out;
  };

  const slipOf = (card: Card): HTMLElement => {
    const edge = h('span', 'edge');
    edge.style.background = card.parent ? tapeOf(card.parent.color, card.parent.key) : '#a07a4a';
    const el = h(
      'div',
      'jr-old',
      edge,
      titled(card.summary, 'said'),
      h(
        'div',
        'when',
        h('span', 'jr-tick'),
        h('s', '', card.key),
        card.points !== undefined && look.show.points ? h('span', '', `${card.points} pts`) : null,
        h('span', 'grow'),
        face(jira, card.assignee, 'tiny')
      )
    );
    el.draggable = true;
    el.dataset.key = card.key;
    const on = lit()[card.key];
    if (on) {
      el.classList.add('lit');
      el.style.setProperty('--lit', moodOf(on.mood).color);
    }
    el.addEventListener('click', () => hands.open(card.key));
    el.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      cardSlab(card, { x: event.clientX, y: event.clientY }, el);
    });
    drags(el, card);
    return el;
  };

  const drags = (el: HTMLElement, card: Card): void => {
    el.addEventListener('dragstart', (event) => {
      dragging = card;
      event.dataTransfer?.setData('text/plain', card.key);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => el.classList.add('dragging'));
    });
    el.addEventListener('dragend', () => {
      dragging = null;
      el.classList.remove('dragging');
      marker.remove();
      for (const col of Array.from(body.querySelectorAll('.jr-col.over'))) col.classList.remove('over');
    });
  };

  /** Where a dragged note can be let go: a column, in one lane or another. */
  const dropOn = (col: HTMLElement, notes: HTMLElement, at: number, lane?: { epic?: string; who?: string }): void => {
    col.addEventListener('dragover', (event) => {
      if (!dragging) return;
      event.preventDefault();
      col.classList.add('over');
      const items = Array.from(notes.querySelectorAll<HTMLElement>('.jr-note:not(.dragging), .jr-old:not(.dragging)'));
      const next = items.find((item) => {
        const r = item.getBoundingClientRect();
        return event.clientY < r.top + r.height / 2;
      });
      if (next) notes.insertBefore(marker, next);
      else notes.append(marker);
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
      col.classList.remove('over');
      if (!card) return;
      let nextEl = marker.nextElementSibling as HTMLElement | null;
      while (nextEl && !nextEl.dataset.key) nextEl = nextEl.nextElementSibling as HTMLElement | null;
      let prevEl = marker.previousElementSibling as HTMLElement | null;
      while (prevEl && !prevEl.dataset.key) prevEl = prevEl.previousElementSibling as HTMLElement | null;
      marker.remove();
      const before = nextEl?.dataset.key;
      const after = prevEl?.dataset.key;
      if (lane?.epic !== undefined && lane.epic !== (card.parent?.key ?? NO_EPIC))
        void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { fields: { parent: lane.epic === NO_EPIC ? null : { key: lane.epic } } }), '');
      if (lane?.who !== undefined && lane.who !== (card.assignee?.id ?? NOBODY))
        void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}/assignee`, { accountId: lane.who === NOBODY ? null : lane.who }), '');
      void hands.move(card.key, at, before !== card.key ? before : undefined, after !== card.key ? after : undefined);
    });
  };

  /** Writes to Jira, says what happened, and reads the board back. */
  const change = async (key: string, what: () => Promise<unknown>, said: string): Promise<void> => {
    try {
      await what();
      if (said) hands.said(said);
    } catch (cause) {
      hands.said(`${key}: ${(cause as Error).message || 'Jira said no.'}`, true);
    }
    await hands.reload(true);
  };

  // ── the note's own slab ─────────────────────────────────────────────────
  const cardSlab = (card: Card, at: HTMLElement | { x: number; y: number }, note: HTMLElement): void => {
    note.classList.add('held');
    const column = columnOf(card);
    const same = board.cards.filter((one) => columnOf(one) === column && one.key !== card.key);
    const on = lit()[card.key];
    const items: Item[] = [
      { head: card.key, hint: card.type.name.toLowerCase() },
      on
        ? { label: `walk into ${on.name}`, pick: () => hands.go(on.task) }
        : { label: 'take it on in mender', off: card.category === 'done', pick: () => hands.take(card.key) },
      'hr',
    ];
    if (board.rank && same.length)
      items.push({
        label: 'move to',
        sub: () => [
          { label: 'the top of the column', pick: () => void hands.move(card.key, column, same[0]!.key) },
          { label: 'the bottom of the column', pick: () => void hands.move(card.key, column, undefined, same[same.length - 1]!.key) },
        ],
      });
    items.push(
      {
        label: 'move it along',
        sub: async () => {
          const got = await jira.get<{ transitions: { id: string; name: string; to?: { id?: string; name?: string } }[] }>(
            `/rest/api/3/issue/${card.key}/transitions`
          );
          return [
            { head: 'move it along' },
            ...got.transitions.map((t): Row => ({
              label: (t.to?.name ?? t.name).toLowerCase(),
              hint: t.to?.id === card.statusId ? 'here' : t.name !== t.to?.name ? t.name.toLowerCase() : '',
              off: t.to?.id === card.statusId,
              pick: () =>
                void change(
                  card.key,
                  async () => {
                    await jira.send('POST', `/rest/api/3/issue/${card.key}/transitions`, { transition: { id: t.id } });
                    if (t.to?.id) hands.moved(card.key, t.to.id);
                  },
                  `${card.key} is ${(t.to?.name ?? t.name).toLowerCase()} now`
                ),
            })),
          ];
        },
      },
      { label: 'give it to', subOpts: { search: 'find somebody…' }, sub: () => giveTo },
      { label: 'change its epic', subOpts: { search: 'find an epic…' }, sub: () => epicOf },
      { label: 'labels', subOpts: { search: 'find or write a label…' }, sub: () => labelsOf },
      {
        label: 'link to another',
        sub: async () => {
          const got = await jira.get<{ issueLinkTypes: { name: string; inward: string; outward: string }[] }>('/rest/api/3/issueLinkType');
          const ways: Row[] = [];
          const search = { search: 'find the other ticket…' };
          for (const type of got.issueLinkTypes) {
            ways.push({ label: type.outward, subOpts: search, sub: () => linkTo(card, type.name, true) });
            if (type.inward !== type.outward)
              ways.push({ label: type.inward, subOpts: search, sub: () => linkTo(card, type.name, false) });
          }
          return [{ head: `${card.key}…` }, ...ways];
        },
      },
      {
        label: card.flagged ? 'take the flag off' : 'flag it',
        pick: () => void flag(card),
      },
      'hr',
      { label: 'copy its link', pick: () => void copy(`https://${board.site}/browse/${card.key}`, 'its link is copied') },
      { label: 'copy its key', pick: () => void copy(card.key, `${card.key} is copied`) },
      { label: 'open it in jira', pick: () => hands.outside(`https://${board.site}/browse/${card.key}`) },
      'hr',
      {
        label: 'archive it',
        arm: `archive ${card.key}? press again`,
        pick: () => void change(card.key, () => jira.send('PUT', '/rest/api/3/issue/archive', { issueIdsOrKeys: [card.key] }), `${card.key} is archived`),
      },
      {
        label: 'delete it',
        sore: true,
        arm: card.subtasks.length
          ? `delete ${card.key} and its ${card.subtasks.length} subtask${card.subtasks.length === 1 ? '' : 's'} for good? press again`
          : `delete ${card.key} for good? press again`,
        pick: () => void change(card.key, () => jira.send('DELETE', `/rest/api/3/issue/${card.key}?deleteSubtasks=true`), `${card.key} is gone`),
      }
    );
    slab(host, at, items);
    const unhold = (): void => {
      if (document.querySelector('.jr-slab')) return;
      note.classList.remove('held');
      document.removeEventListener('mouseup', unhold, true);
    };
    setTimeout(() => document.addEventListener('mouseup', unhold, true), 50);

    /* The pickers that search as you write. */
    async function giveTo(query: string): Promise<Item[]> {
      const found = await jira.get<{ accountId: string; displayName: string; avatarUrls?: Record<string, string> }[]>(
        `/rest/api/3/user/assignable/search?issueKey=${card.key}&query=${enc(query)}&maxResults=30`
      );
      const mine = board.self && !query ? [board.self] : [];
      const all = [...mine, ...found.map((u) => personOf(u)!).filter((u) => u && u.id !== board.self?.id)];
      return [
        { label: h('span', 'face-row', face(jira, undefined, 'tiny'), 'nobody'), on: !card.assignee, pick: () => void assign(card, null) },
        ...all.map((who): Row => ({
          label: h('span', 'face-row', face(jira, who, 'tiny'), who.id === board.me ? `${who.name} (you)` : who.name),
          on: card.assignee?.id === who.id,
          pick: () => void assign(card, who),
        })),
      ];
    }
    async function epicOf(query: string): Promise<Item[]> {
      const text = query.trim().replace(/"/g, '');
      const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
        jql: `project = "${board.projectKey}" AND issuetype = Epic${text ? ` AND summary ~ "${text}*"` : ''} ORDER BY created DESC`,
        fields: ['summary', 'status'],
        maxResults: 30,
      });
      const known = parents();
      return [
        { label: 'no epic', on: !card.parent, pick: () => void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { fields: { parent: null } }), `${card.key} has no epic now`) },
        ...got.issues.map((one): Row => {
          const sw = h('span', 'sw');
          sw.style.background = tapeOf(known.get(one.key)?.color, one.key);
          return {
            label: h('span', '', sw, shortEpic(one.fields.summary ?? one.key)),
            text: one.fields.summary ?? '',
            hint: one.key,
            on: card.parent?.key === one.key,
            pick: () => void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { fields: { parent: { key: one.key } } }), `${card.key} is under ${one.key} now`),
          };
        }),
      ];
    }
    async function labelsOf(query: string): Promise<Item[]> {
      allLabels ??= await jira
        .get<{ values: string[] }>('/rest/api/3/label?maxResults=1000')
        .then((got) => got.values)
        .catch(() => [...new Set(board.cards.flatMap((one) => one.labels))]);
      const q = query.trim().replace(/\s+/g, '_');
      const names = [...new Set([...card.labels, ...allLabels])].filter((one) => !q || one.toLowerCase().includes(q.toLowerCase()));
      const rows: Item[] = names.slice(0, 40).map((one) => ({
        label: one,
        tick: card.labels.includes(one),
        pick: () => {
          const had = card.labels.includes(one);
          card.labels = had ? card.labels.filter((x) => x !== one) : [...card.labels, one];
          void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { update: { labels: [had ? { remove: one } : { add: one }] } }), '');
        },
      }));
      if (q && !names.includes(q))
        rows.unshift({
          label: `+ ${q}`,
          pick: () => void change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { update: { labels: [{ add: q }] } }), `${card.key} is labelled ${q}`),
        });
      return rows;
    }
  };
  let allLabels: string[] | null = null;

  const linkTo = (card: Card, type: string, outward: boolean) => async (query: string): Promise<Item[]> => {
    const text = query.trim().replace(/"/g, '');
    const jql = !text
      ? `project = "${board.projectKey}" AND key != ${card.key} ORDER BY updated DESC`
      : /^[A-Z][A-Z0-9_]+-\d+$/i.test(text)
        ? `key = "${text.toUpperCase()}"`
        : `project = "${board.projectKey}" AND summary ~ "${text}*" ORDER BY updated DESC`;
    const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
      jql,
      fields: ['summary', 'issuetype'],
      maxResults: 20,
    });
    return got.issues
      .filter((one) => one.key !== card.key)
      .map((one): Row => ({
        label: h('span', '', icon(jira, one.fields.issuetype?.iconUrl, ''), h('span', 'k', one.key), shortSummary(one.fields.summary ?? '', 40)),
        pick: () =>
          void change(
            card.key,
            () =>
              jira.send('POST', '/rest/api/3/issueLink', {
                type: { name: type },
                /* Jira reads a link as "the inward one <outward words> the outward one". */
                inwardIssue: { key: outward ? card.key : one.key },
                outwardIssue: { key: outward ? one.key : card.key },
              }),
            `${card.key} is linked to ${one.key}`
          ),
      }));
  };

  const assign = (card: Card, who: Person | null): Promise<void> =>
    change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}/assignee`, { accountId: who?.id ?? null }), who ? `${card.key} is ${who.id === board.me ? 'yours' : `${who.name.split(' ')[0]}'s`} now` : `nobody has ${card.key} now`);

  const flag = async (card: Card): Promise<void> => {
    const ids = await jira.fields();
    const id = ids.get('flagged');
    if (!id) {
      hands.said('this site keeps no flag on its tickets', true);
      return;
    }
    await change(card.key, () => jira.send('PUT', `/rest/api/3/issue/${card.key}`, { fields: { [id]: card.flagged ? [] : [{ value: 'Impediment' }] } }), card.flagged ? `${card.key} is unflagged` : `${card.key} is flagged`);
  };

  const copy = async (text: string, said: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    hands.said(said);
  };

  // ── writing a new one ───────────────────────────────────────────────────
  let kinds: { id: string; name: string; iconUrl?: string }[] | null = null;
  const write = (column: number): void => {
    writing = { column, el: blankNote(column) };
    if (filters.group !== 'none') {
      filters.group = 'none';
      paintTop();
    }
    if (folded.has(board.columns[column]?.name ?? '')) folded.delete(board.columns[column]!.name);
    paintBody();
  };

  const blankNote = (column: number): HTMLElement => {
    const el = h('div', 'jr-note blank');
    const area = h('textarea');
    area.placeholder = 'what needs doing…';
    let kind = '';
    let who: Person | null = null;
    const kindPick = h('span', 'pick', 'kind');
    const whoPick = h('span', 'pick', 'nobody');
    const paintPicks = (): void => {
      const k = kinds?.find((one) => one.id === kind);
      kindPick.replaceChildren(k ? icon(jira, k.iconUrl, k.name) : '', ` ${(k?.name ?? 'kind').toLowerCase()} ›`);
      whoPick.replaceChildren(who ? `${who.id === board.me ? 'me' : who.name.split(' ')[0]} ›` : 'nobody ›');
    };
    /* Asked again whenever it is still missing, so a moment when Jira or this
       Mac was slow to answer never leaves a note that cannot be pinned. */
    const loadKinds = async (): Promise<void> => {
      if (!kinds?.length)
        kinds = await jira
          .get<{ issueTypes?: { id: string; name: string; iconUrl?: string; subtask?: boolean; hierarchyLevel?: number }[] }>(
            `/rest/api/3/issue/createmeta/${board.projectKey}/issuetypes?maxResults=50`
          )
          .then((got) => (got.issueTypes ?? []).filter((one) => !one.subtask && (one.hierarchyLevel ?? 0) === 0))
          .catch(() => []);
      if (!kind) kind = (kinds.find((one) => one.name === 'Task') ?? kinds[0])?.id ?? '';
      paintPicks();
    };
    void loadKinds();
    kindPick.addEventListener('click', (event) => {
      event.stopPropagation();
      slab(host, kindPick, async () => (await loadKinds(), kinds ?? []).map((one) => ({
        label: h('span', '', icon(jira, one.iconUrl, one.name), one.name.toLowerCase()),
        on: one.id === kind,
        pick: () => {
          kind = one.id;
          paintPicks();
          area.focus();
        },
      })));
    });
    whoPick.addEventListener('click', (event) => {
      event.stopPropagation();
      slab(host, whoPick, async (query) => {
        const found = await jira.get<{ accountId: string; displayName: string; avatarUrls?: Record<string, string> }[]>(
          `/rest/api/3/user/assignable/search?project=${board.projectKey}&query=${enc(query)}&maxResults=30`
        );
        return [
          { label: 'nobody', on: !who, pick: () => { who = null; paintPicks(); area.focus(); } },
          ...found.map((u) => personOf(u)!).map((one): Row => ({
            label: h('span', 'face-row', face(jira, one, 'tiny'), one.id === board.me ? `${one.name} (you)` : one.name),
            on: who?.id === one.id,
            pick: () => { who = one; paintPicks(); area.focus(); },
          })),
        ];
      }, { search: 'find somebody…' });
    });
    const pin = h('span', 'pick', 'pin it');
    const make = async (): Promise<void> => {
      const text = area.value.trim();
      if (!kind) await loadKinds();
      if (!text || !kind) {
        if (text) hands.said('Jira has not said what kinds of ticket this project takes yet', true);
        area.focus();
        return;
      }
      pin.textContent = 'pinning…';
      try {
        const made = await jira.send<{ key: string }>('POST', '/rest/api/3/issue', {
          fields: {
            project: { key: board.projectKey },
            issuetype: { id: kind },
            summary: text,
            ...(who ? { assignee: { accountId: who.id } } : {}),
          },
        });
        if (board.sprint) await jira.send('POST', `/rest/agile/1.0/sprint/${board.sprint.id}/issue`, { issues: [made.key] }).catch(() => undefined);
        const into = board.columns[column];
        if (column > 0 && into) await jira.move(made.key, into.statuses).catch(() => false);
        writing = null;
        hands.said(`${made.key} is pinned`);
        await hands.reload(true);
      } catch (cause) {
        pin.textContent = 'pin it';
        hands.said((cause as Error).message || 'Jira would not take it.', true);
      }
    };
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      void make();
    });
    area.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void make();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        writing = null;
        paintBody();
      }
    });
    el.addEventListener('click', (event) => event.stopPropagation());
    el.append(h('div', 'tack'), area, h('div', 'foot', kindPick, whoPick, h('span', 'grow'), pin));
    paintPicks();
    requestAnimationFrame(() => area.focus());
    return el;
  };

  // ── columns ─────────────────────────────────────────────────────────────
  const columnHead = (column: Column, at: number, cards: Card[], shown: Card[]): HTMLElement => {
    const over = column.max !== undefined && cards.length > column.max;
    const n = h('span', `n${over ? ' over' : ''}`, `${shown.length === cards.length ? cards.length : `${shown.length} of ${cards.length}`}${column.max !== undefined ? ` · max ${column.max}` : ''}`);
    const fold = h('span', 'fold', folded.has(column.name) ? '›‹' : '‹›');
    fold.title = folded.has(column.name) ? 'unfold it' : 'fold it away';
    fold.addEventListener('click', (event) => {
      event.stopPropagation();
      setFolded(() => toggle(folded, column.name));
    });
    void at;
    return h('div', 'jr-label sh', column.name.toLowerCase(), n, fold);
  };

  const columnOfCards = (column: Column, at: number, mine: Card[], opts: { lane?: { epic?: string; who?: string }; head?: boolean; all?: Card[] } = {}): HTMLElement => {
    const done = column.category === 'done';
    const col = h('div', `jr-col${done ? ' done' : ''}`);
    if (folded.has(column.name)) {
      col.classList.add('folded');
      if (opts.head !== false) col.append(columnHead(column, at, opts.all ?? mine, mine));
      col.addEventListener('click', () => setFolded(() => folded.delete(column.name)));
      return col;
    }
    if (opts.head !== false) col.append(columnHead(column, at, opts.all ?? mine, mine));
    const scroll = h('div', 'jr-scroll');
    const notes = h('div', 'jr-notes');
    if (done) {
      const cap = doneAll || opts.lane ? mine.length : DONE_SHOWN;
      for (const card of mine.slice(0, cap)) notes.append(slipOf(card));
      if (mine.length > cap)
        notes.append(
          gold(`and ${mine.length - cap} more`, () => {
            doneAll = true;
            paintBody();
          }, 'jr-pin sh')
        );
    } else {
      for (const card of mine) notes.append(...noteOf(card));
      if (writing?.column === at && !opts.lane) notes.append(writing.el);
    }
    const post = h('div', 'jr-post');
    if (!done && (mine.length || (writing?.column === at && !opts.lane))) scroll.append(post);
    scroll.append(notes);
    if (!done && !opts.lane && writing?.column !== at) scroll.append(gold('+ pin a new one', () => write(at), 'jr-pin sh'));
    col.append(scroll);
    dropOn(col, notes, at, opts.lane);
    requestAnimationFrame(() => {
      post.style.height = `${notes.offsetHeight + 26}px`;
    });
    return col;
  };

  const paintBody = (): void => {
    const keep = new Map<number, number>();
    body.querySelectorAll('.jr-scroll').forEach((one, i) => keep.set(i, one.scrollTop));
    const lanesScroll = body.querySelector('.jr-lanes')?.scrollTop ?? 0;
    const shown = board.cards.filter(shows);
    if (filters.group === 'none') {
      const cols = h('div', 'jr-cols');
      board.columns.forEach((column, at) => {
        const all = board.cards.filter((card) => column.statuses.includes(card.statusId));
        cols.append(columnOfCards(column, at, all.filter(shows), { all }));
      });
      body.replaceChildren(cols);
      body.querySelectorAll('.jr-scroll').forEach((one, i) => (one.scrollTop = keep.get(i) ?? 0));
      return;
    }
    const lanes = h('div', 'jr-lanes');
    const heads = h('div', 'jr-heads');
    board.columns.forEach((column, at) => {
      const all = board.cards.filter((card) => column.statuses.includes(card.statusId));
      const col = h('div', `jr-col${folded.has(column.name) ? ' folded' : ''}`, columnHead(column, at, all, all.filter(shows)));
      if (folded.has(column.name)) col.addEventListener('click', () => setFolded(() => folded.delete(column.name)));
      heads.append(col);
    });
    lanes.append(heads);
    for (const lane of laneList(shown)) {
      const sign = h('div', 'jr-sign', ...lane.sign);
      if (lane.open) sign.addEventListener('click', lane.open);
      const doneN = lane.cards.filter((card) => board.columns[columnOf(card)]?.category === 'done').length;
      const bar = h('span', 'jr-bar');
      for (let i = 0; i < 10; i++) bar.append(h('i', lane.cards.length && i < Math.round((doneN / lane.cards.length) * 10) ? 'on' : ''));
      sign.append(bar, h('span', 'n', `${doneN}/${lane.cards.length} done`));
      const row = h('div', 'jr-lane');
      board.columns.forEach((column, at) =>
        row.append(columnOfCards(column, at, lane.cards.filter((card) => column.statuses.includes(card.statusId)), { lane: lane.drop, head: false }))
      );
      lanes.append(h('div', 'jr-beam', sign), row);
    }
    body.replaceChildren(lanes);
    lanes.scrollTop = lanesScroll;
  };

  const laneList = (shown: Card[]): { sign: (Node | string)[]; cards: Card[]; drop?: { epic?: string; who?: string }; open?: () => void }[] => {
    if (filters.group === 'epic') {
      const out = new Map<string, Card[]>();
      for (const card of shown) out.set(card.parent?.key ?? NO_EPIC, [...(out.get(card.parent?.key ?? NO_EPIC) ?? []), card]);
      const known = parents();
      return [...out.entries()]
        .sort(([a], [b]) => (a === NO_EPIC ? 1 : b === NO_EPIC ? -1 : 0))
        .map(([key, cards]) => {
          const e = known.get(key);
          const sw = h('span', 'sw');
          sw.style.background = e ? tapeOf(e.color, key) : '#a07a4a';
          return {
            sign: [sw, e ? shortEpic(e.summary) : 'no epic', e ? h('span', 'n', key) : ''],
            cards,
            drop: { epic: key },
            ...(e ? { open: () => hands.open(key) } : {}),
          };
        });
    }
    if (filters.group === 'people') {
      const out = new Map<string, Card[]>();
      for (const card of shown) out.set(card.assignee?.id ?? NOBODY, [...(out.get(card.assignee?.id ?? NOBODY) ?? []), card]);
      const everyone = people();
      return [...out.entries()]
        .sort(([a], [b]) => (a === NOBODY ? 1 : b === NOBODY ? -1 : everyone.findIndex((p) => p.id === a) - everyone.findIndex((p) => p.id === b)))
        .map(([id, cards]) => {
          const who = everyone.find((one) => one.id === id);
          return { sign: [face(jira, who), who?.name ?? 'nobody'], cards, drop: { who: id } };
        });
    }
    const out = new Map<string, Card[]>();
    for (const card of shown) for (const label of card.labels.length ? card.labels : ['']) out.set(label, [...(out.get(label) ?? []), card]);
    return [...out.entries()]
      .sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b)))
      .map(([label, cards]) => ({ sign: [label || 'no labels'], cards }));
  };

  /* ⇧F writes it in JQL, the way Jira's own board does. */
  top.addEventListener('keydown', (event) => event.stopPropagation());
  const keys = (event: KeyboardEvent): void => {
    if (!body.isConnected) {
      document.removeEventListener('keydown', keys);
      return;
    }
    const typing = (event.target as HTMLElement).closest?.('input,textarea,[contenteditable]');
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'F' && event.shiftKey) {
      event.preventDefault();
      const btn = Array.from(top.querySelectorAll('.gold')).find((one) => one.textContent === 'filter') as HTMLElement | undefined;
      if (btn) jqlSlab(btn);
    }
  };
  document.addEventListener('keydown', keys);

  paintTop();
  paintBody();
  return {
    top,
    body,
    paint: () => {
      if (body.querySelector('.dragging') || writing) return;
      paintBody();
    },
  };
}
