import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { createController, type Controller } from '@emdash/wire/rpc';
import { app, safeStorage } from 'electron';
import {
  DEFAULT_RECIPE,
  jiraContract,
  type JiraBoard,
  type JiraBoardPick,
  type JiraCategory,
  type JiraColumn,
  type JiraError,
  type JiraIssue,
  type JiraLink,
  type JiraSite,
  type JiraTaken,
} from '../shared/jira';
import { adfToMarkdown } from '../shared/jira-adf';
import { boardLinkOf, hostOf } from './jira-link';

/**
 * Jira, spoken to directly over its own REST API with an API token.
 *
 * The token is the one way in that works the same on a work site and a
 * personal one, and the only one that can read a board's own columns. It is
 * kept encrypted with the machine's own keychain-backed storage and never
 * leaves this process: the renderer is only ever told which sites are
 * connected and as whom.
 */

interface StoredSite {
  site: string;
  email: string;
  who: string;
  /** The token, encrypted by safeStorage, as base64. */
  sealed: string;
}

interface Stored {
  sites?: StoredSite[];
  links?: Record<string, JiraLink>;
  taken?: JiraTaken[];
  recipe?: string;
}

const KEY = 'jira';
const FIELDS = 'summary,status,issuetype,priority,parent,assignee,updated';

type Got<T> = { success: true; data: T } | { success: false; error: JiraError };

