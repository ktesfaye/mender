import {
  defineContract,
  fallible,
  liveModel,
  liveState,
  procedure,
  uploadFile,
} from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * The agents, which are the villagers.
 *
 * What crosses this wire is not an ACP session. It is what somebody working in
 * a building looks like from outside it: what mood they are in, what they are
 * doing, what they have done, and whether they are standing at the door waiting
 * to ask you something. The session underneath is emdash's and stays in the
 * main process, where the ACP vocabulary belongs.
 */

/**
 * What a villager is doing, at the distance the island is read from.
 *
 * `empty` is a building nobody has moved into: the worktree is cut and the
 * lights are off. Everything else means somebody is in there.
 */
export const moodSchema = z.enum(['empty', 'arriving', 'working', 'asking', 'resting', 'hurt']);
export type Mood = z.infer<typeof moodSchema>;

export const toneSchema = z.enum(['ink', 'faded', 'keen', 'sore']);

/**
 * One line of what happened in there.
 *
 * `said` is prose and wraps; `deed` is one thing done, with a mark in the
 * margin; `note` is the village talking rather than the agent.
 */
export const lineSchema = z.object({
  kind: z.enum(['said', 'deed', 'note', 'thought']),
  mark: z.string(),
  text: z.string(),
  tone: toneSchema,
  /** Which end survives when the board is narrower than the line. */
  keep: z.enum(['front', 'tail']).optional(),
  /**
   * How deep inside other work this sits.
   *
   * An agent that sends another agent off, or a run of edits gathered under one
   * heading, is a tree and not a list. Flattening it loses who did what.
   */
  depth: z.number().int().optional(),
  /** Stable identity, so a thing you opened stays open while it is still running. */
  id: z.string().optional(),
  /**
   * What is written underneath when it is opened.
   *
   * Everything a tool actually produced — what a command printed, what a file
   * edit changed, what it was thinking — comes across whether or not anybody is
   * looking at it, because the board decides what is shown and the main process
   * has no business knowing what is open.
   */
  body: z.array(z.string()).optional(),
  /** Whether the body is plain writing or a change to a file. */
  bodyKind: z.enum(['plain', 'diff']).optional(),
  /** How much more there was than the body carries. */
  more: z.number().int().optional(),
});
export type Line = z.infer<typeof lineSchema>;

/**
 * A villager standing at the door with a question, and the ways to answer it.
 *
 * Most of the time there is one thing to answer and a key sends it straight
 * away. `multi` means several things are asking at once: a key marks which
 * answer each one gets instead of sending it, `options` carries which pending
 * question each answer belongs to and whether it is already marked, and
 * nothing is sent until "that's everything" is pressed.
 */
export const askSchema = z.object({
  requestId: z.string(),
  text: z.string(),
  /** A form's short name for what this question is about, over it. */
  header: z.string().optional(),
  /** Which of a form's questions this is, "2 of 3", when there is more than one. */
  step: z.string().optional(),
  /** What else answers it besides a number: writing on the line. */
  aside: z.string().optional(),
  /** Writing on the line answers it too. */
  writable: z.boolean().optional(),
  /** What an empty return presses: sending what is marked, or the whole form. */
  submit: z.string().optional(),
  multi: z.boolean().optional(),
  options: z.array(
    z.object({
      optionId: z.string(),
      name: z.string(),
      /** What picking it would mean, when the agent said. */
      about: z.string().optional(),
      /** A line the board adds under the agent's own answers, set apart from them. */
      kind: z.enum(['other', 'submit', 'talk']).optional(),
      /** Which pending question this answers. Only set when `multi`. */
      requestId: z.string().optional(),
      /** Marked but not sent yet. Only meaningful when `multi`. */
      picked: z.boolean().optional(),
    })
  ),
});
export type Ask = z.infer<typeof askSchema>;

/**
 * One step of what a session says it means to do.
 *
 * Not the village's list and not a task: it is the agent's own plan, replaced
 * whole every time it changes its mind, which is why nothing here is kept.
 */
export const stepSchema = z.object({
  text: z.string(),
  /** Behind them, under their hands, or still ahead of them. */
  state: z.enum(['done', 'doing', 'ahead']),
});
export type Step = z.infer<typeof stepSchema>;

/**
 * A picture picked up and not yet handed over.
 *
 * Dropped on the wood or pasted onto it, it waits by the line you are writing
 * on until you say something, and goes with whatever you say.
 */
