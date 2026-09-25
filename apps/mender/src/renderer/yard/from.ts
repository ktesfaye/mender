/**
 * Turning what the wire says into a yard.
 *
 * Everything on the other side of this file is emdash's back end talking about
 * sessions and turns and tool calls, and everything on this side is a place
 * with people standing in it. This is where one becomes the other, and it is
 * the only place that knows both vocabularies.
 *
 * Nothing here asks for anything. It is handed whatever the live models last
 * said and returns a value.
 */

import type { Ask, Kit, Mood, Told } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { KIT_NAMES } from './sprite';
import type {
  Fire,
  Hand,
  Health,
  Lantern,
  Note,
  Posture,
  Session,
  Step,
  Thought,
  Yard,
} from './what';

/**
 * Which prop from the kit stands in for which kind of tool.
 *
 * Not decoration. The step list is read down the side of the board at a glance
 * and the shape in the margin is what you are actually reading: a crate for
 * something new put down, an anvil for something worked on, a signpost for
 * something read, a tub over the fire for something set running. The designs
 * settled the first four and the rest follow the same idea. Nothing in the
 * margin is taller than that crate, which is what sets the height of a line.
 */
const PROPS: Record<string, string> = {
  'read-tool-call': KIT_NAMES.sign,
  'search-tool-call': KIT_NAMES.roadSign,
  'create-file-tool-call': KIT_NAMES.crate,
  'modify-file-tool-call': KIT_NAMES.anvil,
  'delete-file-tool-call': KIT_NAMES.barrel,
  'execute-tool-call': KIT_NAMES.pot,
  'web-fetch-tool-call': KIT_NAMES.roadSign,
  'mcp-tool-call': KIT_NAMES.bucket,
  'create-plan-tool-call': KIT_NAMES.rack,
  'tool-group': KIT_NAMES.table,
};

const PROP = KIT_NAMES.barrel;

/**
 * What a mood is, said the way the yard says it.
 *
 * Six moods become five postures. `arriving` is somebody walking up the path
 * and it reads as working, because from where you are standing the difference
 * between about to start and started is nothing you can act on.
 */
export function postureOf(mood: Mood | undefined): Posture {
  switch (mood) {
    case 'working':
      return 'working';
    case 'asking':
      return 'wants-you';
    case 'hurt':
      return 'broken';
    case 'arriving':
      return 'working';
    default:
      return 'resting';
  }
}

export interface Standing {
  project: Project;
  /** What everybody is doing, which is how the fire knows how to burn. */
  mood?: Mood;
  /** Every session in the project, and what each of them is doing. */
  tasks: Task[];
  moods: Record<string, Mood>;
  /** The one you are standing in, if you are standing in one. */
  here?: Task;
  /** What that session has been up to, when it has been asked. */
  told?: Told;
  kit?: Kit;
  /** Where the checkout stands, as one phrase. */
  on?: string;
  /** Whether the checkout is where it said it was, and is still a repository. */
  health?: Health;
  /** A question standing at the gate, which outranks everything else. */
  asking?: Ask | null;
  /** What it has said it means to do, if it has said. */
  plan?: readonly { text: string; state: 'done' | 'doing' | 'ahead' }[];
  /** How much room it has left to think in, when it says. */
  room?: number;
  /** What was said while it was busy and has not been heard yet. */
  waiting?: readonly { id: string; text: string }[];
  /** What is in your hands. */
  carrying?: readonly { id: string; name: string }[];
}

/** The turn the newest note opened, which is the one being answered now. */
function turnOf(told: Told | undefined): number | undefined {
  return told?.notes[0]?.turn;
}

/** Everything the yard needs, from everything the wire last said. */
export function yardOf(from: Standing): Yard {
  const { project, tasks, moods, here, told, kit } = from;
  return {
    project: {
      id: project.id,
      name: project.name,
      where: project.path,
      on: from.on ?? project.path,
      health: from.health ?? 'ok',
      costs: costOf(tasks.length),
      going: told?.began ? longFor(Date.now() - told.began) : undefined,
      turns: told?.turns,
      spawned: told?.errands.length,
    },
    ...(from.asking
      ? {
          asking: {
            said: from.asking.text,
            answers: from.asking.options.map((one) => ({ id: one.optionId, said: one.name })),
          },
        }
      : {}),
    ...(here ? { session: sessionOf(here, told, kit, from) } : {}),
    rail: tasks.map((task) => lanternOf(task, moods[task.id], task.id === here?.id)),
  };
}

