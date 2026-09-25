import { defineContract, fallible, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  /** Which of his thirteen it stands on. */
  district: z.string(),
  foundedAt: z.string(),
  /** Where its own picture came from. Without one it is the rack's prop. */
  picture: z.string().optional(),
  /** That picture, as something the page can draw. */
  icon: z.string().optional(),
  /** Who a session's commits go out as, when this project says otherwise. */
  gitName: z.string().optional(),
  gitEmail: z.string().optional(),
  /** Whether its folder is actually still there, checked fresh on every
      `list` and never stored — a folder moved or deleted outside the
      village shows up here without anything writing it down. */
  available: z.boolean().optional(),
});

export type Project = z.infer<typeof projectSchema>;

/** How a checkout is meant to arrive: already on disk, cloned, or made fresh. */
export const foundFromSchema = z.discriminatedUnion('kind', [
  /** The native folder picker. */
  z.object({ kind: z.literal('folder') }),
  z.object({ kind: z.literal('clone'), url: z.string() }),
  z.object({ kind: z.literal('create'), name: z.string(), private: z.boolean() }),
]);

export type FoundFrom = z.infer<typeof foundFromSchema>;

export const foundErrorSchema = z.discriminatedUnion('kind', [
  /** The folder picker was dismissed. Not a failure, just nothing to do. */
  z.object({ kind: z.literal('cancelled') }),
  z.object({ kind: z.literal('not-a-repository'), path: z.string() }),
  z.object({ kind: z.literal('already-founded'), path: z.string() }),
  /** Eleven districts, and every one of them taken. */
  z.object({ kind: z.literal('island-full') }),
  z.object({ kind: z.literal('clone-failed'), said: z.string() }),
  z.object({ kind: z.literal('create-failed'), said: z.string() }),
]);

/** Pointing a project at a folder actually there, after its own has gone
    missing — the folder picker, once more, but onto an existing project
    rather than a new one. */
export const relinkErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('cancelled') }),
  z.object({ kind: z.literal('not-a-repository'), path: z.string() }),
  z.object({ kind: z.literal('no-such-project') }),
]);

export type RelinkError = z.infer<typeof relinkErrorSchema>;

export const pictureSchema = z.object({
  path: z.string(),
  src: z.string(),
  wide: z.number(),
  tall: z.number(),
});

export type Picture = z.infer<typeof pictureSchema>;

export const pictureFromSchema = z.discriminatedUnion('kind', [
  /** One of the pictures in its own checkout. */
  z.object({ kind: z.literal('in'), path: z.string() }),
  /** One from anywhere on the machine, asked for. */
  z.object({ kind: z.literal('own') }),
  /** Back to the rack's own prop. */
  z.object({ kind: z.literal('none') }),
]);

export type PictureFrom = z.infer<typeof pictureFromSchema>;

export const pictureErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('cancelled') }),
  z.object({ kind: z.literal('unreadable'), path: z.string() }),
  z.object({ kind: z.literal('no-such-project') }),
]);

export const carryingSchema = z.object({
  base: z.string().nullable(),
  carries: z.array(z.object({ path: z.string(), on: z.boolean(), folder: z.boolean() })),
});

export type Carrying = z.infer<typeof carryingSchema>;

/** What runs at each point in a worktree's life. Blank means nothing does. */
export const scriptsSchema = z.object({
  prepare: z.string(),
  setup: z.string(),
  run: z.string(),
  teardown: z.string(),
});

export type Scripts = z.infer<typeof scriptsSchema>;

export const scriptKindSchema = z.enum(['prepare', 'setup', 'run', 'teardown']);

export type ScriptKind = z.infer<typeof scriptKindSchema>;

export const projectsContract = defineContract({
  list: procedure({ input: z.object({}), output: z.array(projectSchema) }),
  /** Put a district on a checkout: pick a folder, clone one, or make one new. */
  found: fallible({
    input: z.object({ from: foundFromSchema.optional() }),
    data: projectSchema,
    error: foundErrorSchema,
  }),
  abandon: procedure({ input: z.object({ id: z.string() }), output: z.array(projectSchema) }),
  rename: procedure({
    input: z.object({ id: z.string(), name: z.string() }),
    output: z.array(projectSchema),
  }),
  pictures: procedure({
    input: z.object({ id: z.string(), many: z.number() }),
    output: z.object({ pictures: z.array(pictureSchema), more: z.number() }),
  }),
  picture: fallible({
    input: z.object({ id: z.string(), from: pictureFromSchema }),
    data: projectSchema,
    error: pictureErrorSchema,
  }),
  carrying: procedure({ input: z.object({ id: z.string() }), output: carryingSchema }),
  carry: procedure({
    input: z.object({ id: z.string(), path: z.string(), on: z.boolean() }),
    output: carryingSchema,
  }),
  /** Set or clear who this project's sessions commit as. Blank clears it. */
  identity: procedure({
    input: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    output: z.array(projectSchema),
  }),
  /** What runs when a worktree is cut: prepare, setup, run, teardown. */
  scripts: procedure({ input: z.object({ id: z.string() }), output: scriptsSchema }),
  /** Blank clears that script, back to nothing running for it. */
  script: procedure({
    input: z.object({ id: z.string(), which: scriptKindSchema, value: z.string() }),
    output: scriptsSchema,
  }),
  /** Points a project whose own folder has gone missing at one that is
      actually there — the native folder picker, same as founding. */
  relink: fallible({
    input: z.object({ id: z.string() }),
    data: projectSchema,
    error: relinkErrorSchema,
  }),
});

export type ProjectsContract = typeof projectsContract;