export function createJiraController(): Controller {
  const store = createJsonFileKeyValueStore({ path: join(userDataDir(), 'jira.json') });
  const stored = async (): Promise<Stored> => {
    const loaded = await store.get(KEY);
    return loaded.success && loaded.data && typeof loaded.data === 'object'
      ? (loaded.data as Stored)
      : {};
  };
  let queue: Promise<unknown> = Promise.resolve();
  const mutate = (patch: (now: Stored) => Stored): Promise<Stored> => {
    const next = queue.then(async () => {
      const patched = patch(await stored());
      await store.set(KEY, patched as unknown as never);
      return patched;
    });
    queue = next.catch(() => undefined);
    return next;
  };

  /** Avatars and icons, kept for as long as the app is open. */
  const images = new Map<string, string>();

  const siteOf = async (site: string): Promise<StoredSite | undefined> =>
    (await stored()).sites?.find((each) => each.site === site);

  const call = async <T>(
    site: string,
    path: string,
    init: { method?: string; body?: unknown; email?: string; token?: string } = {}
  ): Promise<Got<T>> => {
    let email = init.email;
    let token = init.token;
    if (!email || !token) {
      const known = await siteOf(site);
      if (!known) return { success: false, error: { kind: 'not-connected' } };
      email = known.email;
      try {
        token = safeStorage.decryptString(Buffer.from(known.sealed, 'base64'));
      } catch {
        return { success: false, error: { kind: 'not-connected' } };
      }
    }
    let response: Response;
    try {
      response = await fetch(`https://${site}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (cause) {
      return {
        success: false,
        error: {
          kind: 'unreachable',
          said: cause instanceof Error ? cause.message : String(cause),
        },
      };
    }
    const text = await response.text();
    if (!response.ok)
      return { success: false, error: { kind: 'refused', said: why(response, text) } };
    try {
      return { success: true, data: (text ? JSON.parse(text) : {}) as T };
    } catch {
      return {
        success: false,
        error: { kind: 'refused', said: 'Jira answered with something that is not JSON.' },
      };
    }
  };

  /** Every status on the site, for which of Jira's three groups each is in. */
  const categories = async (site: string): Promise<Map<string, JiraCategory>> => {
    const got = await call<{ id: string; statusCategory?: { key?: string } }[]>(
      site,
      '/rest/api/3/status'
    );
    const out = new Map<string, JiraCategory>();
    if (got.success)
      for (const status of got.data) out.set(status.id, categoryOf(status.statusCategory?.key));
    return out;
  };

  const me = async (site: string): Promise<string | undefined> => {
    const got = await call<{ accountId: string }>(site, '/rest/api/3/myself');
    return got.success ? got.data.accountId : undefined;
  };

  const board = async ({ site, key, board: id }: JiraLink): Promise<Got<JiraBoard>> => {
    const project = await call<{ name: string }>(site, `/rest/api/3/project/${enc(key)}`);
    if (!project.success) return project;
    const [kinds, mine] = await Promise.all([categories(site), me(site)]);
    let chosen: RawBoard | undefined;
    if (id !== undefined) {
      const one = await call<RawBoard>(site, `/rest/agile/1.0/board/${id}`);
      if (!one.success) return one;
      chosen = one.data;
    } else {
      const boards = await call<{ values: RawBoard[] }>(
        site,
        `/rest/agile/1.0/board?projectKeyOrId=${enc(key)}`
      );
      const found = boards.success ? boards.data.values : [];
      chosen = found.find((each) => each.type === 'scrum') ?? found[0];
    }
    const url = chosen
      ? `https://${site}/secure/RapidBoard.jspa?rapidView=${chosen.id}`
      : `https://${site}/browse/${key}`;

    if (!chosen) {
      /* No board at all, a service desk queue or a business project: its
         open work, grouped under the statuses it is actually in. */
      const searched = await search(
        site,
        `project = "${key}" AND statusCategory != Done ORDER BY updated DESC`
      );
      if (!searched.success) return searched;
      const issues = searched.data.map((raw) => issueOf(raw, kinds, mine));
      const columns: JiraColumn[] = [];
      for (const issue of issues)
        if (!columns.some((column) => column.statuses.includes(issue.statusId)))
          columns.push({
            name: issue.status,
            statuses: [issue.statusId],
            category: issue.category,
          });
      columns.sort((a, b) => order(a.category) - order(b.category));
      return { success: true, data: { site, key, name: project.data.name, columns, issues, url } };
    }

    const config = await call<{
      columnConfig?: { columns?: { name: string; statuses?: { id: string }[] }[] };
    }>(site, `/rest/agile/1.0/board/${chosen.id}/configuration`);
    if (!config.success) return config;
    const columns: JiraColumn[] = (config.data.columnConfig?.columns ?? [])
      .map((column) => {
        const statuses = (column.statuses ?? []).map((status) => status.id);
        const cats = statuses.map((id) => kinds.get(id) ?? 'indeterminate');
        const category: JiraCategory =
          cats.length && cats.every((c) => c === 'done')
            ? 'done'
            : cats.length && cats.every((c) => c === 'new')
              ? 'new'
              : 'indeterminate';
        return { name: column.name, statuses, category };
      })
      .filter((column) => column.statuses.length);

    let sprint: string | undefined;
    let raws: RawIssue[];
    if (chosen.type === 'scrum') {
      const sprints = await call<{ values: { id: number; name: string }[] }>(
        site,
        `/rest/agile/1.0/board/${chosen.id}/sprint?state=active`
      );
      const running = sprints.success ? sprints.data.values[0] : undefined;
      sprint = running?.name;
      const got = running
        ? await paged(site, `/rest/agile/1.0/sprint/${running.id}/issue?fields=${FIELDS}`)
        : await paged(
            site,
            `/rest/agile/1.0/board/${chosen.id}/issue?fields=${FIELDS}&jql=${enc('statusCategory != Done')}`
          );
      if (!got.success) return got;
      raws = got.data;
    } else {
      const got = await paged(
        site,
        `/rest/agile/1.0/board/${chosen.id}/issue?fields=${FIELDS}&jql=${enc('statusCategory != Done OR updated >= -14d')}`
      );
      if (!got.success) return got;
      raws = got.data;
    }
    const issues = raws.map((raw) => issueOf(raw, kinds, mine));
    return {
      success: true,
      data: {
        site,
        key,
        name: project.data.name,
        board: chosen.name,
        ...(sprint ? { sprint } : {}),
        columns,
        issues,
        url,
      },
    };
  };

  const paged = async (site: string, path: string): Promise<Got<RawIssue[]>> => {
    const out: RawIssue[] = [];
    for (let at = 0; at < 500; ) {
      const got = await call<{ issues: RawIssue[]; total?: number }>(
        site,
        `${path}${path.includes('?') ? '&' : '?'}startAt=${at}&maxResults=100`
      );
      if (!got.success) return got;
      out.push(...got.data.issues);
      at += got.data.issues.length;
      if (!got.data.issues.length || at >= (got.data.total ?? 0)) break;
    }
    return { success: true, data: out };
  };

  const search = async (site: string, jql: string): Promise<Got<RawIssue[]>> => {
    const got = await call<{ issues: RawIssue[] }>(site, '/rest/api/3/search/jql', {
      method: 'POST',
      body: { jql, fields: FIELDS.split(','), maxResults: 100 },
    });
    return got.success ? { success: true, data: got.data.issues } : got;
  };

  /** Projects with tickets of yours on them, the most recently touched first. */
  const yourProjects = async (site: string): Promise<string[]> => {
    const got = await call<{ issues: { fields?: { project?: { key?: string } } }[] }>(
      site,
      '/rest/api/3/search/jql',
      {
        method: 'POST',
        body: {
          jql: 'assignee = currentUser() OR reporter = currentUser() ORDER BY updated DESC',
          fields: ['project'],
          maxResults: 100,
        },
      }
    );
    const keys: string[] = [];
    if (got.success)
      for (const issue of got.data.issues) {
        const key = issue.fields?.project?.key;
        if (key && !keys.includes(key)) keys.push(key);
      }
    return keys;
  };

  /**
   * Boards to pick from on one site. A big site has hundreds, so with nothing
   * written only the ones on your own projects are offered, the ones holding
   * the most tickets of yours first, which is almost always your team's.
   */
  const boardsOn = async (site: string, query: string): Promise<Got<JiraBoardPick[]>> => {
    const yours = await yourProjects(site);
    const found: RawBoard[] = [];
    const add = (boards: RawBoard[]): void => {
      for (const one of boards) if (!found.some((each) => each.id === one.id)) found.push(one);
    };
    if (query) {
      const named = await call<{ values: RawBoard[] }>(
        site,
        `/rest/agile/1.0/board?name=${enc(query)}&maxResults=50`
      );
      if (!named.success) return named;
      add(named.data.values);
      if (/^[A-Za-z][A-Za-z0-9_]{0,9}$/.test(query)) {
        const keyed = await call<{ values: RawBoard[] }>(
          site,
          `/rest/agile/1.0/board?projectKeyOrId=${enc(query.toUpperCase())}&maxResults=50`
        );
        if (keyed.success) add(keyed.data.values);
      }
    } else {
      const lists = await Promise.all(
        yours
          .slice(0, 6)
          .map((key) =>
            call<{ values: RawBoard[] }>(
              site,
              `/rest/agile/1.0/board?projectKeyOrId=${enc(key)}&maxResults=50`
            )
          )
      );
      for (const list of lists) if (list.success) add(list.data.values);
    }
    const picks = found
      .filter((one) => one.location?.projectKey)
      .slice(0, 40)
      .map(
        (one): JiraBoardPick => ({
          site,
          key: one.location?.projectKey ?? '',
          board: one.id,
          name: one.name,
          project: one.location?.projectName ?? one.location?.projectKey ?? '',
          yours: yours.includes(one.location?.projectKey ?? ''),
        })
      );
    /* How many tickets of yours each board actually shows, so your team's
       board comes before every other team's on the same project. */
    const counts = await Promise.all(
      picks.map(async (pick) => {
        if (!pick.yours) return 0;
        const got = await call<{ total?: number }>(
          site,
          `/rest/agile/1.0/board/${pick.board}/issue?maxResults=0&fields=key&jql=${enc('assignee = currentUser()')}`
        );
        return got.success ? (got.data.total ?? 0) : 0;
      })
    );
    const ranked = picks
      .map((pick, at) => ({ pick, mine: counts[at] ?? 0 }))
      .filter(({ mine, pick }) => query || mine > 0 || pick.yours);
    ranked.sort(
      (a, b) =>
        b.mine - a.mine ||
        Number(b.pick.yours) - Number(a.pick.yours) ||
        yours.indexOf(a.pick.key) - yours.indexOf(b.pick.key)
    );
    return { success: true, data: ranked.map(({ pick }) => pick) };
  };

  /** The board a pasted Jira link points at, whichever form of link it is. */
  const linkedBoard = async (
    pasted: NonNullable<ReturnType<typeof boardLinkOf>>
  ): Promise<Got<{ boards: JiraBoardPick[] }>> => {
    const { site } = pasted;
    if (!(await siteOf(site)))
      return {
        success: false,
        error: {
          kind: 'refused',
          said: `${site} is not connected on this Mac yet. connect it in the windmill first.`,
        },
      };
    if (pasted.board === undefined) {
      const got = pasted.key ? await boardsOn(site, pasted.key) : null;
      if (!got) return { success: true, data: { boards: [] } };
      return got.success ? { success: true, data: { boards: got.data } } : got;
    }
    const one = await call<RawBoard>(site, `/rest/agile/1.0/board/${pasted.board}`);
    if (!one.success) return one;
    let key = one.data.location?.projectKey ?? pasted.key;
    let project = one.data.location?.projectName ?? key;
    if (!key) {
      const on = await call<{ values: { key: string; name: string }[] }>(
        site,
        `/rest/agile/1.0/board/${pasted.board}/project`
      );
      key = on.success ? on.data.values[0]?.key : undefined;
      project = on.success ? on.data.values[0]?.name : undefined;
    }
    if (!key)
      return {
        success: false,
        error: { kind: 'refused', said: 'that board does not read from any project Mender can see.' },
      };
    return {
      success: true,
      data: {
        boards: [
          { site, key, board: one.data.id, name: one.data.name, project: project ?? key, yours: true },
        ],
      },
    };
  };

  return createController(jiraContract, {
    status: async () => {
      const now = await stored();
      return {
        sites: (now.sites ?? []).map(({ site, email, who }): JiraSite => ({ site, email, who })),
        recipe: now.recipe ?? DEFAULT_RECIPE,
      };
    },
    connect: async ({ site, email, token }) => {
      const host = hostOf(site);
      const checked = await call<{ displayName?: string; emailAddress?: string }>(
        host,
        '/rest/api/3/myself',
        { email: email.trim(), token: token.trim() }
      );
      if (!checked.success) return checked;
      if (!safeStorage.isEncryptionAvailable())
        return {
          success: false,
          error: { kind: 'refused', said: 'this Mac will not keep a secret for Mender right now.' },
        };
      const sealed = safeStorage.encryptString(token.trim()).toString('base64');
      const who = checked.data.displayName ?? email;
      await mutate((now) => ({
        ...now,
        sites: [
          ...(now.sites ?? []).filter((each) => each.site !== host),
          { site: host, email: email.trim(), who, sealed },
        ],
      }));
      return { success: true, data: { site: host, email: email.trim(), who } };
    },
    forget: async ({ site }) => {
      await mutate((now) => ({
        ...now,
        sites: (now.sites ?? []).filter((each) => each.site !== site),
      }));
      return {};
    },
    setRecipe: async ({ recipe }) => {
      await mutate((now) => ({ ...now, recipe }));
      return {};
    },
    boards: async ({ query }) => {
      const pasted = boardLinkOf(query);
      if (pasted) return linkedBoard(pasted);
      const out: JiraBoardPick[] = [];
      for (const known of (await stored()).sites ?? []) {
        const got = await boardsOn(known.site, query.trim());
        if (!got.success) return got;
        out.push(...got.data);
      }
      return { success: true, data: { boards: out } };
    },
    links: async () => (await stored()).links ?? {},
    setBoard: async ({ project, url }) => {
      const written = url.trim();
      const tie = async (to: JiraLink | null): Promise<void> => {
        await mutate((now) => {
          const links = { ...(now.links ?? {}) };
          if (to) links[project] = to;
          else delete links[project];
          return { ...now, links };
        });
      };
      if (!written) {
        await tie(null);
        return { success: true, data: null };
      }
      const pasted = boardLinkOf(written);
      if (!pasted)
        return {
          success: false,
          error: {
            kind: 'refused',
            said: "that isn't a Jira link. open the board in your browser and copy the address bar.",
          },
        };
      const got = await linkedBoard(pasted);
      if (!got.success) return got;
      const found = got.data.boards[0];
      if (!found)
        return {
          success: false,
          error: { kind: 'refused', said: 'Jira shows no board at that link to this account.' },
        };
      const to: JiraLink = {
        site: found.site,
        key: found.key,
        board: found.board,
        name: found.name,
        url: written,
      };
      await tie(to);
      return { success: true, data: to };
    },
    linkOf: async ({ project }) => (await stored()).links?.[project] ?? null,
    link: async ({ project, to }) => {
      await mutate((now) => {
        const links = { ...(now.links ?? {}) };
        if (to) links[project] = to;
        else delete links[project];
        return { ...now, links };
      });
      return {};
    },
    board,
    ticket: async ({ site, key }) => {
      const got = await call<{
        key: string;
        fields: RawIssue['fields'] & { description?: unknown; reporter?: { displayName?: string } };
      }>(site, `/rest/api/3/issue/${enc(key)}?fields=${FIELDS},description,reporter`);
      if (!got.success) return got;
      const fields = got.data.fields;
      return {
        success: true,
        data: {
          key: got.data.key,
          summary: fields.summary ?? '',
          type: fields.issuetype?.name ?? '',
          status: fields.status?.name ?? '',
          ...(fields.priority?.name ? { priority: fields.priority.name } : {}),
          ...(fields.parent?.fields?.summary ? { epic: fields.parent.fields.summary } : {}),
          ...(fields.assignee?.displayName ? { assignee: fields.assignee.displayName } : {}),
          ...(fields.reporter?.displayName ? { reporter: fields.reporter.displayName } : {}),
          description: adfToMarkdown(fields.description),
          url: `https://${site}/browse/${got.data.key}`,
        },
      };
    },
    move: async ({ site, key, statuses }) => {
      const got = await call<{ transitions: { id: string; to?: { id?: string } }[] }>(
        site,
        `/rest/api/3/issue/${enc(key)}/transitions`
      );
      if (!got.success) return got;
      const way = got.data.transitions.find((each) => statuses.includes(each.to?.id ?? ''));
      if (!way)
        return {
          success: false,
          error: {
            kind: 'refused',
            said: `Jira has no way to move ${key} there from where it is.`,
          },
        };
      const done = await call(site, `/rest/api/3/issue/${enc(key)}/transitions`, {
        method: 'POST',
        body: { transition: { id: way.id } },
      });
      return done.success ? { success: true, data: {} } : done;
    },
    create: async ({ site, project, summary }) => {
      const types = await call<{ issueTypes?: { id: string; name: string; subtask?: boolean }[] }>(
        site,
        `/rest/api/3/project/${enc(project)}`
      );
      if (!types.success) return types;
      const usable = (types.data.issueTypes ?? []).filter((each) => !each.subtask);
      const type =
        usable.find((each) => each.name === 'Task') ??
        usable.find((each) => each.name !== 'Epic') ??
        usable[0];
      if (!type)
        return {
          success: false,
          error: { kind: 'refused', said: 'that project takes no kind of ticket Mender can make.' },
        };
      const made = await call<{ key: string }>(site, '/rest/api/3/issue', {
        method: 'POST',
        body: { fields: { project: { key: project }, summary, issuetype: { id: type.id } } },
      });
      return made.success ? { success: true, data: { key: made.data.key } } : made;
    },
    api: async ({ site, method, path, body }) => {
      if (!path.startsWith('/rest/') || path.includes('..'))
        return { success: false, error: { kind: 'refused', said: 'only Jira\'s own API.' } };
      return call<unknown>(site, path, { method, ...(body === undefined ? {} : { body }) });
    },
    image: async ({ site, url }) => {
      const kept = images.get(url);
      if (kept) return { success: true, data: kept };
      let at: URL;
      try {
        at = new URL(url, `https://${site}`);
      } catch {
        return { success: false, error: { kind: 'refused', said: 'not an address.' } };
      }
      if (at.protocol !== 'https:')
        return { success: false, error: { kind: 'refused', said: 'not an address.' } };
      /* Only the site itself is handed the token; avatars on Atlassian's
         and Gravatar's own servers are public. */
      const own = at.hostname === site;
      const headers: Record<string, string> = {};
      if (own) {
        const known = await siteOf(site);
        if (!known) return { success: false, error: { kind: 'not-connected' } };
        try {
          const token = safeStorage.decryptString(Buffer.from(known.sealed, 'base64'));
          headers.Authorization = `Basic ${Buffer.from(`${known.email}:${token}`).toString('base64')}`;
        } catch {
          return { success: false, error: { kind: 'not-connected' } };
        }
      }
      try {
        const response = await fetch(at.href, { headers, signal: AbortSignal.timeout(20_000) });
        if (!response.ok)
          return { success: false, error: { kind: 'refused', said: `Jira said ${response.status}.` } };
        const type = response.headers.get('content-type')?.split(';')[0] ?? 'image/png';
        const bytes = Buffer.from(await response.arrayBuffer());
        const data = `data:${type};base64,${bytes.toString('base64')}`;
        if (bytes.length < 400_000) {
          images.set(url, data);
          if (images.size > 800) images.delete(images.keys().next().value as string);
        }
        return { success: true, data };
      } catch (cause) {
        return {
          success: false,
          error: { kind: 'unreachable', said: cause instanceof Error ? cause.message : String(cause) },
        };
      }
    },
    take: async (taken) => {
      await mutate((now) => ({
        ...now,
        taken: [...(now.taken ?? []).filter((each) => each.task !== taken.task), taken].slice(-500),
      }));
      return {};
    },
    taken: async () => (await stored()).taken ?? [],
  });
}

interface RawBoard {
  id: number;
  name: string;
  type: string;
  location?: { projectKey?: string; projectName?: string };
}

interface RawIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { id?: string; name?: string; statusCategory?: { key?: string } };
    issuetype?: { name?: string };
    priority?: { name?: string };
    parent?: { fields?: { summary?: string } };
    assignee?: { accountId?: string; displayName?: string };
    updated?: string;
  };
}

