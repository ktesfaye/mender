import type { Pack } from '@shared/agents';
import type { FiveHours } from '@shared/five-hours';
import type { Building } from './building';
/**
 * What a yard is, as a value.
 *
 * Opening a project does not put you in front of a list of its sessions any
 * more. It puts you in the yard of the one you were last in: your notes nailed
 * to the gatepost on the left, what the agent is thinking rising off the fire
 * in the middle, what it has made loaded on the cart to the right, the agents
 * it sent out standing in or out of the firelight, and every other session in
 * the project hanging as a lantern on the rail along the bottom.
 *
 * So there is one shape here rather than two, and nothing in it knows how any
 * of that is drawn. Everything is already in the past tense and already
 * resolved: no promises, no live models, no wire. Whoever builds one of these
 * has done the asking.
 */

/** What somebody is doing, which is one of five things and is always said. */
export type Posture = 'working' | 'wants-you' | 'done' | 'waiting' | 'broken' | 'resting';

/** How the project itself is, which is mostly whether it is reachable. */
export type Health = 'ok' | 'host-unreachable' | 'path-moved' | 'not-git' | 'abandoned';

/** Whether a session has somewhere to stand yet. */
export type Ground = 'cutting' | 'ready' | 'missing' | 'locked';

export interface Yard {
  project: Project;
  /**
   * Somebody standing at the gate with a question.
   *
   * When this is set it is the only thing the middle of the board says, because
   * nothing else it was thinking matters until you answer. A number key does.
   */
  asking?: Asking;
  /** The session you are standing in. Absent on a project nobody has worked. */
  session?: Session;
  /** Every session in the workspace you are standing in, this one included,
      in rail order. */
  rail: Lantern[];
  /** The project's workspaces, its own folder first, once it has more than
      that one. Absent is the folder alone, and no signboards hang. */
  workspaces?: Signboard[];
  /** What went into each version of this checkout, newest first. */
  versions?: Version[];
  /** The subscription's five-hour window, said in one line over the board. */
  fiveHours?: FiveHours;
}

/** One version and what went into it. Null is what has not gone into one yet. */
export interface Version {
  version: string | null;
  lines: string[];
  /** How many more went in than are written out. */
  more: number;
}

export interface Asking {
  said: string;
  /** A form's own name for what this question is about. */
  header?: string;
  /** Which of a form's questions this is, when there are several. */
  step?: string;
  /** What else answers it: writing on the line. */
  aside?: string;
  /** Writing on the line answers it too. */
  writable?: boolean;
  /** What an empty return presses, when it presses anything. */
  submit?: string;
  /** Several things are asking at once: an answer marks its own pending
   *  question instead of sending, until the last one — "that's everything" —
   *  is pressed. */
  multi?: boolean;
  /** In the order the number keys answer them. */
  answers: {
    id: string;
    said: string;
    about?: string;
    requestId?: string;
    /** A line the board adds under the agent's own answers. */
    kind?: 'other' | 'submit' | 'talk';
  }[];
}

export interface Project {
  id: string;
  name: string;
  /** Where the checkout is, said the way somebody standing in it would say it. */
  where: string;
  /** The repository and branch this project sits on, as one phrase. */
  on: string;
  host?: string;
  health: Health;
  /** What forgetting it would cost, said before it is offered. */
  costs?: string;
  /** How long the project has been going, and how busy, as the header says it. */
  going?: string;
  turns?: number;
  spawned?: number;
}

/** One workspace hanging under the beam. */
export interface Signboard {
  /** Empty for the project's own folder. */
  id: string;
  name: string;
  /** The one you are standing in, painted gold. */
  here: boolean;
  /** What the light under it says about the sessions in there, the loudest
      of them: absent when nobody in there is doing anything worth a look. */
  light?: Exclude<Posture, 'resting'>;
  /** Waiting out a limit, how much of the wait is behind it, nought to one. */
  ember?: number;
  /** What it is checked out on, said when it is pointed at. */
  branch?: string;
  /** Who is in there and what each is up to, said when it is pointed at. */
  sessions?: readonly { id: string; name: string; posture: Posture; saying: string }[];
}

/** One session on the rail, which is all the rail needs to know about it. */
export interface Lantern {
  id: string;
  name: string;
  posture: Posture;
  /** What the lantern says under the name: what it is doing, or how long ago. */
  saying: string;
  /** Lit is somebody at it, asking, or done with something you have not seen.
      Dark is idle, waiting out a limit, broken, or still being set up. */
  lit: boolean;
  /** Waiting out a limit, how much of the wait is behind it, nought to one. */
  ember?: number;
  /** The one you are standing in hangs lowest and says so. */
  here: boolean;
  unread: boolean;
  /** It has answered something and nothing is going in there now: done,
      stopped or cut off, seen or not. */
  finished?: boolean;
  /** Thinking with Fable, the dearest model, so it is marked on sight. */
  dear?: boolean;
  ground: Ground;
}

