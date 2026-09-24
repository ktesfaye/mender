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
  /** The session you are standing in. Absent on a project nobody has worked. */
  session?: Session;
  /** Every session in the project, this one included, in rail order. */
  rail: Lantern[];
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

export interface Session {
  id: string;
  name: string;
  branch: string;
  agent: string;
  model?: string;
  /** How much room it has left to think in, nought to one. */
  room?: number;
  /** What it answers for itself, which the header says in plain words. */
  permissions?: string;
  /** Newest first. */
  notes: Note[];
  /** Oldest first, the live one last. */
  thoughts: Thought[];
  /** Oldest first, the running one last. */
  steps: Step[];
  made: Made[];
  agents: Hand[];
  /** How many notes are further down the post than the board can show. */
  olderNotes?: number;
  /** And how many steps came before the ones shown, and over how long. */
  olderSteps?: { many: number; over: string };
  /** And how many thoughts sit between the posted plan and the ones shown. */
  olderThoughts?: number;
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
