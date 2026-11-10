import { log } from '@emdash/shared/logger';
import { briefOf, type JiraCategory } from '../shared/jira';
import { adfToMarkdown } from '../shared/jira-adf';
import type { Agents } from './agents';
import type { JiraHands } from './jira';
import type { Task, Tasks } from './tasks';

/**
 * Launching a ticket: the one thing the Jira window's launch button and a
 * lead's launch tool both do, written once.
 *
 * Read the ticket, move it out of to-do, cut a workspace named after it, say
 * the windmill's recipe to a new session standing in it, and remember which
 * ticket that session took. What differs is only who asked and what happens
 * to the session afterwards, which the caller says with `onBegun`.
 */

const enc = encodeURIComponent;

const categoryOf = (key: string | undefined): JiraCategory =>
  key === 'new' ? 'new' : key === 'done' ? 'done' : 'indeterminate';

export interface TicketLook {
  summary: string;
  description: string;
  category: JiraCategory;
}

export type Looked = { ok: true; ticket: TicketLook } | { ok: false; said: string };

export interface Launched {
  key: string;
  ok: boolean;
  text: string;
  task?: string;
}

export interface JiraLaunch {
  look(site: string, key: string): Promise<Looked>;
  start(site: string, key: string): Promise<{ moved: boolean; to?: string; said?: string }>;
  /** Which site a project's tickets live on: its board's, else the only one connected. */
  siteFor(project: string, asked?: string): Promise<{ site: string } | { said: string }>;
  /**
   * One ticket. `onBegun` runs once the session exists and before anything is
   * said to it, which is when a caller makes it crew or records what it needs
   * to know about it.
   */
  one(
    project: string,
    site: string,
    key: string,
    onBegun?: (task: Task) => Promise<void>
  ): Promise<Launched>;
  many(
    project: string,
    site: string,
    keys: string[],
    onBegun?: (task: Task, key: string) => Promise<void>,
    progress?: (done: Launched, n: number, of: number) => void
  ): Promise<Launched[]>;
}

export function createJiraLaunch(hands: JiraHands, tasks: Tasks, agents: Agents): JiraLaunch {
  const look: JiraLaunch['look'] = async (site, key) => {
    const got = await hands.api(
      site,
      'GET',
      `/rest/api/3/issue/${enc(key)}?fields=summary,status,description`
    );
    if (!got.success) {
      return { ok: false, said: 'said' in got.error ? got.error.said : got.error.kind };
    }
    const issue = got.data as {
      fields?: {
        summary?: string;
        description?: unknown;
        status?: { statusCategory?: { key?: string } };
      };
    };
    return {
      ok: true,
      ticket: {
        summary: issue.fields?.summary ?? '',
        description: adfToMarkdown(issue.fields?.description),
        category: categoryOf(issue.fields?.status?.statusCategory?.key),
      },
    };
  };

  const start: JiraLaunch['start'] = async (site, key) => {
    const got = await hands.api(site, 'GET', `/rest/api/3/issue/${enc(key)}/transitions`);
    if (!got.success)
      return { moved: false, said: 'said' in got.error ? got.error.said : got.error.kind };
    const step = (
      got.data as {
        transitions?: {
          id: string;
          to?: { name?: string; statusCategory?: { key?: string } };
        }[];
      }
    ).transitions?.find(
      (one) =>
        one.to?.statusCategory?.key === 'indeterminate' && !/block|review/i.test(one.to?.name ?? '')
    );
    if (!step) return { moved: false };
    const done = await hands.api(site, 'POST', `/rest/api/3/issue/${enc(key)}/transitions`, {
      transition: { id: step.id },
    });
    return done.success
      ? { moved: true, ...(step.to?.name ? { to: step.to.name } : {}) }
      : { moved: false, said: 'said' in done.error ? done.error.said : done.error.kind };
  };

  const siteFor: JiraLaunch['siteFor'] = async (project, asked) => {
    const sites = await hands.sites();
    if (asked) {
      return sites.includes(asked)
        ? { site: asked }
        : {
            said: `this machine is not connected to ${asked}; it is connected to ${sites.join(', ') || 'no Jira site'}.`,
          };
    }
    const linked = await hands.linkOf(project);
    if (linked && sites.includes(linked.site)) return { site: linked.site };
    if (sites.length === 1) return { site: sites[0]! };
    return {
      said: sites.length
        ? `this project has no Jira board linked and ${sites.length} sites are connected (${sites.join(', ')}); say which with site.`
        : 'no Jira site is connected on this machine; connect one in the windmill first.',
    };
  };

  const one: JiraLaunch['one'] = async (project, site, key, onBegun) => {
    const looked = await look(site, key);
    if (!looked.ok) {
      log.warn('launch: ticket would not read', { area: 'jira-launch', key, said: looked.said });
      return { key, ok: false, text: `Jira would not hand ${key} over: ${looked.said}` };
    }
    const { ticket } = looked;
    let moved = '';
    if (ticket.category === 'new') {
      const out = await start(site, key);
      moved = out.moved
        ? `moved it to ${out.to ?? 'in progress'}`
        : out.said
          ? `could not move it out of to-do (${out.said})`
          : 'Jira has no way to move it out of to-do from where it is';
    } else {
      moved = 'it was already under way, so it was not moved';
    }
    const made = await tasks.begin(
      project,
      `${key} ${ticket.summary}`.slice(0, 60),
      null,
      undefined,
      undefined,
      true
    );
    if (!made.success) {
      log.warn('launch: begin failed', { area: 'jira-launch', key, error: made.error });
      return {
        key,
        ok: false,
        text: `${key}: could not cut its workspace (${JSON.stringify(made.error)}); ${moved}.`,
      };
    }
    const task = made.data;
    await hands.take({ task: task.id, site, key });
    if (onBegun) await onBegun(task);
    const brief = briefOf(await hands.recipe(), {
      key,
      summary: ticket.summary,
      url: `https://${site}/browse/${key}`,
      description: ticket.description,
    });
    const told = await agents.tell(task.id, brief);
    if (!told.success) {
      log.warn('launch: first word would not go', {
        area: 'jira-launch',
        key,
        task: task.id,
        error: told.error,
      });
      return {
        key,
        ok: false,
        task: task.id,
        text: `${key}: its workspace is cut but it would not take the brief (${JSON.stringify(told.error)}); ${moved}.`,
      };
    }
    log.info('launch: launched', { area: 'jira-launch', key, task: task.id, moved });
    return {
      key,
      ok: true,
      task: task.id,
      text: `${key} "${ticket.summary}" launched in its own workspace [${task.id}]; ${moved}.`,
    };
  };

  const many: JiraLaunch['many'] = async (project, site, keys, onBegun, progress) => {
    const out: Launched[] = [];
    /* One after another, so no two worktrees are cut on top of each other. */
    for (const key of keys) {
      const done = await one(project, site, key, onBegun && ((task) => onBegun(task, key)));
      out.push(done);
      progress?.(done, out.length, keys.length);
    }
    return out;
  };

  return { look, start, siteFor, one, many };
}