/**
 * How the fire is burning, which is the one thing that says what a whole
 * session is doing without saying a word.
 *
 * Lit is somebody working. Banked is somebody who has stopped and is waiting
 * on you. Embers is finished. Out is nobody home, and a fire that has been out
 * a long time takes the rest of the world down with it.
 */
export type Fire = 'lit' | 'banked' | 'embers' | 'out';

export interface Session {
  id: string;
  name: string;
  branch: string;
  agent: string;
  model?: string;
  /** Thinking with Fable, the dearest model, so the board says so loudly. */
  dear?: boolean;
  /** How much room it has left to think in, nought to one. */
  room?: number;
  /** What it has cost so far, when the agent reports it. */
  cost?: { amount: number; currency: string };
  /** What it answers for itself, which the header says in plain words. */
  permissions?: string;
  /** What the session is doing, said by the fire rather than by a word. */
  fire: Fire;
  /** What it is doing this second, while it is doing anything at all. */
  live?: Live;
  /** Still being woken and reading back everything said in here, so there is
      nothing yet worth drawing but the fire. */
  waking?: boolean;
  /** Not woken but still being made, its worktree being cut, said by the
      fire in place of "waking up". */
  settingUp?: string;
  /** How long since anything happened in here, when that is a long time. */
  cold?: string;
  /** Newest first. */
  notes: Note[];
  /** Oldest first, the live one last. */
  thoughts: Thought[];
  /** Where the whole thing stands, under the newest answer, once it has finished. */
  recap?: string;
  /** What it says it is going to do, when it has actually said. */
  plan: { said: string; state: 'done' | 'doing' | 'ahead' }[];
  /** The session told as a story: what it is after, the pieces of work it
      has been through with what it did in each, and what was left hanging. */
  story?: Story;
  /** Oldest first, the running one last. */
  steps: Step[];
  made: Made[];
  /** A page it is building, and every look taken at it as it changed. */
  building?: Building;
  agents: Hand[];
  /** What you said while it was busy, in the order it will hear it. */
  waiting: Waiting[];
  /** What is in your hands, waiting by the line for you to say something. */
  carrying: Carried[];
  /** Notes pinned to a diff line, carried the same way, gone with what you
      next say. */
  pinnedNotes: PinnedNote[];
  /** How many notes are further down the post than the board can show. */
  olderNotes?: number;
  /** And how many steps came before the ones shown, and over how long. */
  olderSteps?: { many: number; over: string };
  /** And how many thoughts sit between the posted plan and the ones shown. */
  olderThoughts?: number;
  /**
   * A typed failure worth its own line under the fire — a limit, an overload,
   * a lost connection — with what there is to do about it.
   */
  failure?: FailureView;
}

export interface Story {
  /** What the whole session is after, once a small model has said. */
  goal?: string;
  /** Where it stands right now, in a word or two. */
  state?: { said: string; tone: 'going' | 'done' | 'stopped' | 'asking' | 'broken' };
  chapters: Chapter[];
  ends: string[];
}

/** One piece of work, from the note that began it to the next. */
export interface Chapter {
  id: string;
  title: string;
  how?: string;
  state: 'done' | 'partial' | 'dropped' | 'going';
  /** It began with him putting the agent right, and this is what he said. */
  pushback?: string;
  /** Everything it did in this piece of work, oldest first. */
  steps: Step[];
  /** For the piece it is on, how many of those steps came since the newest
      note, which is what "just now" is. */
  latest?: number;
}

export interface FailureView {
  /** What the fire says, already in the village's voice. */
  doing: string;
  /** Whether an immediate try-again is worth offering. */
  canRetry: boolean;
  /** Whether a reset time is known, so "carry on when it lifts" can be offered. */
  canCarryOn: boolean;
  /** Set while a continue is scheduled — the target to count down to, and
   *  pressing the line again (or Escape) cancels it. */
  carryOnAt?: number;
  /** Which kind of wait, so it is drawn rather than said. */
  kind?: 'limit' | 'service' | 'connection';
  /** It goes again by itself once this machine is back online. */
  untilOnline?: boolean;
  /** When it was hit, and when it lifts, where those are known. */
  since?: number;
  resetAt?: number;
}

/** The live edge of a session that is working. */
export interface Live {
  /** In the present tense: thinking, reading this, running that. */
  doing: string;
  /** When it started on what you last said, for the count. */
  since?: number;
  /** Whether it has started saying anything back yet. */
  answering: boolean;
}

/** Something said while somebody was busy, still waiting its turn. */
export interface Waiting {
  id: string;
  said: string;
  /** Already handed into the running turn, so it can no longer be taken back. */
  handed?: boolean;
}

/** A picture picked up off the wood and not yet handed over. */
export interface Carried {
  id: string;
  name: string;
  /** Where the picture can be looked at while it waits. */
  preview?: string;
}

