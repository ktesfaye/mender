/**
 * Jira's own data, read the way Jira's own board reads it.
 *
 * Everything goes over the one pipe the main process keeps open to the site
 * with its token, so nothing here ever holds a secret. What comes back is
 * shaped only as far as the views need: the board's columns in its own order,
 * the running sprint, its quick filters, and every card with what Jira itself
 * puts on a card.
 */

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Wire {
  api(site: string, method: Method, path: string, body?: unknown): Promise<unknown>;
  image(site: string, url: string): Promise<string | null>;
}

export class JiraFailed extends Error {}

export interface Person {
  id: string;
  name: string;
  avatar?: string;
}

export interface Parent {
  key: string;
  summary: string;
  color: string;
}

export interface Card {
  id: string;
  key: string;
  summary: string;
  type: { name: string; icon?: string };
  priority?: { name: string; icon?: string };
  assignee?: Person;
  parent?: Parent;
  labels: string[];
  flagged: boolean;
  points?: number;
  due?: string;
  subtasks: { key: string; done: boolean }[];
  versions: string[];
  updated?: string;
  statusId: string;
  status: string;
  category: Category;
}

export type Category = 'new' | 'indeterminate' | 'done';

export interface Column {
  name: string;
  statuses: string[];
  category: Category;
  max?: number;
}

export interface Board {
  site: string;
  id: number;
  name: string;
  kind: string;
  projectKey: string;
  projectName: string;
  projectAvatar?: string;
  columns: Column[];
  cards: Card[];
  sprint?: { id: number; name: string; end?: string; goal?: string };
  quickFilters: { id: number; name: string; jql: string }[];
  points?: string;
  rank?: string;
  me?: string;
  self?: Person;
}

interface RawUser {
  accountId?: string;
  displayName?: string;
  avatarUrls?: Record<string, string>;
}

export interface RawIssue {
  id: string;
  key: string;
  fields: Record<string, unknown> & {
    summary?: string;
    status?: { id?: string; name?: string; statusCategory?: { key?: string } };
    issuetype?: { name?: string; iconUrl?: string; subtask?: boolean; hierarchyLevel?: number };
    priority?: { name?: string; iconUrl?: string };
    parent?: { key?: string; fields?: { summary?: string } };
    assignee?: RawUser | null;
    labels?: string[];
  };
}

export const personOf = (raw: RawUser | null | undefined): Person | undefined =>
  raw?.accountId
    ? {
        id: raw.accountId,
        name: raw.displayName ?? 'Someone',
        ...(raw.avatarUrls?.['48x48'] ? { avatar: raw.avatarUrls['48x48'] } : {}),
      }
    : undefined;

export const categoryOf = (key: string | undefined): Category =>
  key === 'new' ? 'new' : key === 'done' ? 'done' : 'indeterminate';

const enc = encodeURIComponent;

/** Jira's own epic colours, in its dark theme. */
const COLORS: Record<string, [string, string]> = {
  purple: ['#352c63', '#b8acf6'],
  dark_purple: ['#2b273f', '#9f8fef'],
  blue: ['#09326c', '#85b8ff'],
  dark_blue: ['#092957', '#579dff'],
  teal: ['#1d474c', '#9dd9ee'],
  dark_teal: ['#164555', '#6cc3e0'],
  green: ['#164b35', '#7ee2b8'],
  dark_green: ['#1c3329', '#4bce97'],
  yellow: ['#533f04', '#f8e6a0'],
  dark_yellow: ['#3f3102', '#e2b203'],
  orange: ['#5f3811', '#fec195'],
  dark_orange: ['#4a2b0f', '#faa53d'],
  red: ['#5d1f1a', '#fd9891'],
  dark_red: ['#42221f', '#f87168'],
  grey: ['#454f59', '#dee4ea'],
  dark_grey: ['#2c333a', '#b6c2cf'],
};
const ROTATION = ['purple', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'dark_purple'];

/** An epic's colour as the tape it is on a note: Jira's hue, warmed to sit on parchment. */
const TAPES: Record<string, string> = {
  purple: '#8f7ee7',
  dark_purple: '#7a5fc4',
  blue: '#5c8fe0',
  dark_blue: '#3d6fd1',
  teal: '#4fb2b8',
  dark_teal: '#3a9198',
  green: '#5fae7c',
  dark_green: '#3f8a5c',
  yellow: '#c9a227',
  dark_yellow: '#a8851a',
  orange: '#e0894a',
  dark_orange: '#c8673a',
  red: '#d4574a',
  dark_red: '#a8443a',
  grey: '#9a9a9a',
  dark_grey: '#6e6e6e',
};
const TAPE_ROTATION = ['purple', 'blue', 'teal', 'green', 'orange', 'dark_purple', 'red', 'yellow'];

