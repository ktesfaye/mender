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
export type Posture = 'working' | 'wants-you' | 'done' | 'broken' | 'resting';

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
  /** Every session in the project, this one included, in rail order. */
  rail: Lantern[];
  /** What went into each version of this checkout, newest first. */
  versions?: Version[];
}

/** One version and what went into it. Null is what has not gone into one yet. */
export interface Version {
  version: string | null;
  lines: string[];
}

export interface Asking {
  said: string;
  /** Several things are asking at once: an answer marks its own pending
   *  question instead of sending, until the last one — "that's everything" —
   *  is pressed. */
  multi?: boolean;
  /** In the order the number keys answer them. */
  answers: { id: string; said: string; requestId?: string }[];
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

/** One session on the rail, which is all the rail needs to know about it. */
export interface Lantern {
  id: string;
  name: string;
  posture: Posture;
  /** What the lantern says under the name: what it is doing, or how long ago. */
  saying: string;
  /** Lit means awake. Dark is resting, still being cut, or broken. */
  lit: boolean;
  /** The one you are standing in hangs lowest and says so. */
  here: boolean;
  unread: boolean;
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
  /** How long since anything happened in here, when that is a long time. */
  cold?: string;
  /** Newest first. */
  notes: Note[];
  /** Oldest first, the live one last. */
  thoughts: Thought[];
  /** What it says it is going to do, when it has actually said. */
  plan: { said: string; state: 'done' | 'doing' | 'ahead' }[];
  /** Oldest first, the running one last. */
  steps: Step[];
  made: Made[];
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
}

/** A picture picked up off the wood and not yet handed over. */
export interface Carried {
  id: string;
  name: string;
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
  /** The oldest note is the standing one, and it reads differently. */
  standing?: boolean;
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
  /** Reasoning rather than an answer. */
  quiet?: boolean;
  /** The turn going wrong rather than an answer: `wrong` stopped it, `warn` cut it short. */
  trouble?: 'wrong' | 'warn' | 'aside';
}

/** Something it did: a tool call, with a prop from the kit standing for it. */
export interface Step {
  id: string;
  did: string;
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
  what: string;
  when: string;
  /** The lines under it, which are the contents rather than a description. */
  lines: string[];
  /** Anything wrong with it, which is the only warm thing in that column. */
  warning?: string;
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
}