/** A note pinned to a diff line, not yet handed over. */
export interface PinnedNote {
  id: string;
  path: string;
  at: number;
  /** What it reads as, waiting by the line — `file:line`. */
  label: string;
  /** What was actually written, read back on the diff line it is pinned to. */
  note: string;
}

/** Something you said, nailed to the gatepost. */
export interface Note {
  id: string;
  said: string;
  /** How long ago, in the words the board uses. */
  when: string;
  answered: boolean;
  /** How many pictures went with it. The post says so; it never draws them. */
  pictures?: number;
  /** Where those pictures can still be read on this machine, for pointing at. */
  seen?: readonly string[];
  /** The oldest note is the standing one, and it reads differently. */
  standing?: boolean;
  /** The one it is working on right now. */
  on?: boolean;
}

/** Something it thought, which gets brighter and larger the newer it is. */
export interface Thought {
  id: string;
  said: string;
  when: string;
  /** The plan it posted at the start, which sits above everything and stays. */
  plan?: boolean;
  /** The one happening now, which grows downward while nothing above it moves. */
  live?: boolean;
  /** How long it has been at this one, said rather than spun. */
  at?: string;
  /** Said in answer to something before the newest note, so it is history. */
  earlier?: boolean;
  /** The last thing it said back to one of your notes, which stays out when
      the trail between them is folded away. */
  answer?: boolean;
  /** Told you on the way while its turn is still going, which stays out
      until the turn ends. */
  progress?: boolean;
  /** Reasoning rather than an answer. */
  quiet?: boolean;
  /** The turn going wrong rather than an answer: `wrong` stopped it, `warn` cut it short. */
  trouble?: 'wrong' | 'warn' | 'aside' | 'stopped' | 'closed';
  /** Over the newest answer, whether its turn is still going or how it came to rest. */
  ended?: 'going' | 'running' | 'done' | 'stopped' | 'closed' | 'cut';
  /** The conversation being packed down to make room, drawn rather than said. */
  pack?: Pack;
  /** Where it falls in the conversation, beside what it did. */
  seq?: number;
}

/** Something it did: a tool call, with a prop from the kit standing for it. */
/** What sort of thing a step was, which is the sign it is drawn with. */
export type StepKind =
  | 'look'
  | 'read'
  | 'write'
  | 'edit'
  | 'delete'
  | 'run'
  | 'test'
  | 'build'
  | 'install'
  | 'commit'
  | 'push'
  | 'git'
  | 'send'
  | 'plan'
  | 'tool';

export interface Step {
  id: string;
  did: string;
  /** What sort of thing it was, for its sign. */
  kind?: StepKind;
  /** Where it falls in the conversation, beside what it said. */
  seq?: number;
  /** Which sprite sits in the fixed slot at the left of the line. */
  prop: string;
  running?: boolean;
  /** What it cost or changed, written cool after the thing it did. */
  note?: string;
  tone?: Posture;
  /** The file this step touched, so pressing it can open the change itself. */
  path?: string;
  /** A few marked lines of what changed, read right under the step. */
  diff?: string[];
  /** How many more marked lines there were than `diff` carries. */
  diffMore?: number;
  /** A run of looking around, folded into this one quiet line; what each of
      them actually was, for when it is opened. */
  group?: { id: string; did: string }[];
}

/** Something it produced, which is what the cart is carrying. */
export interface Made {
  id: string;
  /** A page it published, a file it wrote to be read, or a thing it built. */
  kind: 'page' | 'file' | 'build';
  what: string;
  /** How it came to be and how long ago, in one breath. */
  when: string;
  /** What pressing it does, as a pick on the board. */
  pick: string;
  /** Where it is on this machine, when it is a picture: pointed at it shows, pressed it is held up. */
  picture?: string;
}

/** Somebody it sent out, standing in the yard where their state puts them. */
export interface Hand {
  id: string;
  /** What it was sent to do. Only the ones that need you are named on screen. */
  errand: string;
  /** In the light is back with an answer; out in the dark is still running. */
  where: 'in-light' | 'out';
  /** How long they have been gone, which is how far out they stand. */
  gone?: string;
  /** Their colour for the life of the session. Identity, never status. */
  tint: string;
  /** The tool call that sent them, which calling them back names. */
  call?: string;
  /** Working on their own while the session carries on without them. */
  background?: boolean;
  /** Not somebody at all but a command left running, and the command itself. */
  command?: string;
  /** Came back hurt, or was called back. */
  wrong?: boolean;
  /** What they were sent to do, in full. */
  said: string;
  /** How many tokens they are working with, said short: `45k tokens`. */
  tokens?: string;
  /** The same count, as a number, for the bar that compares them. */
  tokenCount?: number;
  /** When they went, which a running clock counts up from. */
  since?: number;
  /** How long one that is back was out, in milliseconds. */
  ran?: number;
  /** Everything they have done out there, read the same way a session's is. */
  steps: Step[];
}