export function tapeOf(name: string | undefined, key: string): string {
  const named = name ? TAPES[name.replace(/^color_/, '')] : undefined;
  if (named) return named;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAPES[TAPE_ROTATION[h % TAPE_ROTATION.length]!]!;
}

/** Epics are what cards hang from, not cards; subtasks ride on their parent's note. */
export const isEpic = (raw: RawIssue): boolean =>
  raw.fields.issuetype?.name === 'Epic' || (raw.fields.issuetype?.hierarchyLevel ?? 0) >= 1;

export function epicColor(name: string | undefined, key: string): [string, string] {
  const named = name ? COLORS[name.replace(/^color_/, '')] : undefined;
  if (named) return named;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[ROTATION[h % ROTATION.length]!]!;
}

const pictures = new Map<string, Promise<string | null>>();

export function makeJira(wire: Wire, site: string) {
  const get = <T>(path: string) => wire.api(site, 'GET', path) as Promise<T>;
  const send = <T>(method: Method, path: string, body?: unknown) =>
    wire.api(site, method, path, body) as Promise<T>;

  const fieldIds = new Map<string, string>();
  const fields = async (): Promise<Map<string, string>> => {
    if (fieldIds.size) return fieldIds;
    const all = await get<{ id: string; name: string; schema?: { custom?: string } }[]>(
      '/rest/api/3/field'
    );
    for (const one of all) {
      fieldIds.set(one.name.toLowerCase(), one.id);
      if (one.schema?.custom?.endsWith(':gh-sprint')) fieldIds.set('#sprint', one.id);
      if (one.schema?.custom?.endsWith(':jsw-issue-color')) fieldIds.set('#color', one.id);
    }
    return fieldIds;
  };

  const issuesOf = async (path: string, want: string[]): Promise<RawIssue[]> => {
    const out: RawIssue[] = [];
    for (let at = 0; at < 1000; ) {
      const got = await get<{ issues: RawIssue[]; total?: number; isLast?: boolean }>(
        `${path}${path.includes('?') ? '&' : '?'}fields=${want.join(',')}&startAt=${at}&maxResults=100`
      );
      out.push(...got.issues);
      at += got.issues.length;
      if (!got.issues.length || got.isLast || at >= (got.total ?? 0)) break;
    }
    return out;
  };

  /** Cards as Jira draws them, with the parents' own colours, which no card carries. */
  const toCards = async (
    raws: RawIssue[],
    kinds: Map<string, Category>,
    points: string | undefined,
    flaggedId: string | undefined,
    color: string | undefined
  ): Promise<Card[]> => {
      const parentKeys = [...new Set(raws.map((raw) => raw.fields.parent?.key).filter(Boolean))] as string[];
      const colors = new Map<string, string>();
      if (color && parentKeys.length) {
        const got = await send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
          jql: `key in (${parentKeys.join(',')})`,
          fields: [color],
          maxResults: 100,
        }).catch(() => ({ issues: [] as RawIssue[] }));
        for (const one of got.issues) {
          const value = one.fields[color];
          if (typeof value === 'string') colors.set(one.key, value);
        }
      }

      return raws.map((raw): Card => {
        const f = raw.fields;
        const statusId = f.status?.id ?? '';
        const parent = f.parent?.key
          ? {
              key: f.parent.key,
              summary: f.parent.fields?.summary ?? f.parent.key,
              color: colors.get(f.parent.key) ?? '',
            }
          : undefined;
        const pts = points ? f[points] : undefined;
        const assignee = personOf(f.assignee);
        const subs = (f.subtasks as RawIssue[] | undefined) ?? [];
        const versions = (f.fixVersions as { name?: string }[] | undefined) ?? [];
        return {
          id: raw.id,
          key: raw.key,
          summary: f.summary ?? '',
          type: { name: f.issuetype?.name ?? '', ...(f.issuetype?.iconUrl ? { icon: f.issuetype.iconUrl } : {}) },
          ...(f.priority?.name
            ? { priority: { name: f.priority.name, ...(f.priority.iconUrl ? { icon: f.priority.iconUrl } : {}) } }
            : {}),
          ...(assignee ? { assignee } : {}),
          ...(parent ? { parent } : {}),
          labels: f.labels ?? [],
          flagged: Boolean(flaggedId && Array.isArray(f[flaggedId]) && (f[flaggedId] as unknown[]).length),
          ...(typeof pts === 'number' ? { points: pts } : {}),
          ...(typeof f.duedate === 'string' ? { due: f.duedate } : {}),
          ...(typeof f.updated === 'string' ? { updated: f.updated } : {}),
          subtasks: subs.map((one) => ({
            key: one.key,
            done: one.fields.status?.statusCategory?.key === 'done',
          })),
          versions: versions.map((one) => one.name ?? '').filter(Boolean),
          statusId,
          status: f.status?.name ?? '',
          category: kinds.get(statusId) ?? categoryOf(f.status?.statusCategory?.key),
        };
      });
  };

  return {
    site,
    get,
    send,
    fields,

    async board(id: number, quick: number[] = [], jql = ''): Promise<Board> {
      const [info, config, ids, me] = await Promise.all([
        get<{
          id: number;
          name: string;
          type: string;
          location?: { projectKey?: string; projectName?: string; avatarURI?: string };
        }>(`/rest/agile/1.0/board/${id}`),
        get<{
          columnConfig?: { columns?: { name: string; max?: number; statuses?: { id: string }[] }[] };
          estimation?: { field?: { fieldId?: string } };
          ranking?: { rankCustomFieldId?: number };
        }>(`/rest/agile/1.0/board/${id}/configuration`),
        fields(),
        get<RawUser>('/rest/api/3/myself').catch(() => null),
      ]);
      const statuses = await get<{ id: string; statusCategory?: { key?: string } }[]>(
        '/rest/api/3/status'
      );
      const kinds = new Map(statuses.map((one) => [one.id, categoryOf(one.statusCategory?.key)]));
      const columns: Column[] = (config.columnConfig?.columns ?? [])
        .map((column) => {
          const sts = (column.statuses ?? []).map((one) => one.id);
          const cats = sts.map((one) => kinds.get(one) ?? 'indeterminate');
          const category: Category =
            cats.length && cats.every((c) => c === 'done')
              ? 'done'
              : cats.length && cats.every((c) => c === 'new')
                ? 'new'
                : 'indeterminate';
          return { name: column.name, statuses: sts, category, ...(column.max ? { max: column.max } : {}) };
        })
        .filter((column) => column.statuses.length);

      const points =
        config.estimation?.field?.fieldId ??
        ids.get('story point estimate') ??
        ids.get('story points');
      const flaggedId = ids.get('flagged');
      const color = ids.get('#color');
      const want = [
        'summary',
        'status',
        'issuetype',
        'priority',
        'parent',
        'assignee',
        'labels',
        'duedate',
        'subtasks',
        'fixVersions',
        'updated',
        ...(points ? [points] : []),
        ...(flaggedId ? [flaggedId] : []),
      ];

      const filters = await get<{ values: { id: number; name: string; jql: string }[] }>(
        `/rest/agile/1.0/board/${id}/quickfilter?maxResults=50`
      ).catch(() => ({ values: [] }));
      const extra = [
        ...filters.values.filter((one) => quick.includes(one.id)).map((one) => `(${one.jql})`),
        ...(jql.trim() ? [`(${jql.trim()})`] : []),
      ].join(' AND ');

      let sprint: Board['sprint'];
      let raws: RawIssue[] | null = null;
      /* A team-managed board calls itself "simple" whether it runs sprints or
         not, so anything that is not plainly kanban is asked for one. */
      if (info.type !== 'kanban') {
        const sprints = await get<{
          values: { id: number; name: string; endDate?: string; goal?: string }[];
        }>(`/rest/agile/1.0/board/${id}/sprint?state=active`).catch(() => ({ values: [] }));
        const running = sprints.values[0];
        if (running) {
          sprint = {
            id: running.id,
            name: running.name,
            ...(running.endDate ? { end: running.endDate } : {}),
            ...(running.goal ? { goal: running.goal } : {}),
          };
          const jql = extra ? `jql=${enc(extra)}` : '';
          raws = await issuesOf(`/rest/agile/1.0/board/${id}/sprint/${running.id}/issue?${jql}`, want);
        } else if (info.type === 'scrum') raws = [];
      }
      if (!raws) {
        /* Jira's own kanban rule: done work drops off after a fortnight. */
        const base = 'statusCategory != Done OR resolutiondate >= -14d OR updated >= -14d';
        const jql = extra ? `(${base}) AND ${extra}` : base;
        raws = await issuesOf(`/rest/agile/1.0/board/${id}/issue?jql=${enc(jql)}`, want);
      }
      const cardsOnly = raws.filter((raw) => !raw.fields.issuetype?.subtask && !isEpic(raw));

      const cards = await toCards(cardsOnly, kinds, points, flaggedId, color);

      return {
        site,
        id,
        name: info.name,
        kind: info.type,
        projectKey: info.location?.projectKey ?? '',
        projectName: info.location?.projectName ?? info.name,
        ...(info.location?.avatarURI ? { projectAvatar: info.location.avatarURI } : {}),
        columns,
        cards,
        ...(sprint ? { sprint } : {}),
        quickFilters: filters.values,
        ...(points ? { points } : {}),
        ...(config.ranking?.rankCustomFieldId ? { rank: `customfield_${config.ranking.rankCustomFieldId}` } : {}),
        ...(me?.accountId ? { me: me.accountId, self: personOf(me) } : {}),
      };
    },

    /**
     * A project with no board at all, the way a service desk queue is: its
     * open work, one column per status it is actually in, in Jira's order.
     */
    async projectBoard(key: string): Promise<Board> {
      const [project, ids, me, statuses] = await Promise.all([
        get<{ name: string; avatarUrls?: Record<string, string> }>(`/rest/api/3/project/${enc(key)}`),
        fields(),
        get<RawUser>('/rest/api/3/myself').catch(() => null),
        get<{ id: string; statusCategory?: { key?: string } }[]>('/rest/api/3/status'),
      ]);
      const kinds = new Map(statuses.map((one) => [one.id, categoryOf(one.statusCategory?.key)]));
      const points = ids.get('story point estimate') ?? ids.get('story points');
      const flaggedId = ids.get('flagged');
      const want = ['summary', 'status', 'issuetype', 'priority', 'parent', 'assignee', 'labels', 'duedate', 'subtasks', 'fixVersions', 'updated', ...(points ? [points] : []), ...(flaggedId ? [flaggedId] : [])];
      const raws: RawIssue[] = [];
      let token: string | undefined;
      for (let page = 0; page < 10; page++) {
        const got = await send<{ issues: RawIssue[]; nextPageToken?: string }>('POST', '/rest/api/3/search/jql', {
          jql: `project = "${key}" AND (statusCategory != Done OR updated >= -14d) ORDER BY rank, updated DESC`,
          fields: want,
          maxResults: 100,
          ...(token ? { nextPageToken: token } : {}),
        });
        raws.push(...got.issues);
        token = got.nextPageToken;
        if (!token) break;
      }
      const cards = await toCards(raws.filter((raw) => !raw.fields.issuetype?.subtask && !isEpic(raw)), kinds, points, flaggedId, ids.get('#color'));
      const columns: Column[] = [];
      for (const card of cards)
        if (!columns.some((column) => column.statuses.includes(card.statusId)))
          columns.push({ name: card.status, statuses: [card.statusId], category: card.category });
      const order = { new: 0, indeterminate: 1, done: 2 };
      columns.sort((a, b) => order[a.category] - order[b.category]);
      return {
        site,
        id: 0,
        name: project.name,
        kind: 'project',
        projectKey: key,
        projectName: project.name,
        ...(project.avatarUrls?.['24x24'] ? { projectAvatar: project.avatarUrls['24x24'] } : {}),
        columns,
        cards,
        quickFilters: [],
        ...(points ? { points } : {}),
        ...(me?.accountId ? { me: me.accountId, self: personOf(me) } : {}),
      };
    },

    /** Into whichever of a column's statuses Jira will let it reach from here; says which, or false. */
    async move(key: string, to: string[]): Promise<string | false> {
      const got = await get<{ transitions: { id: string; to?: { id?: string } }[] }>(
        `/rest/api/3/issue/${key}/transitions`
      );
      const step = got.transitions.find((one) => one.to?.id && to.includes(one.to.id));
      if (!step?.to?.id) return false;
      await send('POST', `/rest/api/3/issue/${key}/transitions`, { transition: { id: step.id } });
      return step.to.id;
    },

    async rank(key: string, before?: string, after?: string): Promise<void> {
      await send('PUT', '/rest/agile/1.0/issue/rank', {
        issues: [key],
        ...(before ? { rankBeforeIssue: before } : after ? { rankAfterIssue: after } : {}),
      });
    },

    /* Every note asks for its kind's icon and its owner's face each time the
       board is drawn; asked across the wire every time, a hundred notes
       redrawn on a keystroke queue everything else behind them. */
    image: (url: string): Promise<string | null> => {
      const was = pictures.get(url);
      if (was) return was;
      const got = wire.image(site, url).then((data) => {
        if (!data) pictures.delete(url);
        return data;
      });
      pictures.set(url, got);
      return got;
    },
  };
}

export type Jira = ReturnType<typeof makeJira>;
