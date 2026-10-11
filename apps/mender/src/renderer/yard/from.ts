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

import type { Ask, Deed, Errand, Failure, Glance, Kit, Mood, Pack, Told } from '@shared/agents';
import type { FiveHours } from '@shared/five-hours';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { answersFor } from '../board/work';
import { doingNow, lookedAround, plainCommand, plainRead, type Plain } from './deeds';
import { KIT_NAMES } from './sprite';
import type {
  Fire,
  Hand,
  Health,
  Lantern,
  Note,
  Posture,
  Session,
  Signboard,
  Step,
  StepKind,
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
  /** Checkouts (by path) with something noticed listening on a port. */
  servers?: ReadonlySet<string>;
  /** Sessions asked for whose worktree has no row yet, by that draft id. */
  cutting?: ReadonlySet<string>;
  /** What each lantern says beyond its mood, by session. */
  glances?: Readonly<Record<string, Glance>>;
  /** Sessions that finished something you have not been in to see, and when. */
  unread?: ReadonlyMap<string, number>;
  /** What it has said it means to do, if it has said. */
  plan?: readonly { text: string; state: 'done' | 'doing' | 'ahead' }[];
  /** How much room it has left to think in, when it says. */
  room?: number;
  /** What it has cost so far, when the agent reports it. */
  cost?: { amount: number; currency: string };
  /** What was said while it was busy and has not been heard yet. */
  waiting?: readonly { id: string; text: string }[];
  /** What is in your hands. */
  carrying?: readonly { id: string; name: string; preview?: string }[];
  /** Notes pinned to a diff line, not yet handed over. */
  pinnedNotes?: readonly {
    id: string;
    path: string;
    at: number;
    label: string;
    note: string;
  }[];
  /** A typed failure worth its own line, or absent when there isn't one. */
  failure?: Failure | null;
  /** When set, a continue is scheduled to send itself at this epoch ms. */
  carryOn?: number | null;
  /** The checkout's history by version, newest first. */
  versions?: readonly { version: string | null; lines: readonly string[] }[];
  /** The subscription's five-hour window, when it has been read. */
  fiveHours?: FiveHours;
  /** Whether the session is still being woken and reading its history back. */
  waking?: boolean;
  /** The project's workspaces, when it has any besides its own folder. */
  workspaces?: readonly Signboard[];
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
      costs: costOf(tasks.filter((task) => !from.cutting?.has(task.id)).length),
      going: told?.began ? longFor(Date.now() - told.began) : undefined,
      turns: told?.turns,
      spawned: told?.errands.length,
    },
    ...(from.asking
      ? {
          asking: {
            said: from.asking.text,
            ...(from.asking.header ? { header: from.asking.header } : {}),
            ...(from.asking.step ? { step: from.asking.step } : {}),
            ...(from.asking.aside ? { aside: from.asking.aside } : {}),
            ...(from.asking.writable ? { writable: true } : {}),
            ...(from.asking.submit ? { submit: from.asking.submit } : {}),
            multi: from.asking.multi,
            answers: answersFor(from.asking).map((one) => ({
              id: one.optionId,
              said: one.name,
              ...(one.about ? { about: one.about } : {}),
              ...(one.kind ? { kind: one.kind } : {}),
              requestId: one.requestId,
            })),
          },
        }
      : {}),
    ...(here ? { session: sessionOf(here, told, kit, from) } : {}),
    ...(from.fiveHours ? { fiveHours: from.fiveHours } : {}),
    ...(from.versions
      ? { versions: from.versions.map((one) => ({ version: one.version, lines: [...one.lines] })) }
      : {}),
    ...(from.workspaces?.length ? { workspaces: [...from.workspaces] } : {}),
    rail: tasks.map((task) =>
      lanternOf(task, moods[task.id], {
        here: task.id === here?.id,
        serving: from.servers?.has(task.path) ?? false,
        cutting: from.cutting?.has(task.id) ?? false,
        glance: from.glances?.[task.id],
        finished: from.unread?.get(task.id),
      })
    ),
  };
}

/**
 * What it is thinking with and how hard, the way a person would say it:
 * "Opus 4.7 · high". Claude's own first choice is called "Default
 * (recommended)", which says nothing, so it is named by what it actually
 * resolves to, which the agent puts in that choice's description.
 */
