import type { Mood } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { card, chip, cursor, dom, h, head, label, pressable, sign } from '../glass/read';
import type { Row } from './row';

/**
 * Everything you can reach without looking for it.
 *
 * The island is the index, and that is the right answer when you can see the
 * thing you want. It is the wrong answer when you cannot: eleven sessions
 * across four projects is a lot of water to cross to reach the one you were
 * just in. So there is one more way in, and it is the same wood as everything
 * else — a board with every project, every session and everything the village
 * can do written on it, narrowing as you type.
 *
 * Nothing here floats over the village and nothing here is a search field. It
 * is a board, you walk it with the arrows, and return goes where you are
 * standing.
 */

/** Where you are, which decides what there is to do. */
export type Standing = 'island' | 'district' | 'session' | 'card';

/** One of the village's own doings, as opposed to a place you can go. */
export interface Doing {
  /** The same vocabulary a pressed row speaks, so one place answers both. */
  pick: string;
  name: string;
  about: string;
  /** The key it answers to, held with command. */
  chord?: string;
  /** Nothing is offered where it would not work. */
  where: Standing[];
}

export const DOINGS: Doing[] = [
  {
    pick: 'new',
    name: 'start a session',
    about: 'cut a worktree and put somebody in it',
    chord: 't',
    where: ['district', 'session', 'card'],
  },
  {
    pick: 'do:rename',
    name: 'call this session something else',
    about: 'your name for it outranks the agent',
    chord: 'r',
    where: ['session', 'card'],
  },
  {
    pick: 'card',
    name: 'what this session works with',
    about: 'who is in there, what it thinks with, what it can reach',
    chord: 'i',
    where: ['session', 'card'],
  },
  {
    pick: 'hunt',
    name: 'find a file',
    about: 'by name or by what is written in it',
    chord: 'f',
    where: ['district', 'session'],
  },
  {
    pick: 'do:watch',
    name: 'watch it build',
    about: 'the page this session is building, running, with every look it took',
    chord: 'l',
    where: ['session'],
  },
  {
    pick: 'do:reopen',
    name: 'reopen what you closed',
    about: 'the last file or folder you stepped out of',
    chord: 'o',
    where: ['district', 'session'],
  },
  {
    pick: 'do:revive',
    name: 'bring back a closed session',
    about: 'the last one taken down here, then the one before, conversation and all',
    chord: 'T',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:attend',
    name: 'go to whoever wants you',
    about: 'asking or hurt outrank merely working, oldest first, island-wide',
    chord: 'u',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:workspace',
    name: 'start a new session',
    about: 'in its own workspace, from a past session, or in a terminal',
    chord: 'n',
    where: ['district', 'session', 'card'],
  },
  {
    pick: 'do:found',
    name: 'found a project',
    about: 'put a checkout on the island',
    chord: 'n',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:out',
    name: 'close',
    about: 'take this session off the rail, and leave the project once none are left',
    chord: 'w',
    where: ['district', 'session', 'card'],
  },
  {
    pick: 'do:back',
    name: 'back',
    about: 'where you were before this',
    chord: '[',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:forward',
    name: 'forward',
    about: 'where you were before you went back',
    chord: ']',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:project-back',
    name: 'the project before',
    about: 'the last project you were in, in whichever session you left it',
    chord: '<',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:project-forward',
    name: 'the project after',
    about: 'the project you were in before you went back',
    chord: '>',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:windmill',
    name: 'settings',
    about: 'the app itself, not any one project',
    chord: ',',
    where: ['island', 'district', 'session', 'card'],
  },
];

/** The finder itself, which is one of the doings and opens the rest. */
export const FIND = 'do:find';
export const FIND_CHORD = 'k';

/** Every doing a chord can mean, the finder's own search included — one
    table, so the windmill's rebinding page and the finder itself read the
    same list rather than two that could drift apart. */
export function rebindableDoings(): Doing[] {
  return [
    {
      pick: FIND,
      name: 'find anything',
      about: 'every project, every session, everything the village can do',
      chord: FIND_CHORD,
      where: ['island', 'district', 'session', 'card'],
    },
    ...DOINGS,
  ];
}

