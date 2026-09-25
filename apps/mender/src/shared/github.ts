import { defineContract, fallible, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Who the village is, to GitHub — a machine fact, not a project one. Mender
 * keeps no account registry of its own: whatever `gh` on this machine is
 * signed in as is who every project's pull requests, clones and repository
 * creations act as. See MENDER.md.
 */
export const githubStatusSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('signed-in'), login: z.string(), host: z.string() }),
  z.object({ kind: z.literal('signed-out') }),
  /** `gh` itself is not on this machine at all. */
  z.object({ kind: z.literal('no-gh') }),
]);

export type GitHubStatus = z.infer<typeof githubStatusSchema>;

export const signInErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-gh') }),
  z.object({ kind: z.literal('refused'), said: z.string() }),
]);

export const githubContract = defineContract({
  status: procedure({ input: z.object({}), output: githubStatusSchema }),
  /** Starts the device flow and resolves once the code and URL are known;
      the sign-in itself keeps running in the background after. */
  signIn: fallible({
    input: z.object({}),
    data: z.object({ code: z.string(), url: z.string() }),
    error: signInErrorSchema,
  }),
});

export type GithubContract = typeof githubContract;