function modelOf(kit: Kit): string | undefined {
  const model = kit.models.find((one) => one.id === kit.model);
  if (!model) return undefined;
  let name = model.name;
  if (model.id === 'default' || /\bdefault\b/i.test(name)) {
    const about = model.about ?? '';
    const current = /currently\s+([^)·,]+)/i.exec(about)?.[1];
    const said = (current ?? about.split(' · ')[0] ?? '').trim();
    if (said) name = said;
  }
  name = name.replace(/\s*\(recommended\)\s*/i, '').trim();
  const effort = kit.efforts.find((one) => one.id === kit.effort);
  return effort && effort.id !== 'default' ? `${name} · ${effort.name.toLowerCase()}` : name;
}

function sessionOf(
  task: Task,
  told: Told | undefined,
  kit: Kit | undefined,
  from: Standing
): Session {
  /* What was handed into a turn already running is not on the post until the
     agent has read it: until then the note it is working on stays the newest,
     and what it has not read yet waits above the line with everything else
     still to come. Once it has stopped, there is no next pause to wait for,
     so anything it never read is simply unanswered on the post. */
  const going = from.mood === 'working' || from.mood === 'arriving';
  const unread = going ? (told?.notes ?? []).filter((one) => one.unread) : [];
  if (told && unread.length) told = { ...told, notes: told.notes.filter((one) => !one.unread) };
  const notes = (told?.notes ?? []).map(noteOf);
  if (going && !from.asking && notes[0]) notes[0].on = true;
  const thoughts = thoughtsOf(told, from.mood, Boolean(from.asking));
  const live = liveOf(from, told);
  return {
    id: task.id,
    name: task.title,
    branch: task.branch,
    agent: kit?.hands.find((one) => one.id === kit.hand)?.name ?? task.agent ?? 'nobody',
    ...(kit && modelOf(kit) ? { model: modelOf(kit) } : {}),
    ...(kit?.mode
      ? { permissions: kit.modes.find((one) => one.id === kit.mode)?.name?.toLowerCase() }
      : {}),
    fire: fireOf(from.mood, Boolean(from.asking)),
    ...(live ? { live } : {}),
    ...(from.waking ? { waking: true } : {}),
    ...(from.room === undefined ? {} : { room: from.room }),
    ...(from.cost === undefined ? {} : { cost: from.cost }),
    ...(coldFor(told) ? { cold: coldFor(told) } : {}),
    notes,
    thoughts,
    ...(recapOf(told, going) ? { recap: recapOf(told, going) } : {}),
    plan: (from.plan ?? []).map((one) => ({ said: one.text, state: one.state })),
    steps: stepsOf(told?.deeds ?? []),
    made: madeOf(told),
    agents: [
      ...(told?.errands ?? []).map(handOf),
      ...(told?.deeds ?? []).filter((one) => one.job && !one.job.away).map(commandOf),
    ],
    waiting: [
      ...[...unread].reverse().map((one) => ({ id: one.id, said: one.said, handed: true })),
      ...(from.waiting ?? []).map((one) => ({ id: one.id, said: one.text })),
    ],
    carrying: (from.carrying ?? []).map((one) => ({
      id: one.id,
      name: one.name,
      ...(one.preview ? { preview: one.preview } : {}),
    })),
    pinnedNotes: (from.pinnedNotes ?? []).map((one) => ({
      id: one.id,
      path: one.path,
      at: one.at,
      label: one.label,
      note: one.note,
    })),
    ...(from.failure
      ? {
          failure: {
            doing: from.failure.doing,
            canRetry: from.failure.canRetry,
            canCarryOn: from.failure.resetAt !== undefined,
            ...(from.carryOn ? { carryOnAt: from.carryOn } : {}),
            ...(from.failure.kind ? { kind: from.failure.kind } : {}),
            ...(from.failure.since !== undefined ? { since: from.failure.since } : {}),
            ...(from.failure.resetAt !== undefined ? { resetAt: from.failure.resetAt } : {}),
          },
        }
      : {}),
  };
}

