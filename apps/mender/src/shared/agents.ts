import { defineContract, fallible, liveModel, liveState, uploadFile } from '@emdash/wire/rpc';
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

/** A villager standing at the door with a question, and the ways to answer it. */
export const askSchema = z.object({
  requestId: z.string(),
  text: z.string(),
  options: z.array(z.object({ optionId: z.string(), name: z.string() })),
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
});
export type Noted = z.infer<typeof notedSchema>;

/** Something it thought or said back, which is what rises off the fire. */
export const musedSchema = z.object({
  id: z.string(),
  said: z.string(),
  at: z.number(),
  /** Reasoning rather than an answer, which reads differently. */
  quiet: z.boolean().optional(),
  /** Still going, and since when. */
  since: z.number().optional(),
  /** Which turn of the conversation it belongs to, so the board can tell an
      answer to what you just said from the one before it. */
  turn: z.number().int().optional(),
});
export type Mused = z.infer<typeof musedSchema>;

/** One thing it did, which is a step in the yard's right-hand column. */
export const deedSchema = z.object({
  id: z.string(),
  did: z.string(),
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
  wrong: z.boolean().optional(),
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
  /** How many turns have been taken in here. */
  turns: z.number().int(),
  /** When the first thing was said, so the board can say how long this has run. */
  began: z.number().nullable(),
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
  tools: z.array(toolSchema),
  knacks: z.array(knackSchema),
  orders: z.array(orderSchema),
  /** True once the session has started and the agent has said what it offers. */
  awake: z.boolean(),
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
      what: z.enum(['hand', 'model', 'mode', 'effort']),
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
  tool: fallible({
    input: z.object({ task: z.string(), name: z.string(), on: z.boolean() }),
    data: z.void(),
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
  /** Say something to whoever is in there, moving somebody in if nobody is. */
  tell: fallible({
    input: z.object({
      task: z.string(),
      text: z.string(),
      /** Whatever was picked up off the wood, handed over with it. */
      carrying: z.array(carriedSchema).optional(),
    }),
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
  /** Answer the question it came to the door with. */
  answer: fallible({
    input: z.object({ task: z.string(), requestId: z.string(), optionId: z.string() }),
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
    },
  }),
});

export type AgentsContract = typeof agentsContract;