/** A chord already spoken for, keyed by pick — what a session remembers
    having rebound. Absent means the table's own default still holds. */
export type Keybindings = Readonly<Record<string, string>>;

/** The chord a doing actually answers to right now: what was rebound, or the
    table's own default. */
export function chordOf(pick: string, bound: Keybindings): string | undefined {
  return bound[pick] ?? rebindableDoings().find((each) => each.pick === pick)?.chord;
}

/**
 * What a chord means, or nothing.
 *
 * One table, read in one place. Every chord is command (or control) plus one
 * key, because a village with two-key chords in it is a village pretending to
 * be an editor. `bound` is whatever this session has rebound; nothing in it
 * mean every chord is still the table's own default.
 */
export function chordFor(
  key: string,
  where: Standing,
  hanging: number,
  bound: Keybindings = {}
): string | null {
  /* A capital is the letter held with shift as well, a chord of its own. */
  const pressed = /^[A-Z]$/.test(key) ? key : key.toLowerCase();
  /* Command and a number is the nth thing along the rail, in the order it
     hangs there: a session when you are in a project, and a project when you
     are out on the island with nothing else hanging. Not itself rebindable —
     there are nine of them and only nine digits. */
  const digit = /^[1-9]$/.test(pressed) ? Number(pressed) : 0;
  if (digit) return digit <= hanging ? `rail:${digit - 1}` : null;
  /* Two doings can share a key where they are never both on offer: out on
     the island command-N founds a project, and inside one it cuts another
     workspace of it. */
  const doing = rebindableDoings().find(
    (each) => chordOf(each.pick, bound) === pressed && each.where.includes(where)
  );
  if (!doing && pressed !== pressed.toLowerCase()) {
    return chordFor(pressed.toLowerCase(), where, hanging, bound);
  }
  return doing ? doing.pick : null;
}

/** How a chord is written for him: shift said as the Mac says it. */
export function chordLabel(chord: string): string {
  return /^[A-Z]$/.test(chord) ? `⇧⌘${chord}` : `⌘${chord.toUpperCase()}`;
}

interface Village {
  projects: Project[];
  tasks: Task[];
  moods: Record<string, Mood>;
  where: Standing;
}

/** As many as the wood shows before it starts saying how many more there are. */
const SHOWN = 12;

/**
 * The finder, written out for whatever has been typed into it.
 *
 * Sessions come before projects because a session is what you are usually
 * looking for, and the village's own doings come last because you know where
 * those are — they are on this list to be discovered once, and to say what
 * their key is, not to be hunted for every time.
 */