export const carriedSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
});
export type Carried = z.infer<typeof carriedSchema>;

/** Something said while somebody was busy, still waiting its turn. */
export const waitingSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type Waiting = z.infer<typeof waitingSchema>;

/**
 * What one session looks like when it is a yard rather than a transcript.
 *
 * The board used to be a list of lines and the village is not: it is a place
 * with your notes on the gatepost, the agent's thinking rising off the fire,
 * what it made on the cart and whoever it sent out standing in or out of the
 * light. Those are four different things about the same conversation, and
 * flattening them into one column is what a terminal does.
 *
 * So they are projected separately, here, where the turns actually are. The
 * renderer gets four lists it can put in four places and does not have to
 * re-derive any of it from prose.
 */

/**
 * A typed failure the agent has reported — a limit, an overload, a lost
 * connection, sign-in required — and what there is to do about it.
 *
 * Not the raw AIR report: `doing` is already said in the village's voice
 * (what `main/agents.ts`'s `failureDoing` writes for the fire), and the three
 * action flags are Mender's own read of what's worth offering, not a copy of
 * the AIR extension's own action list — the agent's typed usage-limit report
 * carries no actions at all, and "carry on when it lifts" is the village's own
 * invention for it.
 */
export const failureSchema = z.object({
  /** Whether the fire banks (a wait with a next move) or stays sore. */
  bankable: z.boolean(),
  doing: z.string(),
  canRetry: z.boolean(),
  /** Set only when a reset time is known, so a wait can be scheduled. */
  resetAt: z.number().optional(),
});
export type Failure = z.infer<typeof failureSchema>;

/**
 * A session as its lantern on the rail reads it, from across the room.
 *
 * The mood says which of a handful of states it is in; this says the one
 * thing more the line under its name needs: which kind of work it is at and
 * since when, or what kind of wait it is standing in and when that lifts.
 */
export const glanceSchema = z.object({
  /** When the turn it is working on began, when this process saw it begin. */
  since: z.number().optional(),
  /** The tool's own word for the step it is in the middle of, if any. */
  tool: z.string().optional(),
  /** A wait with a next move: a limit, a rough patch, a dropped line. */
  waiting: z
    .object({
      kind: z.enum(['limit', 'service', 'connection']),
      resetAt: z.number().optional(),
    })
    .optional(),
  /** It cannot go on until somebody signs it in. */
  signIn: z.boolean().optional(),
});
export type Glance = z.infer<typeof glanceSchema>;

/** Something you said, which is what is nailed to the gatepost. */
export const notedSchema = z.object({
  id: z.string(),
  said: z.string(),
  /** When it was said. Stamped as it arrives, because the protocol has no clock. */
  at: z.number(),
  /** Whether anything has come back since. */
  answered: z.boolean(),
  /** Which turn of the conversation it opened. */
  turn: z.number().int().optional(),
  /** How many pictures went with it, which the post says rather than shows. */
  pictures: z.number().int().optional(),
  /** Where on this machine each of those pictures can still be read, where known. */
  seen: z.array(z.string()).optional(),
  /**
   * Handed into a turn already running and not read yet: nothing has come
   * back since it went in, so it is still what is coming, not what was asked.
   */
  unread: z.boolean().optional(),
});
export type Noted = z.infer<typeof notedSchema>;

/** Something it thought or said back, which is what rises off the fire. */
export const musedSchema = z.object({
  id: z.string(),
  said: z.string(),
  at: z.number(),
  /** Reasoning rather than an answer, which reads differently. */
  quiet: z.boolean().optional(),
  /**
   * Not an answer at all but the turn going wrong: a limit hit, a refusal, a
   * process that died. `wrong` stopped it; `warn` let it finish short;
   * `aside` is the adapter itself warning that something did not go as asked;
   * `stopped` is you calling it off before it had said anything back.
   */
  trouble: z.enum(['wrong', 'warn', 'aside', 'stopped']).optional(),
  /** Still going, and since when. */
  since: z.number().optional(),
  /** Which turn of the conversation it belongs to, so the board can tell an
      answer to what you just said from the one before it. */
  turn: z.number().int().optional(),
  /** Not something said but the conversation being packed down to make room. */
  pack: z
    .object({
      state: z.enum(['packing', 'packed', 'failed']),
      /** What the agent said went wrong, when it failed and said. */
      why: z.string().optional(),
      /** When the village saw it start and finish, or 0 when it was not looking. */
      began: z.number(),
      ended: z.number().optional(),
      /** How much it was holding in mind before, and after, in tokens. */
      from: z.number().optional(),
      to: z.number().optional(),
      /** How much it can hold at all. */
      size: z.number().optional(),
      /** How long one usually takes here, so the board can say how far along it is. */
      expect: z.number(),
    })
    .optional(),
});
export type Mused = z.infer<typeof musedSchema>;
export type Pack = NonNullable<Mused['pack']>;

