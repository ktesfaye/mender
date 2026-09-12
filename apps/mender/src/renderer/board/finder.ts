import type { Mood } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import type { Row } from './board';

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
interface Doing {
  /** The same vocabulary a pressed row speaks, so one place answers both. */
  pick: string;
  name: string;
  about: string;
  /** The key it answers to, held with command. */
  chord?: string;
  /** Nothing is offered where it would not work. */
  where: Standing[];
}

const DOINGS: Doing[] = [
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
    pick: 'do:found',
    name: 'found a project',
    about: 'put a checkout on the island',
    chord: 'n',
    where: ['island', 'district', 'session', 'card'],
  },
  {
    pick: 'do:out',
    name: 'back out to the island',
    about: 'let go of what is open',
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
];

/** The finder itself, which is one of the doings and opens the rest. */
export const FIND = 'do:find';
const FIND_CHORD = 'k';

/**
 * What a chord means, or nothing.
 *
 * One table, read in one place. Every chord is command (or control) plus one
 * key, because a village with two-key chords in it is a village pretending to
 * be an editor.
 */
export function chordFor(key: string, where: Standing, projects: number): string | null {
  const pressed = key.toLowerCase();
  if (pressed === FIND_CHORD) return FIND;
  // Command and a number is the nth village along the rail, which is the
  // order they are nailed up in.
  const digit = /^[1-9]$/.test(pressed) ? Number(pressed) : 0;
  if (digit) return digit <= projects ? `rail:${digit - 1}` : null;
  const doing = DOINGS.find((each) => each.chord === pressed);
  return doing && doing.where.includes(where) ? doing.pick : null;
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
export function finding(written: string, village: Village): Row[] {
  const looked = written.trim().toLowerCase();
  const rows: Row[] = [
    { kind: 'title', text: 'what are you after' },
    { kind: 'gap' },
    { kind: 'typed', text: written },
    { kind: 'gap' },
  ];

  const found: Row[] = [];
  const named = (name: string): boolean => !looked || name.toLowerCase().includes(looked);

  for (const task of village.tasks) {
    const project = village.projects.find((each) => each.id === task.project);
    if (!named(task.title) && !named(project?.name ?? '')) continue;
    found.push({
      kind: 'entry',
      mark: markOf(village.moods[task.id]),
      text: project ? `${task.title} · ${project.name}` : task.title,
      pick: `task:${task.id}`,
    });
  }
  for (const project of village.projects) {
    if (!named(project.name)) continue;
    found.push({
      kind: 'entry',
      mark: '#',
      text: project.name,
      tone: 'faded',
      pick: `project:${project.id}`,
    });
  }
  const doings: Row[] = [];
  for (const doing of DOINGS) {
    if (!doing.where.includes(village.where)) continue;
    if (!named(doing.name) && !named(doing.about)) continue;
    doings.push({
      kind: 'entry',
      mark: doing.chord ?? ' ',
      text: `${doing.name} · ${doing.about}`,
      tone: 'faded',
      pick: doing.pick,
    });
  }

  if (!found.length && !doings.length) {
    rows.push({ kind: 'line', text: 'nothing by that name.', tone: 'faded' });
    return rows;
  }
  rows.push(...found.slice(0, SHOWN));
  if (found.length > SHOWN) {
    rows.push({ kind: 'line', text: `and ${found.length - SHOWN} more.`, tone: 'faded' });
  }
  if (doings.length) {
    // The letter in the margin is the key it answers to, held with command,
    // so the way to stop needing this board is written on the board.
    rows.push({ kind: 'gap' }, { kind: 'heading', text: 'held with command' }, ...doings);
  }
  return rows;
}

function markOf(mood: Mood | undefined): string {
  if (mood === 'working') return '…';
  if (mood === 'asking') return '?';
  if (mood === 'hurt') return '✗';
  return '·';
}