export function finding(written: string, village: Village, bound: Keybindings = {}): Row[] {
  const looked = written.trim().toLowerCase();
  const wanting = village.tasks.filter((task) => {
    const mood = village.moods[task.id];
    return mood === 'asking' || mood === 'hurt';
  }).length;
  const rows: Row[] = [
    dom(
      head({
        title: 'what are you after',
        right: wanting ? [chip(`${wanting} wants you`, '#ff9a4a')] : [],
      })
    ),
  ];
  const field = h('div', 'gr-input');
  field.style.marginTop = '22px';
  const said = h('span', written ? '' : 'ph', written || 'a name, a session, a doing');
  said.appendChild(cursor());
  /* What Return will open, finished off in the field the way Spotlight does:
     the rest of the project's name, lit, after what was typed. */
  const top = looked
    ? village.projects.find((project) => project.name.toLowerCase().startsWith(looked))
    : undefined;
  if (top && top.name.length > looked.length) {
    const rest = h('span', '', top.name.slice(written.trim().length));
    rest.style.cssText = 'background:rgba(242,198,109,.28);border-radius:3px;color:#f6ecdb';
    said.appendChild(rest);
  }
  field.append(sign('find', '#f2c66d', 17), said);
  rows.push(dom(field));

  const named = (name: string): boolean => !looked || name.toLowerCase().includes(looked);
  const places: HTMLElement[] = [];
  /* A name that starts with what was typed outranks one that merely
     contains it, so the project you meant is the one under the keyboard. */
  const starts = (name: string): boolean => !!looked && name.toLowerCase().startsWith(looked);
  const projectsInOrder = village.projects
    .filter((project) => named(project.name))
    .sort((a, b) => Number(starts(b.name)) - Number(starts(a.name)));
  for (const project of projectsInOrder) {
    const el = h('div', 'gr-r');
    const ic = h('span', 'gr-ic2');
    ic.appendChild(sign('house', '#f2c66d', 16));
    const t = h('div');
    t.append(h('div', 'nm', project.name), h('div', 'ds', 'the project, its yard'));
    el.append(ic, t);
    places.push(pressable(el, `project:${project.id}`));
  }
  for (const task of village.tasks) {
    const project = village.projects.find((each) => each.id === task.project);
    if (!named(task.title) && !named(project?.name ?? '')) continue;
    const mood = village.moods[task.id];
    const el = h('div', 'gr-r');
    const ic = h('span', 'gr-ic2');
    ic.appendChild(sign('flame', moodColour(mood), 16));
    const t = h('div');
    t.append(h('div', 'nm', task.title), h('div', 'ds', [moodSaid(mood), project?.name].filter(Boolean).join(' · ')));
    el.append(ic, t);
    if (mood === 'asking' || mood === 'hurt') {
      const flag = chip(mood === 'hurt' ? 'broken' : 'wants you');
      flag.style.cssText = 'margin-left:auto;color:#ffc08a';
      el.appendChild(flag);
    }
    places.push(pressable(el, `task:${task.id}`));
  }
  const doings: HTMLElement[] = [];
  for (const doing of DOINGS) {
    if (!doing.where.includes(village.where)) continue;
    if (!named(doing.name) && !named(doing.about)) continue;
    const el = h('div', 'gr-r');
    const ic = h('span', 'gr-ic2');
    ic.appendChild(sign(DOING_SIGN[doing.pick] ?? 'spark', '#f2c66d', 16));
    const t = h('div');
    t.append(h('div', 'nm', doing.name), h('div', 'ds', doing.about));
    el.append(ic, t);
    const chord = chordOf(doing.pick, bound);
    if (chord) {
      const keys = h('span', 'k');
      const caps = /^[A-Z]$/.test(chord) ? ['⌘', '⇧', chord] : ['⌘', chord.toUpperCase()];
      for (const cap of caps) keys.appendChild(h('b', 'g-kc', cap));
      el.appendChild(keys);
    }
    doings.push(pressable(el, doing.pick));
  }

  if (!places.length && !doings.length) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: 'nothing by that name.', tone: 'faded' });
    return rows;
  }
  const cols = h('div', 'gr-fcols');
  if (!places.length || !doings.length) cols.style.gridTemplateColumns = '1fr';
  if (places.length) {
    const col = h('div');
    col.appendChild(label('stand somewhere'));
    const list = card('gr-list');
    list.append(...places.slice(0, SHOWN));
    col.appendChild(list);
    if (places.length > SHOWN) col.appendChild(h('div', 'gr-more2', `and ${places.length - SHOWN} more`));
    cols.appendChild(col);
  }
  if (doings.length) {
    const col = h('div');
    col.appendChild(label('held with command'));
    const list = card('gr-list');
    list.append(...doings);
    col.appendChild(list);
    cols.appendChild(col);
  }
  rows.push(dom(cols));
  return rows;
}

const DOING_SIGN: Record<string, string> = {
  new: 'plus',
  'do:rename': 'pen',
  card: 'gem',
  hunt: 'find',
  'do:watch': 'eye',
  'do:revive': 'undo',
  'do:attend': 'jump',
  'do:workspace': 'plus',
  'do:found': 'flag',
  'do:out': 'cross',
  'do:back': 'left',
  'do:forward': 'right',
  'do:windmill': 'sun',
  'do:reopen': 'folder',
};

function moodColour(mood: Mood | undefined): string {
  if (mood === 'working') return '#ff9a4a';
  if (mood === 'asking') return '#ffc08a';
  if (mood === 'hurt') return '#f08a72';
  return 'rgba(246,236,219,.42)';
}

function moodSaid(mood: Mood | undefined): string {
  if (mood === 'working') return 'working';
  if (mood === 'asking') return 'asking you something';
  if (mood === 'hurt') return 'broken';
  return '';
}