/** One thing it did, which is a step in the yard's right-hand column. */
export const deedSchema = z.object({
  id: z.string(),
  did: z.string(),
  /**
   * What it was for, in the agent's own words, when it said.
   *
   * A command is the least readable thing an agent does: it opens with a
   * variable or a `cd` into a path, and cut to one line all that survives is
   * the setup. Claude writes one plain line beside every command saying what
   * it is for, and that is what the yard reads out instead.
   */
  why: z.string().optional(),
  /** What it cost or turned up, written cool after the thing itself. */
  note: z.string().optional(),
  /**
   * Which kind of tool it was.
   *
   * The board stands a prop from the kit in for each one — a signpost for a
   * skill, a crate for a file written, an anvil for a file changed — and it
   * cannot pick one from a sentence. This is the tool's own word for itself.
   */
  tool: z.string(),
  running: z.boolean(),
  /** A command left running in the background, which can outlive its turn. */
  background: z.boolean().optional(),
  wrong: z.boolean().optional(),
  /** The file this step touched, so the board knows what "open it" means. */
  path: z.string().optional(),
  /** A few marked lines of what changed, capped, for reading right under the step. */
  diff: z.array(z.string()).optional(),
  /** How many more marked lines there were than `diff` carries. */
  diffMore: z.number().int().optional(),
});
export type Deed = z.infer<typeof deedSchema>;

/** Somebody it sent off, who is standing in the yard until they are back. */
export const errandSchema = z.object({
  id: z.string(),
  /** What they were sent to do, which is the only useful name for them. */
  errand: z.string(),
  running: z.boolean(),
  /** When they went, so the yard knows how far out to stand them. */
  since: z.number().optional(),
  /** The tool call that sent them, which is what calling them back names. */
  call: z.string().optional(),
  /** Sent off to work on their own while the session carried on. */
  background: z.boolean().optional(),
  /** Came back hurt, or was called back. */
  wrong: z.boolean().optional(),
  /** Everything they have done out there, oldest first, the same as a session's. */
  steps: z.array(deedSchema).default([]),
  /** How many tokens they are working with, as Claude Code counts a helper's. */
  tokens: z.number().optional(),
  /** How long one that has come back was out, in milliseconds. */
  ran: z.number().optional(),
});
export type Errand = z.infer<typeof errandSchema>;

/** A file this session wrote, which is what the cart is carrying. */
export const wroteSchema = z.object({
  path: z.string(),
  at: z.number(),
  added: z.number().int(),
  gone: z.number().int(),
});
export type Wrote = z.infer<typeof wroteSchema>;

/**
 * Something a session made for you to look at, as opposed to a file it
 * changed on the way: a page it published, a document or picture it wrote, a
 * thing it built. Kept by the village itself, so a session that is closed and
 * resumed still has everything it ever handed over.
 */
export const madeSchema = z.object({
  /** The path or the address, which is also what makes two of them the same. */
  id: z.string(),
  kind: z.enum(['page', 'file', 'build']),
  /** What it is called, said the way anybody would say it. */
  name: z.string(),
  /** The name is the page's own, read off what was published, not guessed from prose. */
  sure: z.boolean().optional(),
  /** Where it is on this machine, for a file or a build. */
  path: z.string().optional(),
  /** Where it is inside the session's checkout, when it is in there. */
  inside: z.string().optional(),
  /** Where it is on the web, for a published page. */
  url: z.string().optional(),
  /** When it was first seen made, or 0 when that was before anybody looked. */
  at: z.number(),
});
export type Made = z.infer<typeof madeSchema>;