function sessionOf(
  task: Task,
  told: Told | undefined,
  kit: Kit | undefined,
  from: Standing
): Session {
  const notes = (told?.notes ?? []).map(noteOf);
  const thoughts = thoughtsOf(told);
  const live = liveOf(from, told);
  return {
    id: task.id,
    name: task.title,
    branch: task.branch,
    agent: kit?.hands.find((one) => one.id === kit.hand)?.name ?? task.agent ?? 'nobody',
    ...(kit?.model ? { model: kit.models.find((one) => one.id === kit.model)?.name } : {}),
    ...(kit?.mode
      ? { permissions: kit.modes.find((one) => one.id === kit.mode)?.name?.toLowerCase() }
      : {}),
    fire: fireOf(from.mood, Boolean(from.asking)),
    ...(live ? { live } : {}),
    ...(from.room === undefined ? {} : { room: from.room }),
    ...(coldFor(told) ? { cold: coldFor(told) } : {}),
    notes: notes.slice(0, 3),
    ...(notes.length > 3 ? { olderNotes: notes.length - 3 } : {}),
    thoughts,
    plan: (from.plan ?? []).map((one) => ({ said: one.text, state: one.state })),
    steps: (told?.deeds ?? []).map(stepOf),
    made: madeOf(told),
    agents: (told?.errands ?? []).map(handOf),
    waiting: (from.waiting ?? []).map((one) => ({ id: one.id, said: one.text })),
    carrying: (from.carrying ?? []).map((one) => ({ id: one.id, name: one.name })),
  };
}

function noteOf(
  note: { id: string; said: string; at: number; answered: boolean },
  at: number
): Note {
  return {
    id: note.id,
    said: note.said,
    when: note.at ? agoOf(Date.now() - note.at) : 'before this',
    answered: note.answered,
    /* The oldest note on the post is the standing one: the thing that was true
       at the start and has not been taken down since. */
    ...(at > 1 ? { standing: true } : {}),
  };
}

/**
 * What is rising off the fire, oldest first with the live one last.
 *
 * **Nothing here says when it was said unless it actually knows.** The protocol
 * carries no clock on a message, and an agent picking up where it left off
 * sends its whole transcript back the moment you walk in, so the only time the
 * village could put on any of it is the time it happened to notice, which for
 * a week-old conversation is a lie. Reasoning carries its own clock and the
 * live one is happening in front of you; everything else is placed by where it
 * is in the column and by how bright it is, which is what recency is made of
 * here anyway.
 *
 * The plan it posted is a different thing and lives above this: the first thing
 * an agent says is not a plan, however much it reads like one.
 */
function thoughtsOf(told: Told | undefined): Thought[] {
  const all = told?.thoughts ?? [];
  const now = turnOf(told);
  /* An answer to something you said before the newest note is not what is
     happening now, however recently it was said: once you have said the next
     thing, the last reply is history and the live edge is whatever comes back
     to this one. */
  const earlier = (turn: number | undefined): boolean =>
    now !== undefined && turn !== undefined && turn < now;
  return all.map((one, at) => ({
    id: one.id,
    said: one.said,
    /* A time only where there is one. The protocol carries no clock on a
       message, and an agent picking up where it left off sends its whole
       transcript back the moment you walk in, so the only time the village
       could put on any of it is the time it happened to notice, which for a
       week-old conversation is a lie. Reasoning carries its own clock. The
       rest is placed by where it is in the column and how bright it is, which
       is what recency is made of here anyway. */
    when: one.quiet && one.at ? agoOf(Date.now() - one.at) : '',
    ...(one.since ? { live: true, at: longFor(Date.now() - one.since) } : {}),
    ...(at === all.length - 1 && !one.since && !earlier(one.turn) ? { live: true } : {}),
    ...(earlier(one.turn) ? { earlier: true } : {}),
    ...(one.quiet ? { quiet: true } : {}),
    ...(one.trouble ? { trouble: one.trouble } : {}),
  }));
}

/**
 * What it is doing this second, while it is doing anything.
 *
 * Nothing on the yard said so. The fire burned in a patch of ground that only
 * shows when somebody has been sent out, and the last answer stayed set large
 * as "now" long after you had asked the next thing, so the screen looked the
 * same whether the agent was hard at work or had never heard you.
 */