function noteOf(
  note: {
    id: string;
    said: string;
    at: number;
    answered: boolean;
    pictures?: number;
    seen?: readonly string[];
  },
  at: number
): Note {
  return {
    id: note.id,
    said: note.said,
    when: note.at ? agoOf(Date.now() - note.at) : 'before this',
    answered: note.answered,
    ...(note.pictures ? { pictures: note.pictures } : {}),
    ...(note.seen?.length ? { seen: note.seen } : {}),
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
 * sends its whole transcript back the moment you walk in, so the time the
 * village noticed it is a lie for anything old. What it knows is when it saw
 * something said while you were there, and, for Claude, the time Claude's own
 * transcript wrote beside it.
 *
 * The plan it posted is a different thing and lives above this: the first thing
 * an agent says is not a plan, however much it reads like one.
 */
function thoughtsOf(told: Told | undefined, mood: Mood | undefined, prompted = false): Thought[] {
  const all = told?.thoughts ?? [];
  /* Whether the newest answer is the last word or only the latest so far,
     said over it, because the fire going out is too quiet a way to say
     that it has finished, and nothing at all said that you had stopped it.
     A prompt mid-turn is still going; an answer that ended on a question
     for you is done, and asking is how the lantern says so. */
  const going = mood === 'working' || mood === 'arriving' || (mood === 'asking' && prompted);
  const ended: Thought['ended'] = going
    ? 'going'
    : told?.ended === 'stopped' || told?.ended === 'closed'
      ? told.ended
      : told?.ended === 'broke'
        ? undefined
        : /* Finished talking is not finished: a command it left going in
             the background is still the work, so it is not called done. */
          told?.deeds.some((one) => one.background && one.running)
          ? 'running'
          : 'done';
  const now = turnOf(told);
  /* An answer to something you said before the newest note is not what is
     happening now, however recently it was said: once you have said the next
     thing, the last reply is history and the live edge is whatever comes back
     to this one. */
  const earlier = (turn: number | undefined): boolean =>
    now !== undefined && turn !== undefined && turn < now;
  /* The last word of each exchange is what it said back to you, and the one
     thing of each worth keeping out when the way there is folded. */
  const answers = new Map<number | undefined, string>();
  for (const one of all) if (!one.quiet && one.trouble !== 'aside') answers.set(one.turn, one.id);
  const answered = new Set(answers.values());
  return all.map((one, at) => ({
    id: one.id,
    said: one.said,
    ...(answered.has(one.id) ? { answer: true } : {}),
    /* A time only where there is one: the village saw it said, Claude's own
       transcript wrote it down, or it is reasoning, which carries its own
       clock. Anything else is placed by where it is in the column and how
       bright it is rather than given a time the village made up. */
    when: one.at ? agoOf(Date.now() - one.at) : '',
    ...(one.since ? { live: true, at: longFor(Date.now() - one.since) } : {}),
    ...(at === all.length - 1 && !one.since && !earlier(one.turn)
      ? { live: true, ...(ended && !one.quiet && !one.trouble ? { ended } : {}) }
      : {}),
    ...(earlier(one.turn) ? { earlier: true } : {}),
    ...(one.quiet ? { quiet: true } : {}),
    ...(one.pack ? { pack: one.pack, said: packSaid(one.pack, one.said) } : {}),
    ...(one.trouble ? { trouble: one.trouble } : {}),
    ...(one.seq !== undefined ? { seq: one.seq } : {}),
  }));
}

/** The recap, while the answer it was written under is still the last word. */
function recapOf(told: Told | undefined, going: boolean): string | undefined {
  if (going || !told?.recap) return undefined;
  const last = told.thoughts.filter((one) => !one.quiet).at(-1);
  return last?.id === told.recap.after ? told.recap.said : undefined;
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
  /* A step that finished after the last thing it said means nothing is being
     written now: it is between one step and the next, working out which. */
  const lastDeed = told?.deeds.at(-1);
  const between =
    lastDeed?.seq !== undefined && last?.seq !== undefined && lastDeed.seq > last.seq;
  const doing = told?.stopping
    ? 'stopping'
    : from.mood === 'arriving'
      ? 'waking up'
      : last?.pack?.state === 'packing'
        ? 'packing it down'
        : running
          ? doingNow(running)
          : reasoning
            ? 'thinking'
            : between
              ? 'deciding what next'
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

type DeedIn = Parameters<typeof stepOf>[0];

/**
 * The steps as they are worth reading: everything that changed something on
 * its own line, in words, and every run of looking around in between folded
 * into one quiet line that says how much looking it was.
 */
function stepsOf(deeds: readonly DeedIn[]): Step[] {
  const out: Step[] = [];
  let run: { deed: DeedIn; plain: Plain }[] = [];
  const flush = (): void => {
    const first = run[0];
    if (!first) return;
    out.push({
      id: `look:${first.deed.id}`,
      did: lookedAround(run.map((one) => one.plain.looked)),
      prop: KIT_NAMES.sign,
      kind: 'look',
      ...(first.deed.seq !== undefined ? { seq: first.deed.seq } : {}),
      group: run.map((one) => ({ id: one.deed.id, did: one.deed.why ?? one.deed.did })),
    });
    run = [];
  };
  for (const deed of deeds) {
    const plain = plainOf(deed);
    if (plain.kind === 'look' && !deed.running && !deed.wrong) {
      run.push({ deed, plain });
      continue;
    }
    flush();
    const step = stepOf(deed);
    step.kind = kindOf(deed);
    /* A command that only looked has no words of its own worth printing: the
       raw command is the least readable thing there is. */
    const looked = plain.kind === 'look' ? (deed.why ?? 'ran a check') : undefined;
    if (deed.tool === 'execute-tool-call' && deed.background && deed.running) {
      step.did = plain.said ?? looked ?? deed.did;
      step.note = 'still going in the background';
    } else if (deed.tool === 'execute-tool-call') {
      step.did = plain.said ?? (deed.running ? (deed.why ?? 'looking around') : (looked ?? deed.did));
      if (plain.said === 'ran the tests' && !deed.running)
        step.note = deed.wrong ? 'failed' : 'passed';
      else if (deed.wrong) step.note = 'failed';
    }
    out.push(step);
  }
  flush();
  return out;
}

/** Which sign a step is drawn with, from what it actually did. */
function kindOf(deed: DeedIn): StepKind {
  switch (deed.tool) {
    case 'read-tool-call':
    case 'web-fetch-tool-call':
      return 'read';
    case 'search-tool-call':
    case 'tool-group':
      return 'look';
    case 'create-file-tool-call':
      return 'write';
    case 'modify-file-tool-call':
      return 'edit';
    case 'delete-file-tool-call':
      return 'delete';
    case 'spawn-subagent-tool-call':
      return 'send';
    case 'create-plan-tool-call':
      return 'plan';
    case 'execute-tool-call': {
      const said = plainCommand(deed.did).said ?? '';
      if (said.startsWith('committed')) return 'commit';
      if (said === 'pushed' || said === 'opened a pull request') return 'push';
      if (said === 'ran the tests') return 'test';
      if (said === 'built the app') return 'build';
      if (said.startsWith('installed')) return 'install';
      if (said) return 'git';
      return 'run';
    }
    default:
      return 'tool';
  }
}

function plainOf(deed: DeedIn): Plain {
  switch (deed.tool) {
    case 'read-tool-call':
    case 'web-fetch-tool-call':
      return plainRead(deed.did);
    case 'search-tool-call':
      return { kind: 'look', looked: 'search' };
    case 'execute-tool-call': {
      const plain = plainCommand(deed.did);
      /* Where the agent did say what a command was for, that is the words. */
      return plain.kind === 'act' && deed.why ? { ...plain, said: deed.why } : plain;
    }
    case 'tool-group':
      return { kind: 'look', looked: 'check' };
    default:
      return /^(ToolSearch|ListAgents|TodoWrite|Skill)\b/.test(deed.did)
        ? { kind: 'look', looked: 'check' }
        : { kind: 'act' };
  }
}

function stepOf(deed: {
  id: string;
  did: string;
  why?: string;
  note?: string;
  tool: string;
  running: boolean;
  background?: boolean;
  wrong?: boolean;
  path?: string;
  diff?: string[];
  diffMore?: number;
  seq?: number;
  job?: Deed['job'];
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
    ...(deed.seq !== undefined ? { seq: deed.seq } : {}),
  };
}

/**
 * What the cart is carrying.
 *
 * Only what was made to be looked at: a page it published, a document or a
 * picture it wrote, a thing it built. The source it changed on the way is what
 * it did, not what it made. Newest first, and pressing one goes to it the way
 * it is best looked at: the board reads what the board reads well, a page
 * opens where the web is read, and a build is shown where it landed.
 */
function madeOf(told: Told | undefined): Session['made'] {
  return (told?.made ?? []).map((one) => ({
    id: one.id,
    kind: one.kind,
    what: one.name,
    when: `${MADE_VERB[one.kind]} ${one.at ? agoOf(Date.now() - one.at) : 'before this'}`,
    pick: madePick(one),
  }));
}

const MADE_VERB = { page: 'published', file: 'written', build: 'built' } as const;

/** What the board reads better than anything else on the machine would. */
const READ_HERE = /\.(md|markdown|csv|png|jpe?g|gif|webp|svg)$/i;

function madePick(one: NonNullable<Told['made']>[number]): string {
  if (one.url) return `link:${one.url}`;
  if (one.kind === 'build') return `showit:${one.path}`;
  if (one.inside && READ_HERE.test(one.inside)) return `open:${one.inside}`;
  return `openit:${one.path}`;
}

/**
 * Whoever it sent out, and their colour.
 *
 * The tint is worked out from what they were sent to do rather than handed
 * down, so the same errand is the same colour every time you look, which is
 * the whole point of it: tint is identity, never status.
 */
function handOf(errand: Errand): Hand {
  return {
    id: errand.id,
    errand: shortOf(errand.errand),
    said: errand.errand,
    where: errand.running ? 'out' : 'in-light',
    ...(errand.since ? { gone: agoOf(Date.now() - errand.since) } : {}),
    tint: TINTS[hashOf(errand.errand) % TINTS.length] ?? TINTS[0]!,
    ...(errand.call ? { call: errand.call } : {}),
    ...(errand.background ? { background: true } : {}),
    ...(errand.wrong ? { wrong: true } : {}),
    steps: stepsOf(errand.steps ?? []),
    ...(errand.tokens ? { tokens: tokensSaid(errand.tokens), tokenCount: errand.tokens } : {}),
    ...(errand.since ? { since: errand.since } : {}),
    ...(errand.ran ? { ran: errand.ran } : {}),
  };
}

/**
 * A command it left running in the background, standing in the yard beside
 * whoever it sent out: a pot of its own on a fire of its own, lit for as long
 * as the command is going. Called by what it was for, the same words its step
 * under "what it did" uses, and walked up to, stopped and sent away the same
 * way a helper is.
 */
function commandOf(deed: DeedIn): Hand {
  const job = deed.job!;
  const plain = plainOf(deed);
  const said = plain.said ?? deed.why ?? deed.did;
  return {
    id: `job:${job.call}`,
    errand: said,
    said,
    where: deed.running ? 'out' : 'in-light',
    ...(job.since ? { gone: agoOf(Date.now() - job.since), since: job.since } : {}),
    tint: TINTS[hashOf(said) % TINTS.length] ?? TINTS[0]!,
    call: job.call,
    background: true,
    ...(deed.wrong ? { wrong: true } : {}),
    steps: [],
    command: deed.did,
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

/**
 * What a lantern says, which is one of a handful of things and never two.
 *
 * Working, wanting you, and done with something you have not been in to see
 * are the lit ones: each is a reason to look. Idle, waiting out a limit,
 * broken and still being set up are dark, and the words under the name say
 * which. Done lasts until you have stood in it; after that it is idle.
 */
function lanternOf(
  task: Task,
  mood: Mood | undefined,
  at: {
    here: boolean;
    serving: boolean;
    cutting: boolean;
    glance?: Glance;
    finished?: number;
  }
): Lantern {
  const base = { id: task.id, name: task.title, here: at.here, unread: false };
  if (at.cutting) {
    return {
      ...base,
      here: false,
      posture: 'resting',
      saying: 'setting up',
      lit: false,
      ground: 'cutting',
    };
  }
  const { posture, saying, lit } = stateOf(task, mood, at.glance, at.finished);
  /* The highlight already says which one you are standing in, so the words
     under it say what it is doing, the same as every other lantern. */
  const said = saying;
  /* Something in this checkout is answering on a port right now. Said in the
     same words the rest of the lantern speaks in, not a mark beside it. */
  return {
    ...base,
    posture,
    saying: at.serving ? `${said} · serving` : said,
    /* The one you are standing in is lit whatever it is doing: you are in
       there with the lights on. */
    lit: lit || at.here,
    ...(posture === 'waiting' ? { ember: emberOf(at.glance) } : {}),
    unread: posture === 'done',
    ground: 'ready',
  };
}

/**
 * How much of a wait is behind it, which is how full of ember its lantern is.
 * A wait with no end anybody named shows a little and stays there, banked
 * rather than out; one already over is full.
 */
function emberOf(glance: Glance | undefined): number {
  const wait = glance?.waiting;
  const end = wait?.carryOn ?? wait?.resetAt;
  if (!wait || end === undefined || wait.since === undefined || end <= wait.since) return 0.15;
  return Math.max(0.08, Math.min(1, (Date.now() - wait.since) / (end - wait.since)));
}

function stateOf(
  task: Task,
  mood: Mood | undefined,
  glance: Glance | undefined,
  finished: number | undefined
): { posture: Posture; saying: string; lit: boolean } {
  const now = Date.now();
  switch (mood) {
    case 'arriving':
      return { posture: 'working', saying: 'waking up', lit: true };
    case 'working': {
      const doing = railDoing(glance?.tool);
      const since = glance?.since;
      return {
        posture: 'working',
        saying: since ? `${doing} · ${shortFor(now - since)}` : doing,
        lit: true,
      };
    }
    case 'asking':
      return {
        posture: 'wants-you',
        saying: glance?.asked ? 'asked you something' : 'wants you',
        lit: true,
      };
    case 'hurt':
      return {
        posture: 'broken',
        saying: glance?.signIn ? 'needs signing in' : 'it broke',
        lit: false,
      };
    case 'resting': {
      if (glance?.waiting) {
        const { kind, resetAt, carryOn } = glance.waiting;
        if (kind === 'limit') {
          const saying = carryOn
            ? `limit · back ${clockOf(carryOn)}`
            : resetAt && resetAt <= now
              ? 'limit lifted · carry on?'
              : resetAt
                ? `limit · lifts ${clockOf(resetAt)}`
                : 'out of usage';
          return { posture: 'waiting', saying, lit: false };
        }
        const what = kind === 'service' ? 'trouble at the other end' : 'lost the connection';
        const back = resetAt && resetAt > now ? ` · back at ${clockOf(resetAt)}` : '';
        return { posture: 'waiting', saying: what + back, lit: false };
      }
      /* Stopped talking with a command still going in the background is
         still at work, and reads as it from across the room. */
      const behind = glance?.background ?? 0;
      if (behind) {
        return {
          posture: 'working',
          saying: behind > 1 ? `${behind} running in the background` : 'running in the background',
          lit: true,
        };
      }
      if (finished !== undefined) {
        return { posture: 'done', saying: `done · ${agoFor(now - finished)}`, lit: true };
      }
      return idleOf(task);
    }
    default:
      return idleOf(task);
  }
}

/* A session in the project's own folder is on whatever branch that folder
   is on, which every other shared session is on too, so naming it says
   nothing. One in a copy of its own names its branch, because that is the
   one thing telling it apart. */
function idleOf(task: Task): { posture: Posture; saying: string; lit: boolean } {
  const branch = task.shared ? '' : shortOf(task.branch);
  const worth = branch && branch !== slugOf(task.title);
  return { posture: 'resting', saying: worth ? `idle · ${branch}` : 'idle', lit: false };
}

/** The kind of work, in a word or two, which is all a lantern has room for. */
function railDoing(tool: string | undefined): string {
  switch (tool) {
    case 'execute-tool-call':
      return 'running something';
    case 'read-tool-call':
    case 'web-fetch-tool-call':
      return 'reading';
    case 'search-tool-call':
      return 'looking around';
    case 'create-file-tool-call':
      return 'writing';
    case 'modify-file-tool-call':
    case 'delete-file-tool-call':
      return 'changing things';
    case 'spawn-subagent-tool-call':
      return 'sending somebody out';
    case 'create-plan-tool-call':
      return 'making a plan';
    case undefined:
      return 'thinking';
    default:
      return 'working';
  }
}

/** How long, in the one unit that matters at a glance. */
function shortFor(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

function agoFor(ms: number): string {
  const said = shortFor(ms);
  return said === 'just now' ? said : `${said} ago`;
}

/** A clock time in this machine's own zone, lower case, no space before am/pm. */
function clockOf(at: number): string {
  return new Date(at)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(':00', '');
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

/**
 * A packing down in one line, for when it has gone up into the history and is
 * read rather than drawn: how far down it went and how long it took, where the
 * village saw either.
 */
function packSaid(pack: Pack, said: string): string {
  if (pack.state !== 'packed') return said;
  const down =
    pack.from && pack.to !== undefined
      ? `, from ${tokensSaid(pack.from).replace(' tokens', '')} to ${tokensSaid(pack.to)}`
      : '';
  const took = pack.began && pack.ended ? ` in ${longFor(pack.ended - pack.began)}` : '';
  return `Packed the conversation down${down}${took}.`;
}

/** A count of tokens, the way Claude Code says one: `850`, `45.2k`, `1.3m`. */
function tokensSaid(n: number): string {
  if (n < 1000) return `${n} tokens`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k tokens`;
  return `${(n / 1_000_000).toFixed(1)}m tokens`;
}

/** A helper's steps read off Claude's own record, worded the way a session's are. */
export function stepsFromTrail(
  deeds: readonly { id: string; did: string; why?: string; tool: string; wrong?: boolean }[]
): Step[] {
  return stepsOf(deeds.map((deed) => ({ ...deed, running: false })));
}