export const toldSchema = z.object({
  /** Newest first. */
  notes: z.array(notedSchema),
  /** Oldest first, so the newest is the one at the live edge. */
  thoughts: z.array(musedSchema),
  /** Oldest first, the running one last. */
  deeds: z.array(deedSchema),
  errands: z.array(errandSchema),
  /** Newest first. */
  wrote: z.array(wroteSchema),
  /** Newest first, everything it has ever made, even from before a resume. */
  made: z.array(madeSchema),
  /** How many turns have been taken in here. */
  turns: z.number().int(),
  /** When the first thing was said, so the board can say how long this has run. */
  began: z.number().nullable(),
  /**
   * How the newest turn came to rest, once it has: finished, called off, or
   * broken. Absent while it is still going, and for history read back off the
   * disk, which never says how it ended.
   */
  ended: z.enum(['done', 'stopped', 'broke']).optional(),
  /** Called off and not yet stopped, so the fire can say it heard. */
  stopping: z.boolean().optional(),
  /**
   * Where the whole session stands, in a sentence or two, for somebody coming
   * back to it: worked out by a small model once a turn has finished, and only
   * still true while `after`, the answer it was written under, is the newest.
   */
  recap: z.object({ said: z.string(), after: z.string() }).optional(),
});
export type Told = z.infer<typeof toldSchema>;

export const workingStateSchema = z.object({
  mood: moodSchema,
  /** One line for what is happening right now. */
  doing: z.string(),
  lines: z.array(lineSchema),
  /** The same conversation, as a place rather than as a list. */
  told: toldSchema,
  asking: askSchema.nullable(),
  /** What it says it is going to do, when it has said. */
  plan: z.array(stepSchema),
  /** What you said while it was busy, in the order it will hear it. */
  queued: z.array(waitingSchema),
  /**
   * How much room is left to think in, from one down to nothing.
   *
   * An agent has a finite amount it can hold in mind at once and it gets no
   * warning of its own when that runs out; the conversation simply starts
   * losing its beginning. Null until the agent says, which not all of them do.
   */
  room: z.number().nullable(),
  /**
   * What it has cost so far, when the agent reports it. Null until the agent
   * says, which not all of them do.
   */
  cost: z.object({ amount: z.number(), currency: z.string() }).nullable(),
  /** A typed failure worth its own line, or null when there isn't one. */
  failure: failureSchema.nullable(),
  /**
   * When set, a continue is scheduled to send itself at this epoch ms — you
   * pressed "carry on when it lifts" and haven't cancelled it. Null otherwise.
   */
  carryOn: z.number().nullable(),
  /**
   * Present and true while a sleeping session is being woken: its agent is
   * starting and reading its whole history back in, and nothing on the board
   * is worth drawing until that is over.
   */
  waking: z.literal(true).optional(),
});
export type WorkingState = z.infer<typeof workingStateSchema>;

export const agentErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-such-task') }),
  /** Nothing was said. */
  z.object({ kind: z.literal('nothing') }),
  /** The runtime refused, and this is what it said. */
  z.object({ kind: z.literal('refused'), because: z.string() }),
]);
export type AgentError = z.infer<typeof agentErrorSchema>;

/** Somebody who could move in: an agent whose CLI speaks the protocol. */
export const handSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Whether their CLI is actually on this machine. */
  here: z.boolean(),
  /** Whether they are signed in, or null when this agent has no notion of it. */
  signedIn: z.boolean().nullable(),
});

/** One of the things a session can be set to. */
export const choiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string().optional(),
});

/** Something out in the world the session can reach. */
export const toolSchema = z.object({
  name: z.string(),
  on: z.boolean(),
  /** What went wrong when it was started, if anything did. */
  trouble: z.string().nullable(),
});

/** Something the agent knows how to do, written down where it can find it. */
export const knackSchema = z.object({
  name: z.string(),
  about: z.string(),
  /** Where it is kept: everywhere, or only in this checkout. */
  from: z.enum(['everywhere', 'here']),
});

/**
 * One of the slash commands the agent itself advertises.
 *
 * Not a list anybody here keeps: the CLI says what it answers to when it
 * starts, and on Claude that is where its own commands and the skills it has
 * been taught come from.
 */
export const orderSchema = z.object({
  name: z.string(),
  about: z.string(),
  /** What it expects after the name, in the agent's own words. */
  takes: z.string().optional(),
});