function liveOf(from: Standing, told: Told | undefined): Session['live'] {
  if (from.asking) return undefined;
  if (from.mood !== 'working' && from.mood !== 'arriving') return undefined;
  const turn = turnOf(told);
  const newest = told?.notes[0];
  const running = [...(told?.deeds ?? [])].reverse().find((one) => one.running);
  const thoughts = told?.thoughts ?? [];
  const last = thoughts.at(-1);
  const answering = Boolean(
    last && !last.quiet && (turn === undefined || last.turn === undefined || last.turn >= turn)
  );
  const reasoning = thoughts.some((one) => one.since);
  const doing =
    from.mood === 'arriving'
      ? 'waking up'
      : running
        ? doingOf(running)
        : reasoning
          ? 'thinking'
          : answering
            ? 'writing back'
            : 'thinking';
  return {
    doing,
    /* Counted from when you said it, when the village saw you say it. A note
       read back off the disk has no such moment, and then the count starts
       from when the yard first noticed the work. */
    ...(newest?.at && Date.now() - newest.at < 1000 * 60 * 60 ? { since: newest.at } : {}),
    answering,
  };
}

/** A step it is in the middle of, said in the present tense. */
function doingOf(deed: { did: string; why?: string; tool: string }): string {
  if (deed.why) return deed.why;
  const rest = (word: string): string => deed.did.replace(new RegExp(`^${word}\\s+`), '');
  switch (deed.tool) {
    case 'execute-tool-call':
      /* Before the command itself comes through, all a shell call is called
         is the name of the tool. */
      return /^terminal$/i.test(deed.did) ? 'running a command' : `running ${deed.did}`;
    case 'read-tool-call':
    case 'web-fetch-tool-call':
      return `reading ${rest('read')}`;
    case 'create-file-tool-call':
      return `writing ${rest('wrote')}`;
    case 'modify-file-tool-call':
      return `changing ${rest('changed')}`;
    case 'delete-file-tool-call':
      return `removing ${rest('removed')}`;
    case 'search-tool-call':
      return `looking for ${rest('looked for')}`;
    case 'spawn-subagent-tool-call':
      return 'sending somebody out';
    case 'create-plan-tool-call':
      return 'making a plan';
    default:
      return deed.did;
  }
}

function stepOf(deed: {
  id: string;
  did: string;
  why?: string;
  note?: string;
  tool: string;
  running: boolean;
  wrong?: boolean;
  path?: string;
  diff?: string[];
  diffMore?: number;
}): Step {
  return {
    id: deed.id,
    did: deed.why ?? deed.did,
    prop: PROPS[deed.tool] ?? PROP,
    ...(deed.note ? { note: deed.note } : {}),
    ...(deed.running ? { running: true } : {}),
    ...(deed.wrong ? { tone: 'broken' as const } : {}),
    ...(deed.path ? { path: deed.path } : {}),
    ...(deed.diff ? { diff: deed.diff } : {}),
    ...(deed.diffMore ? { diffMore: deed.diffMore } : {}),
  };
}

/**
 * What the cart is carrying.
 *
 * For a coding agent, what it made is the files it wrote. The newest goes on
 * the board and the rest are the lines under it, which is the same shape the
 * designs use for a published page and its contents.
 */
function madeOf(told: Told | undefined): Session['made'] {
  const wrote = told?.wrote ?? [];
  const [newest, ...rest] = wrote;
  if (!newest) return [];
  return [
    {
      id: newest.path,
      what: shortOf(newest.path),
      when: newest.at ? `written ${agoOf(Date.now() - newest.at)}` : 'written before this',
      lines: rest.slice(0, 6).map((one) => `${shortOf(one.path)} · +${one.added} −${one.gone}`),
    },
  ];
}

/**
 * Whoever it sent out, and their colour.
 *
 * The tint is worked out from what they were sent to do rather than handed
 * down, so the same errand is the same colour every time you look, which is
 * the whole point of it: tint is identity, never status.
 */
function handOf(errand: { id: string; errand: string; running: boolean; since?: number }): Hand {
  return {
    id: errand.id,
    errand: shortOf(errand.errand),
    where: errand.running ? 'out' : 'in-light',
    ...(errand.since ? { gone: agoOf(Date.now() - errand.since) } : {}),
    tint: TINTS[hashOf(errand.errand) % TINTS.length] ?? TINTS[0]!,
  };
}