function issueOf(
  raw: RawIssue,
  kinds: Map<string, JiraCategory>,
  mine: string | undefined
): JiraIssue {
  const fields = raw.fields;
  const statusId = fields.status?.id ?? '';
  return {
    key: raw.key,
    summary: fields.summary ?? '',
    type: fields.issuetype?.name ?? '',
    status: fields.status?.name ?? '',
    statusId,
    category: kinds.get(statusId) ?? categoryOf(fields.status?.statusCategory?.key),
    ...(fields.priority?.name ? { priority: fields.priority.name } : {}),
    ...(fields.parent?.fields?.summary ? { epic: fields.parent.fields.summary } : {}),
    ...(fields.assignee?.displayName ? { assignee: fields.assignee.displayName } : {}),
    mine: Boolean(mine && fields.assignee?.accountId === mine),
    updated: fields.updated ?? '',
  };
}

function categoryOf(key: string | undefined): JiraCategory {
  return key === 'new' ? 'new' : key === 'done' ? 'done' : 'indeterminate';
}

function order(category: JiraCategory): number {
  return category === 'new' ? 0 : category === 'indeterminate' ? 1 : 2;
}

function why(response: Response, text: string): string {
  try {
    const body = JSON.parse(text) as {
      errorMessages?: string[];
      errors?: Record<string, string>;
      message?: string;
    };
    const said = [...(body.errorMessages ?? []), ...Object.values(body.errors ?? {}), body.message]
      .filter(Boolean)
      .join(' ');
    if (said) return said;
  } catch {
    /* not JSON, so say the status */
  }
  if (response.status === 401) return 'that email and token were not accepted.';
  if (response.status === 403) return 'that account is not allowed to do this.';
  if (response.status === 404) return 'Jira has nothing there.';
  return `Jira said ${response.status}.`;
}

function enc(text: string): string {
  return encodeURIComponent(text);
}

function userDataDir(): string {
  return process.env.MENDER_DATA_DIR ?? app.getPath('userData');
}