/** Everything a session works with, and everything it could work with. */
export const kitSchema = z.object({
  hand: z.string(),
  hands: z.array(handSchema),
  model: z.string().nullable(),
  models: z.array(choiceSchema),
  mode: z.string().nullable(),
  modes: z.array(choiceSchema),
  effort: z.string().nullable(),
  efforts: z.array(choiceSchema),
  /** How it goes about the work, where the agent has more than one way (Codex: Default or Plan). */
  collab: z.string().nullable(),
  collabs: z.array(choiceSchema),
  tools: z.array(toolSchema),
  knacks: z.array(knackSchema),
  /** Whether this agent has a notion of a taught skill at all. False is "this
      agent keeps none", which reads differently from a true agent with an
      empty shelf. */
  knacksSupported: z.boolean(),
  orders: z.array(orderSchema),
  /** True once the session has started and the agent has said what it offers. */
  awake: z.boolean(),
  /** Set only when the agent working here needs you to sign in: what it is
   *  called and the line that does it, to open in the real shell. */
  signIn: z.object({ agent: z.string(), command: z.string() }).nullable(),
});

export type Hand = z.infer<typeof handSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Tool = z.infer<typeof toolSchema>;
export type Knack = z.infer<typeof knackSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Kit = z.infer<typeof kitSchema>;

