import { defineContract, fallible, procedure } from '@emdash/wire/rpc';
import { z } from 'zod';

/**
 * Jira, as the village sees it.
 *
 * One machine can be signed in to several Jira sites at once, a work one and a
 * personal one, each with its own address, email and API token. A project in
 * the village is tied to one Jira project on one of them, and its board is that
 * project's own board, read fresh: its own columns, in its own order, under its
 * own names. Nothing here decides what a column is called or how many there
 * are.
 */

export const jiraSiteSchema = z.object({
  /** The bare host, `something.atlassian.net`. */
  site: z.string(),
  email: z.string(),
  /** Whoever the token says it is, read when it was connected. */
  who: z.string(),
});
export type JiraSite = z.infer<typeof jiraSiteSchema>;

export const jiraLinkSchema = z.object({
  site: z.string(),
  /** The Jira project's key. */
  key: z.string(),
  /** Which of that project's boards, since a big project has one per team. */
  board: z.number().optional(),
  /** The board's own name, kept so it can be said without asking Jira. */
  name: z.string().optional(),
  /** The link it was set from, when it was pasted. */
  url: z.string().optional(),
});
export type JiraLink = z.infer<typeof jiraLinkSchema>;

/** A board somebody could tie a project to. */
export const jiraBoardPickSchema = z.object({
  site: z.string(),
  key: z.string(),
  board: z.number(),
  /** The board's own name. */
  name: z.string(),
  /** The project it reads from. */
  project: z.string(),
  /** Whether tickets of yours are on its project. */
  yours: z.boolean(),
});
export type JiraBoardPick = z.infer<typeof jiraBoardPickSchema>;

/** Where a status sits in Jira's own three-way split, whatever it is called. */
export const jiraCategorySchema = z.enum(['new', 'indeterminate', 'done']);
export type JiraCategory = z.infer<typeof jiraCategorySchema>;

export const jiraColumnSchema = z.object({
  name: z.string(),
  statuses: z.array(z.string()),
  category: jiraCategorySchema,
});
export type JiraColumn = z.infer<typeof jiraColumnSchema>;

export const jiraIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  type: z.string(),
  status: z.string(),
  statusId: z.string(),
  category: jiraCategorySchema,
  priority: z.string().optional(),
  /** The epic or other parent it hangs off, by name. */
  epic: z.string().optional(),
  assignee: z.string().optional(),
  mine: z.boolean(),
  updated: z.string(),
});
export type JiraIssue = z.infer<typeof jiraIssueSchema>;

export const jiraBoardSchema = z.object({
  site: z.string(),
  key: z.string(),
  /** The project's own name. */
  name: z.string(),
  /** The board's own name, when it is one board of several. */
  board: z.string().optional(),
  /** The running sprint, on a board that has sprints. */
  sprint: z.string().optional(),
  columns: z.array(jiraColumnSchema),
  issues: z.array(jiraIssueSchema),
  url: z.string(),
});
export type JiraBoard = z.infer<typeof jiraBoardSchema>;

export const jiraTicketSchema = z.object({
  key: z.string(),
  summary: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  epic: z.string().optional(),
  assignee: z.string().optional(),
  reporter: z.string().optional(),
  /** What it says, as markdown, which is also what an agent is handed. */
  description: z.string(),
  url: z.string(),
});
export type JiraTicket = z.infer<typeof jiraTicketSchema>;

export const jiraTakenSchema = z.object({ task: z.string(), site: z.string(), key: z.string() });
export type JiraTaken = z.infer<typeof jiraTakenSchema>;

export const jiraErrorSchema = z.discriminatedUnion('kind', [
  /** Nothing on this machine is connected to that site. */
  z.object({ kind: z.literal('not-connected') }),
  /** Jira answered, and the answer was no. */
  z.object({ kind: z.literal('refused'), said: z.string() }),
  /** Jira could not be reached at all. */
  z.object({ kind: z.literal('unreachable'), said: z.string() }),
]);
export type JiraError = z.infer<typeof jiraErrorSchema>;

export const DEFAULT_RECIPE = [
  'Work on Jira ticket {key}: {summary}',
  '',
  '{url}',
  '',
  '{description}',
].join('\n');

export const jiraContract = defineContract({
  status: procedure({
    input: z.object({}),
    output: z.object({ sites: z.array(jiraSiteSchema), recipe: z.string() }),
  }),
  /** Checks the token against the site before keeping anything. */
  connect: fallible({
    input: z.object({ site: z.string(), email: z.string(), token: z.string() }),
    data: jiraSiteSchema,
    error: jiraErrorSchema,
  }),
  forget: procedure({ input: z.object({ site: z.string() }), output: z.object({}) }),
  setRecipe: procedure({ input: z.object({ recipe: z.string() }), output: z.object({}) }),
  /**
   * Boards to tie a district to: with nothing written, the ones on projects
   * where tickets of yours are; otherwise every board whose name, project
   * name or key has what was written in it.
   */
  boards: fallible({
    input: z.object({ query: z.string() }),
    data: z.object({ boards: z.array(jiraBoardPickSchema) }),
    error: jiraErrorSchema,
  }),
  /** Every project's board, keyed by project. */
  links: procedure({ input: z.object({}), output: z.record(z.string(), jiraLinkSchema) }),
  /** Ties a project to the board a pasted link is to; an empty link unties it. */
  setBoard: fallible({
    input: z.object({ project: z.string(), url: z.string() }),
    data: jiraLinkSchema.nullable(),
    error: jiraErrorSchema,
  }),
  linkOf: procedure({
    input: z.object({ project: z.string() }),
    output: jiraLinkSchema.nullable(),
  }),
  link: procedure({
    input: z.object({ project: z.string(), to: jiraLinkSchema.nullable() }),
    output: z.object({}),
  }),
  board: fallible({ input: jiraLinkSchema, data: jiraBoardSchema, error: jiraErrorSchema }),
  ticket: fallible({ input: z.object({ site: z.string(), key: z.string() }), data: jiraTicketSchema, error: jiraErrorSchema }),
  /** Moves it into whichever of these statuses Jira will let it reach. */
  move: fallible({
    input: z.object({ site: z.string(), key: z.string(), statuses: z.array(z.string()) }),
    data: z.object({}),
    error: jiraErrorSchema,
  }),
  create: fallible({
    input: z.object({ site: z.string(), project: z.string(), summary: z.string() }),
    data: z.object({ key: z.string() }),
    error: jiraErrorSchema,
  }),
  /** Which session took which ticket on, so its card can carry its light. */
  take: procedure({ input: jiraTakenSchema, output: z.object({}) }),
  taken: procedure({ input: z.object({}), output: z.array(jiraTakenSchema) }),
});

export type JiraContract = typeof jiraContract;
