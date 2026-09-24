import { defineContract, liveModel, liveState, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Things you say often enough to keep.
 *
 * Emdash calls this the prompt library and keeps it behind a settings page.
 * Here it is part of the slash: what you keep comes back under it, and picking
 * one writes it on the line for you to finish or send. It is the village's own
 * list, on this machine, and no agent ever hears about the list itself.
 */
export const promptSchema = z.object({
  id: z.string(),
  /** What it is called under the slash. */
  title: z.string(),
  /** What it writes on the line. */
  prompt: z.string(),
});

export type Prompt = z.infer<typeof promptSchema>;

export const promptsContract = defineContract({
  all: liveModel({
    key: z.void().optional(),
    states: { list: liveState({ data: z.array(promptSchema) }) },
  }),
  /** Keep something, called whatever its first few words are. */
  keep: procedure({ input: z.object({ prompt: z.string() }), output: promptSchema }),
  /** Stop keeping one. */
  forget: procedure({ input: z.object({ id: z.string() }), output: z.void() }),
});