export const agentsContract = defineContract({
  /** What one session works with, as it changes. */
  kit: liveModel({
    key: z.object({ task: z.string() }),
    states: { state: liveState({ data: kitSchema }) },
  }),
  /** Set one of the things on the kit. */
  choose: fallible({
    input: z.object({
      task: z.string(),
      what: z.enum(['hand', 'model', 'mode', 'effort', 'collab']),
      id: z.string(),
    }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Turn one of the session's tools on or off. */
  /**
   * Put an agent's CLI on this machine.
   *
   * The village knows every agent that speaks the protocol and which of them
   * are actually installed, and that has been a fact you could only read. This
   * is it being a thing you can do instead.
   */
  fetch: fallible({
    input: z.object({ hand: z.string() }),
    data: z.object({
      here: z.boolean(),
      /** What the install command said, when it ran and left them not here. */
      because: z.string().optional(),
    }),
    error: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('no-such-agent') }),
      z.object({ kind: z.literal('nothing-to-run') }),
      z.object({ kind: z.literal('refused'), because: z.string() }),
    ]),
  }),
  /** Bring an agent already here up to date. */
  update: fallible({
    input: z.object({ hand: z.string() }),
    data: z.object({ here: z.boolean() }),
    error: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('no-such-agent') }),
      z.object({ kind: z.literal('refused'), because: z.string() }),
    ]),
  }),
  /** Take an agent's CLI back off this machine. */
  remove: fallible({
    input: z.object({ hand: z.string() }),
    data: z.object({ here: z.boolean() }),
    error: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('no-such-agent') }),
      z.object({ kind: z.literal('refused'), because: z.string() }),
    ]),
  }),
  tool: fallible({
    input: z.object({ task: z.string(), name: z.string(), on: z.boolean() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Add one from the catalogue of suggested servers. */
  addTool: fallible({
    input: z.object({ task: z.string(), key: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Add one of your own: a name, then its command or URL. */
  addCustomTool: fallible({
    input: z.object({ task: z.string(), name: z.string(), command: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Throw one away, for this agent only. */
  removeTool: fallible({
    input: z.object({ task: z.string(), name: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** The catalogue of skills Emdash ships, to install one from. */
  skillsCatalogue: procedure({
    input: z.void(),
    output: z.array(z.object({ id: z.string(), name: z.string(), about: z.string() })),
  }),
  /** Install one from the catalogue, for this agent everywhere. */
  addKnack: fallible({
    input: z.object({ task: z.string(), id: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Write one of your own: a name, then what it is for. */
  addCustomKnack: fallible({
    input: z.object({ task: z.string(), name: z.string(), about: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Throw one away. */
  removeKnack: fallible({
    input: z.object({ task: z.string(), name: z.string(), from: z.enum(['everywhere', 'here']) }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** What it actually says, read on demand. */
  knackText: fallible({
    input: z.object({ task: z.string(), name: z.string(), from: z.enum(['everywhere', 'here']) }),
    data: z.object({ content: z.string() }),
    error: agentErrorSchema,
  }),
  /** What is going on in one building, as it goes on. */
  work: liveModel({
    key: z.object({ task: z.string() }),
    states: {
      state: liveState({ data: workingStateSchema }),
    },
  }),
  /**
   * Start whoever lives in there, without saying anything to them.
   *
   * A session that has been spoken to before keeps its branch, its worktree
   * and its transcript across a restart, but the agent itself is not running
   * until something wakes it, and until it is running it cannot say what
   * models it has or what commands it answers to. Opening the board is enough
   * of a reason.
   */
  wake: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * The same wake, for a session whose board is its own terminal rather than
   * a chat: it runs the agent's own CLI raw, wired to emdash's TUI-agent
   * runtime instead of the ACP one `wake` starts.
   */
  wakeTerminal: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Say something to whoever is in there, moving somebody in if nobody is. */
  tell: fallible({
    input: z.object({
      task: z.string(),
      text: z.string(),
      /** Whatever was picked up off the wood, handed over with it. */
      carrying: z.array(carriedSchema).optional(),
      /** Said to the agent alongside, and never shown back as what you said. */
      hidden: z.string().optional(),
    }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * Start a brand-new conversation already pointed at somebody else's
   * session id — the Claude Code CLI's own on-disk history, picked up off
   * disk rather than typed fresh. No prompt is sent: resuming *is* the
   * first thing said. If the provider can't find that session any more it
   * falls back to starting clean, the same graceful fallback any ordinary
   * relaunch already gets.
   */
  resume: fallible({
    input: z.object({ task: z.string(), providerSessionId: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * Pick a picture up off the wood.
   *
   * It goes to the session's own store rather than anywhere of ours, because
   * it belongs to that conversation and dies with it.
   */
  carry: uploadFile({
    input: z.object({ task: z.string() }),
    accept: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    result: carriedSchema,
    error: agentErrorSchema,
  }),
  /** Put one down again, before it goes anywhere. */
  putDown: fallible({
    input: z.object({ task: z.string(), id: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * Answer the question it came to the door with.
   *
   * On a plain question this sends straight away. On a multi-select one it
   * only marks the pick against its own pending question; nothing goes out
   * until `finishAsking`.
   */
  answer: fallible({
    input: z.object({ task: z.string(), requestId: z.string(), optionId: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** "That's everything": sends every mark a multi-select question has, at once. */
  finishAsking: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Take back something you said while it was busy, before it is heard. */
  unsay: fallible({
    input: z.object({ task: z.string(), id: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Tell it to stop what it is doing. */
  hush: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Call one of the helpers it sent out back, without stopping it. */
  recall: fallible({
    input: z.object({ task: z.string(), call: z.string() }),
    data: z.object({ stopped: z.boolean() }),
    error: agentErrorSchema,
  }),
  /** Stop a helper if they are still out, and take them off the yard for good. */
  sendAway: fallible({
    input: z.object({ task: z.string(), call: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Everything a helper did and said, off Claude's own record of them. */
  helperTrail: fallible({
    input: z.object({ task: z.string(), call: z.string() }),
    data: z
      .object({
        prompt: z.string().optional(),
        steps: z.array(
          z.object({
            id: z.string(),
            did: z.string(),
            why: z.string().optional(),
            tool: z.string(),
            wrong: z.boolean().optional(),
          })
        ),
        answer: z.string().optional(),
        agentId: z.string().optional(),
      })
      .nullable(),
    error: agentErrorSchema,
  }),
  /** Say the last thing you said again, now that a limit's fire has banked. */
  retryFailure: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Schedule the last thing said to go out again on its own once a limit
   *  lifts. Cancelled by pressing the same line again, or Escape. */
  waitOutFailure: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  stopWaiting: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** Leave this conversation behind and start a fresh one in its place. */
  startOver: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /**
   * Send whoever is working home for the night.
   *
   * The process stops and the lantern goes dark, but the worktree, the
   * branch and the transcript all stay exactly as they were — opening the
   * session again, or simply saying something to it, wakes the same one back
   * up. Distinct from taking a session down, which throws the worktree away.
   */
  rest: fallible({
    input: z.object({ task: z.string() }),
    data: z.void(),
    error: agentErrorSchema,
  }),
  /** What was half-written on this session's line, so a restart does not lose it. */
  draft: procedure({ input: z.object({ task: z.string() }), output: z.string() }),
  setDraft: procedure({
    input: z.object({ task: z.string(), text: z.string() }),
    output: z.void(),
  }),
  /**
   * The mood of every building with somebody in it.
   *
   * The island reads this one and the board reads `work`: from out on the water
   * you can see which houses are lit and which villager is standing at a door,
   * and you only get the detail by going in.
   */
  island: liveModel({
    key: z.void().optional(),
    states: {
      moods: liveState({ data: z.record(z.string(), moodSchema) }),
      glances: liveState({ data: z.record(z.string(), glanceSchema) }),
    },
  }),
});

export type AgentsContract = typeof agentsContract;