/**
 * What forgetting a project would cost, said before anything is offered.
 *
 * The village forgets it; the folder stays exactly where it is. What does go
 * is every session cut from it, because a project forgotten with its worktrees
 * still on disk leaves them somewhere nothing here can reach again.
 */
function costOf(many: number): string {
  if (!many) return 'the folder stays exactly where it is';
  const sessions = many === 1 ? 'the one session' : `all ${many} sessions`;
  return `${sessions} in here go, the folder stays`;
}

/**
 * How the fire burns, from what the one person in here is doing.
 *
 * A question at the gate banks it: they have stopped working and are standing
 * there, and a fire nobody is tending settles. Finished is embers, still warm
 * and not going anywhere. Nothing at all is out.
 */
function fireOf(mood: Mood | undefined, asking: boolean): Fire {
  if (asking || mood === 'asking') return 'banked';
  if (mood === 'working' || mood === 'arriving') return 'lit';
  if (mood === 'hurt') return 'out';
  if (mood === 'resting') return 'embers';
  return 'out';
}

/**
 * How long since anything happened in here, but only when that is long enough
 * to be worth saying. Age is carried by the light, not by a date.
 */
function coldFor(told: Told | undefined): string | undefined {
  const last = [...(told?.thoughts ?? []), ...(told?.notes ?? [])]
    .map((one) => one.at)
    .filter(Boolean);
  if (!last.length) return undefined;
  const since = Date.now() - Math.max(...last);
  return since > 1000 * 60 * 60 * 36 ? agoOf(since) : undefined;
}

/** Out of the kit's own palette, so nobody ever stands in a colour from elsewhere. */
const TINTS = ['#c6a740', '#9ca44f', '#d18b2c', '#7a7565', '#a46039', '#6d848a'];

function hashOf(text: string): number {
  let at = 0;
  for (const letter of text) at = (at * 31 + letter.charCodeAt(0)) >>> 0;
  return at;
}

function lanternOf(task: Task, mood: Mood | undefined, here: boolean): Lantern {
  const posture = postureOf(mood);
  /* Lit means somebody is awake in there. Nobody has moved in, they have gone
     home, or it broke, and the lantern is out. A dark, otherwise-resting
     lantern is not the same as a lit one waiting on you to speak — the
     process itself is gone, not just idle — so it says so rather than
     reusing the same "resting" a session still running says. */
  const lit = mood !== undefined && mood !== 'empty' && mood !== 'hurt';
  return {
    id: task.id,
    name: task.title,
    posture,
    saying: here ? 'you are here' : !lit && posture === 'resting' ? 'asleep' : sayingOf(posture, task),
    lit,
    here,
    unread: false,
    ground: 'ready',
  };
}

function sayingOf(posture: Posture, task: Task): string {
  switch (posture) {
    case 'wants-you':
      return 'wants you';
    case 'working':
      return 'working';
    case 'broken':
      return 'it broke';
    default: {
      /* The `mender/` in front of every branch the village cuts says nothing
         a lantern needs to say, and a branch that is only the name again says
         nothing at all. */
      const branch = shortOf(task.branch);
      return branch === slugOf(task.title) ? 'resting' : branch;
    }
  }
}

/** A name the way a branch is cut from it. */
function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The last thing in a path, which is the only part worth the room. */
function shortOf(path: string): string {
  const cut = path.replace(/\/+$/, '').split('/').at(-1);
  return cut && cut.length ? cut : path;
}

/**
 * How long ago, in the words the board uses.
 *
 * Never a date. A date is filing; what you want to know standing in front of a
 * session is whether this happened while you were looking away or last week.
 */
export function agoOf(ms: number): string {
  const minutes = Math.max(0, ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  const weeks = days / 7;
  if (weeks < 9) return `${Math.floor(weeks)}w ago`;
  const months = days / 30.4;
  return months < 12 ? `${Math.floor(months)}mo ago` : `${Math.floor(days / 365)}y ago`;
}

/** How long something has been going, which reads differently from how long ago. */
export function longFor(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ${Math.floor(seconds % 60)}s`;
  const hours = minutes / 60;
  if (hours < 100) return `${Math.floor(hours)}h ${Math.floor(minutes % 60)}m`;
  return `${Math.floor(hours / 24)}d`;
}
