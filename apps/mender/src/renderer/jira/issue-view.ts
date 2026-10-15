import { adfToMarkdown } from '@shared/jira-adf';
import { markdownToAdf } from '@shared/jira-md';
import { lantern, moodOf, type Lit } from './board-view';
import type { Board, Jira, Person, RawIssue } from './data';
import { categoryOf, isEpic, personOf, tapeOf } from './data';
import { KIT_NAMES, sprite } from '../yard/sprite';
import { ago, day, face, gold, h, icon, pri, rich, shortEpic, slab, titled, when, type Item, type Row } from './dom';

/**
 * One ticket, laid out the way a session's yard is: what it asks pinned to
 * the post on the left, what has been said about it in the middle, and where
 * it stands down the right with every field it has, each changed in place.
 * An epic is the same place with what is in it in the middle instead. The
 * line along the bottom says something on it.
 */

export interface IssueHands {
  take(key: string): void;
  go(task: string): void;
  back(): void;
  changed(): void;
  open(key: string): void;
  only(epic: string): void;
  outside(url: string): void;
  said(text: string, sore?: boolean): void;
}

interface Meta {
  name: string;
  required?: boolean;
  schema: { type: string; items?: string; system?: string; custom?: string };
  allowedValues?: Record<string, unknown>[];
  autoCompleteUrl?: string;
  operations?: string[];
}

interface Full extends RawIssue {
  names: Record<string, string>;
  editmeta?: { fields: Record<string, Meta> };
  renderedFields?: Record<string, unknown>;
  schema?: Record<string, Meta['schema']>;
  transitions?: { id: string; name: string; to?: { id?: string; name?: string; statusCategory?: { key?: string } } }[];
  changelog?: {
    histories: {
      id: string;
      created: string;
      author?: { accountId?: string; displayName?: string; avatarUrls?: Record<string, string> };
      items: { field: string; fromString?: string | null; toString?: string | null }[];
    }[];
  };
}

interface Comment {
  id: string;
  author?: { accountId?: string; displayName?: string; avatarUrls?: Record<string, string> };
  created: string;
  updated?: string;
  body?: unknown;
  renderedBody?: string;
}

/** Shown elsewhere on the view, or nothing anybody sets by hand. */
const SKIP = new Set([
  'summary', 'description', 'comment', 'attachment', 'issuelinks', 'issuerestriction', 'worklog',
  'subtasks', 'project', 'status', 'statuscategorychangedate', 'lastViewed', 'watches', 'votes',
  'thumbnail', 'aggregateprogress', 'progress', 'workratio', 'creator', 'created', 'updated',
  'resolutiondate', 'statusCategory', 'aggregatetimeestimate', 'aggregatetimeoriginalestimate',
  'aggregatetimespent', 'timeestimate', 'timeoriginalestimate', 'timespent', 'issuetype',
]);
const SKIP_CUSTOM = [':gh-lexo-rank', ':devsummarycf', ':agent-sessions', ':jsw-issue-color'];
/** The fields Jira itself puts first, in its order. */
const FIRST = ['assignee', 'reporter', 'priority', 'labels', 'parent', 'duedate', 'components', 'fixVersions', 'timetracking'];

const enc = encodeURIComponent;

export function issueView(
  jira: Jira,
  key: string,
  ctx: { board?: Board; me?: string; lit: () => Record<string, Lit>; host: HTMLElement },
  hands: IssueHands
): { top: HTMLElement; body: HTMLElement; refresh(): void } {
  const top = h('div', 'jr-top');
  const body = h('div', 'jr-body');
  top.append(
    h('div', 'jr-here sh', gold(ctx.board?.projectName ?? key.split('-')[0]!, () => hands.back(), 'proj'), h('span', 'slash', '/'), h('span', 'where', key)),
    h('div', 'jr-sub sh', 'reading it…')
  );

  let issue: Full | null = null;
  let comments: Comment[] = [];
  let children: RawIssue[] = [];
  let editing = false;
  let history = false;
  let line: HTMLInputElement | null = null;
  const url = `https://${jira.site}/browse/${key}`;

  const load = async (): Promise<void> => {
    try {
      const [got, said] = await Promise.all([
        jira.get<Full>(`/rest/api/3/issue/${key}?expand=names,editmeta,renderedFields,transitions,schema,changelog`),
        jira.get<{ comments: Comment[] }>(`/rest/api/3/issue/${key}/comment?expand=renderedBody&orderBy=created&maxResults=100`),
      ]);
      issue = got;
      comments = said.comments;
      if (isEpic(got)) {
        const ids = await jira.fields();
        const points = ctx.board?.points ?? ids.get('story point estimate') ?? ids.get('story points');
        const kids = await jira
          .send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
            jql: `parent = ${key} ORDER BY rank`,
            fields: ['summary', 'status', 'issuetype', 'assignee', 'priority', ...(points ? [points] : [])],
            maxResults: 200,
          })
          .catch(() => ({ issues: [] as RawIssue[] }));
        children = kids.issues;
        if (points) for (const kid of children) (kid as RawIssue & { points?: unknown }).points = kid.fields[points];
      } else children = [];
      paint();
    } catch (cause) {
      top.querySelector('.jr-sub')?.replaceChildren(h('span', 'sore', `Jira would not hand ${key} over: ${(cause as Error).message}`));
    }
  };

  /** Writes a change to Jira, says so, and reads the ticket back. */
  const write = async (what: () => Promise<unknown>, said?: string): Promise<void> => {
    try {
      await what();
      if (said) hands.said(said);
      hands.changed();
    } catch (cause) {
      hands.said((cause as Error).message || 'Jira said no.', true);
    }
    await load();
  };
  const setField = (id: string, value: unknown, said?: string): Promise<void> =>
    write(() => jira.send('PUT', `/rest/api/3/issue/${key}`, { fields: { [id]: value } }), said);

  const columnOf = (statusId: string | undefined): number =>
    ctx.board?.columns.findIndex((column) => column.statuses.includes(statusId ?? '')) ?? -1;

  // ── painting ────────────────────────────────────────────────────────────
  const paint = (): void => {
    const now = issue;
    if (!now) return;
    const f = now.fields;
    const epic = isEpic(now);
    const keep = Array.from(body.querySelectorAll('.jr-c')).map((one) => one.scrollTop);
    const wrote = line?.value ?? '';
    const focused = document.activeElement === line;

    // the heading
    const where = titled(f.summary ?? '', 'where edit', 'span');
    where.title = 'press twice to rewrite it';
    where.addEventListener('dblclick', () => {
      const input = h('input', 'where');
      input.value = f.summary ?? '';
      const done = (save: boolean): void => {
        const next = input.value.trim();
        if (save && next && next !== f.summary) void setField('summary', next, 'rewritten');
        else paint();
      };
      input.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') done(true);
        if (event.key === 'Escape') done(false);
      });
      input.addEventListener('blur', () => done(true));
      where.replaceWith(input);
      input.focus();
      input.select();
    });
    const here = h('div', 'jr-here sh', gold(ctx.board?.projectName ?? (f.project as { name?: string } | undefined)?.name ?? key, () => hands.back(), 'proj'), h('span', 'slash', '/'), where);

    const sub = h('div', 'jr-sub sh', key, ` · ${(f.issuetype?.name ?? '').toLowerCase()}`);
    if (epic) {
      const done = children.filter((kid) => categoryOf(kid.fields.status?.statusCategory?.key) === 'done').length;
      sub.append(' · ', h('b', '', `${done} of ${children.length} done`));
    } else if (f.priority?.name) sub.append(' · ', h('b', '', f.priority.name.toLowerCase()));
    const who = personOf(f.assignee);
    sub.append(` · ${who ? who.name : 'nobody has it'} · touched ${ago(f.updated as string)}`);

    const tools = h('div', 'jr-tools sh', gold('‹ back to the board', () => hands.back()));
    if (epic) {
      tools.append(gold('show only this on the board', () => hands.only(key)));
      tools.append(gold('+ add a ticket to it', (event) => addUnder(event.currentTarget as HTMLElement, false)));
    }
    tools.append(gold('copy its link', () => void navigator.clipboard.writeText(url).then(() => hands.said('its link is copied'))));
    tools.append(gold('open in jira', () => hands.outside(url)));
    top.replaceChildren(here, sub, tools);

    // the three columns
    const grid = h('div', `jr-yard${epic ? ' epic' : ''}`);
    grid.append(asks(now), epic ? inIt() : saidOn(now), stands(now));
    const write = h('input');
    write.placeholder = `say something on ${key}…`;
    write.value = wrote;
    write.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && write.value.trim()) {
        event.preventDefault();
        const text = write.value.trim();
        write.value = '';
        void write2(text);
      }
      if (event.key === 'Escape' && write.value) {
        event.preventDefault();
        event.stopPropagation();
        write.value = '';
      }
    });
    line = write;
    const bar = h('div', 'jr-line sh', write, h('span', 'hint', 'return says it'));
    body.replaceChildren(grid, bar);
    Array.from(body.querySelectorAll('.jr-c')).forEach((one, i) => (one.scrollTop = keep[i] ?? 0));
    if (focused) write.focus();
  };
  const write2 = (text: string): Promise<void> =>
    write(() => jira.send('POST', `/rest/api/3/issue/${key}/comment`, { body: markdownToAdf(text) }), `said on ${key}`);

  // ── left: what it asks ──────────────────────────────────────────────────
  const asks = (now: Full): HTMLElement => {
    const f = now.fields;
    const col = h('div', 'jr-c', h('div', 'jr-head-label sh', 'what it asks'), h('div', 'jr-post'));
    const note = h('div', 'jr-ask');
    const parent = f.parent;
    if (parent?.key) {
      const card = ctx.board?.cards.find((one) => one.parent?.key === parent.key)?.parent;
      const tape = h('div', 'tape', shortEpic(parent.fields?.summary ?? parent.key));
      tape.style.background = tapeOf(card?.color, parent.key);
      tape.title = `${parent.key} ${parent.fields?.summary ?? ''}`;
      tape.addEventListener('click', (event) => {
        event.stopPropagation();
        hands.open(parent.key!);
      });
      note.append(tape);
    } else note.append(h('div', 'tack'));
    const canEdit = Boolean(now.editmeta?.fields.description);
    note.append(h('div', 'meta', icon(jira, f.issuetype?.iconUrl, ''), `${(f.issuetype?.name ?? '').toLowerCase()} · ${key}${canEdit && !editing ? ' · press to rewrite' : ''}`));
    if (editing) {
      const area = h('textarea');
      area.value = adfToMarkdown(f.description);
      const save = (): void => {
        editing = false;
        void setField('description', area.value.trim() ? markdownToAdf(area.value) : null, 'rewritten');
      };
      const stop = (): void => {
        editing = false;
        paint();
      };
      area.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter' && event.metaKey) {
          event.preventDefault();
          save();
        }
        if (event.key === 'Escape') stop();
      });
      const bar = h('div', 'saybar');
      const keepIt = h('span', '', 'keep it');
      keepIt.addEventListener('click', save);
      const back = h('span', '', 'put it back');
      back.addEventListener('click', stop);
      bar.append(keepIt, back, h('i', '', 'markdown · ⌘↩ keeps it'));
      note.append(area, bar);
      requestAnimationFrame(() => area.focus());
    } else {
      const html = (now.renderedFields?.description as string | undefined) ?? '';
      note.append(html.trim() ? rich(jira, html, hands.outside) : h('div', 'empty', canEdit ? 'nothing written yet…' : 'nothing written'));
      if (canEdit) {
        note.classList.add('edit');
        note.addEventListener('click', (event) => {
          if ((event.target as HTMLElement).closest('a,.tape')) return;
          editing = true;
          paint();
        });
      }
    }
    col.append(note);

    const weath = h('div', 'jr-weath sh');
    const subtasks = (f.subtasks as RawIssue[] | undefined) ?? [];
    if (!isEpic(now)) {
      if (subtasks.length) {
        const done = subtasks.filter((one) => categoryOf(one.fields.status?.statusCategory?.key) === 'done').length;
        const group = h('div', '', h('div', 'k', `its subtasks · ${done} of ${subtasks.length} done`));
        for (const one of subtasks) group.append(ticketLine(one));
        weath.append(group);
      }
      weath.append(gold('+ add a subtask', (event) => addUnder(event.currentTarget as HTMLElement, true), 'jr-fold'));
    }
    const links = (f.issuelinks as { id: string; type: { inward: string; outward: string }; inwardIssue?: RawIssue; outwardIssue?: RawIssue }[] | undefined) ?? [];
    const grouped = new Map<string, { id: string; other: RawIssue }[]>();
    for (const link of links) {
      const kind = link.inwardIssue ? link.type.inward : link.type.outward;
      const other = link.inwardIssue ?? link.outwardIssue;
      if (other) grouped.set(kind, [...(grouped.get(kind) ?? []), { id: link.id, other }]);
    }
    for (const [kind, list] of grouped) {
      const group = h('div', '', h('div', 'k', kind));
      for (const { id, other } of list) {
        const row = ticketLine(other);
        row.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          slab(ctx.host, { x: event.clientX, y: event.clientY }, [
            { label: `open ${other.key}`, pick: () => hands.open(other.key) },
            { label: 'unlink it', arm: `unlink ${other.key}? press again`, pick: () => void write(() => jira.send('DELETE', `/rest/api/3/issueLink/${id}`), 'unlinked') },
          ]);
        });
        group.append(row);
      }
      weath.append(group);
    }
    weath.append(gold('+ link a ticket', (event) => linkSlab(event.currentTarget as HTMLElement), 'jr-fold'));

    const files = (f.attachment as { id: string; filename: string; mimeType: string; content: string; thumbnail?: string; created: string }[] | undefined) ?? [];
    if (files.length) {
      const grid = h('div', 'jr-files');
      for (const file of files) {
        const image = file.mimeType.startsWith('image/');
        const thumb = h('div', 'thumb', image ? '' : (file.filename.split('.').pop() ?? '').toUpperCase());
        if (image)
          void jira.image(file.thumbnail ?? file.content).then((data) => {
            if (data) thumb.style.backgroundImage = `url("${data}")`;
          });
        const tile = h('div', 'jr-file', thumb, h('div', 'name', file.filename));
        tile.title = `${file.filename} · ${ago(file.created)}`;
        tile.addEventListener('click', () => {
          if (image) void jira.image(file.content).then((data) => data && lightbox(data));
          else hands.outside(url);
        });
        grid.append(tile);
      }
      weath.append(h('div', '', h('div', 'k', `pinned to it · ${files.length}`), grid));
    }
    col.append(weath);
    requestAnimationFrame(() => {
      const post = col.querySelector<HTMLElement>('.jr-post');
      if (post) post.style.height = `${note.offsetHeight + 40}px`;
    });
    return col;
  };

  const ticketLine = (one: RawIssue): HTMLElement => {
    const done = categoryOf(one.fields.status?.statusCategory?.key) === 'done';
    const row = titled(`${one.fields.summary ?? ''}`, `s${done ? ' done' : ''}`);
    row.prepend(h('span', 'quiet', `${one.key} `));
    row.title = `${one.key} · ${one.fields.status?.name ?? ''}`;
    row.addEventListener('click', () => hands.open(one.key));
    return row;
  };

  /** A ticket written straight under this one: a subtask, or a ticket into an epic. */
  const addUnder = (anchor: HTMLElement, subtask: boolean): void => {
    let types: { id: string; name: string; subtask?: boolean; hierarchyLevel?: number }[] | null = null;
    slab(
      ctx.host,
      anchor,
      async (query) => {
        const text = query.trim();
        if (!text) return [{ label: subtask ? 'write the subtask, return pins it' : 'write the ticket, return pins it', off: true }];
        types ??= await jira
          .get<{ issueTypes?: { id: string; name: string; subtask?: boolean; hierarchyLevel?: number }[] }>(
            `/rest/api/3/issue/createmeta/${(issue?.fields.project as { key?: string } | undefined)?.key ?? ''}/issuetypes?maxResults=50`
          )
          .then((got) => got.issueTypes ?? [])
          .catch(() => []);
        const kinds = types.filter((one) => (subtask ? one.subtask : !one.subtask && (one.hierarchyLevel ?? 0) === 0));
        return kinds.map((one): Row => ({
          label: `pin it as a ${one.name.toLowerCase()}`,
          pick: () =>
            void write(async () => {
              const made = await jira.send<{ key: string }>('POST', '/rest/api/3/issue', {
                fields: {
                  project: { key: (issue?.fields.project as { key?: string } | undefined)?.key },
                  issuetype: { id: one.id },
                  summary: text,
                  parent: { key },
                },
              });
              if (!subtask && ctx.board?.sprint)
                await jira.send('POST', `/rest/agile/1.0/sprint/${ctx.board.sprint.id}/issue`, { issues: [made.key] }).catch(() => undefined);
              hands.said(`${made.key} is pinned under ${key}`);
            }),
        }));
      },
      { search: subtask ? 'what the subtask is…' : 'what needs doing…' }
    );
  };

  const linkSlab = (anchor: HTMLElement): void => {
    slab(ctx.host, anchor, async () => {
      const got = await jira.get<{ issueLinkTypes: { name: string; inward: string; outward: string }[] }>('/rest/api/3/issueLinkType');
      const ways: Row[] = [];
      for (const type of got.issueLinkTypes) {
        ways.push({ label: type.outward, subOpts: { search: 'find the other ticket…' }, sub: () => linkTo(type.name, true) });
        if (type.inward !== type.outward) ways.push({ label: type.inward, subOpts: { search: 'find the other ticket…' }, sub: () => linkTo(type.name, false) });
      }
      return [{ head: `${key}…` }, ...ways];
    });
  };
  const linkTo = (type: string, outward: boolean) => async (query: string): Promise<Item[]> => {
    const text = query.trim().replace(/"/g, '');
    const project = (issue?.fields.project as { key?: string } | undefined)?.key ?? '';
    const jql = !text
      ? `project = "${project}" AND key != ${key} ORDER BY updated DESC`
      : /^[A-Z][A-Z0-9_]+-\d+$/i.test(text)
        ? `key = "${text.toUpperCase()}"`
        : `summary ~ "${text}*" ORDER BY updated DESC`;
    const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', { jql, fields: ['summary', 'issuetype'], maxResults: 20 });
    return got.issues
      .filter((one) => one.key !== key)
      .map((one): Row => ({
        label: h('span', '', icon(jira, one.fields.issuetype?.iconUrl, ''), h('span', 'k', one.key), (one.fields.summary ?? '').slice(0, 44)),
        pick: () =>
          void write(
            () =>
              jira.send('POST', '/rest/api/3/issueLink', {
                type: { name: type },
                inwardIssue: { key: outward ? key : one.key },
                outwardIssue: { key: outward ? one.key : key },
              }),
            `linked to ${one.key}`
          ),
      }));
  };

  const lightbox = (data: string): void => {
    const box = h('div', 'jr-lightbox', Object.assign(h('img'), { src: data }));
    box.addEventListener('click', () => box.remove());
    ctx.host.append(box);
  };

  // ── middle: what's been said ────────────────────────────────────────────
  const saidOn = (now: Full): HTMLElement => {
    const col = h('div', 'jr-c', h('div', 'jr-head-label sh', "what's been said", comments.length ? h('span', 'n', String(comments.length)) : null));
    if (!comments.length) col.append(h('div', 'jr-said dim sh', 'nothing yet. the line along the bottom says something on it.'));
    comments.forEach((c, at) => col.append(commentOf(c, at < comments.length - 1)));
    col.append(changes(now));
    return col;
  };

  const commentOf = (c: Comment, older: boolean): HTMLElement => {
    const who = personOf(c.author);
    const mine = Boolean(ctx.me && c.author?.accountId === ctx.me);
    const by = h('div', 'jr-by sh', face(jira, who, 'small'), `${who?.name.split(' ')[0]?.toLowerCase() ?? 'somebody'} · ${ago(c.created)}${c.updated && c.updated !== c.created ? ' · changed' : ''}`);
    const said = h('div', `jr-said sh${older ? ' dim' : ''}`, rich(jira, c.renderedBody ?? '', hands.outside));
    if (mine) {
      const acts = h('span', 'acts');
      const edit = h('span', '', 'rewrite');
      edit.addEventListener('click', () => {
        const area = h('textarea');
        area.value = adfToMarkdown(c.body);
        area.addEventListener('keydown', (event) => {
          event.stopPropagation();
          if (event.key === 'Enter' && event.metaKey)
            void write(() => jira.send('PUT', `/rest/api/3/issue/${key}/comment/${c.id}`, { body: markdownToAdf(area.value) }), 'rewritten');
          if (event.key === 'Escape') paint();
        });
        said.replaceChildren(area, h('div', 'jr-dates', 'markdown · ⌘↩ keeps it · esc puts it back'));
        area.focus();
      });
      const del = h('span', '', 'take it back');
      del.addEventListener('click', () => {
        if (!del.classList.contains('armed')) {
          del.classList.add('armed');
          del.textContent = 'gone for good? press again';
          return;
        }
        void write(() => jira.send('DELETE', `/rest/api/3/issue/${key}/comment/${c.id}`), 'taken back');
      });
      acts.append(edit, del);
      by.append(acts);
    }
    return h('div', 'jr-said-wrap', by, said);
  };

  const changes = (now: Full): HTMLElement => {
    const all = [...(now.changelog?.histories ?? [])].reverse();
    const wrap = h('div');
    if (!all.length) return wrap;
    const count = all.reduce((n, one) => n + one.items.length, 0);
    wrap.append(
      gold(`everything that changed on it · ${count} ${history ? '▾' : '▸'}`, () => {
        history = !history;
        paint();
      }, 'jr-fold sh')
    );
    if (history)
      for (const hist of all)
        for (const item of hist.items)
          wrap.append(
            h(
              'div',
              'jr-change sh',
              h('b', '', hist.author?.displayName?.split(' ')[0] ?? 'somebody'),
              ` changed ${item.field.toLowerCase()}`,
              item.fromString ? ` from “${item.fromString}”` : '',
              item.toString ? ` to “${item.toString}”` : ' to nothing',
              h('span', 'when', ` · ${ago(hist.created)}`)
            )
          );
    return wrap;
  };

  // ── middle, for an epic: what's in it ───────────────────────────────────
  const inIt = (): HTMLElement => {
    const col = h('div', 'jr-c', h('div', 'jr-head-label sh', "what's in it", h('span', 'n', String(children.length))));
    const board = ctx.board;
    const places = board?.columns.length
      ? board.columns.map((column) => ({ name: column.name, category: column.category, has: (kid: RawIssue) => column.statuses.includes(kid.fields.status?.id ?? '') }))
      : [];
    const placeOf = (kid: RawIssue): string =>
      places.find((one) => one.has(kid))?.name ?? kid.fields.status?.name ?? '';
    const names = [...new Set([...places.map((one) => one.name), ...children.map(placeOf)])];
    const toneOf = (name: string): string => {
      const place = places.find((one) => one.name === name);
      const category = place?.category ?? categoryOf(children.find((kid) => placeOf(kid) === name)?.fields.status?.statusCategory?.key);
      if (/block/i.test(name)) return '#f2665a';
      if (category === 'done') return '#a8c469';
      if (category === 'new') return '#5e4c36';
      return /review|test|qa/i.test(name) ? '#8cc4d6' : '#ffa25e';
    };
    if (children.length) {
      const strip = h('div', 'jr-strip');
      for (const name of [...names].reverse())
        for (const kid of children.filter((one) => placeOf(one) === name)) {
          const cell = h('i');
          cell.style.background = toneOf(name);
          cell.title = `${kid.key} · ${name.toLowerCase()}`;
          strip.append(cell);
        }
      const legend = h('div', 'jr-legend sh');
      for (const name of [...names].reverse()) {
        const n = children.filter((one) => placeOf(one) === name).length;
        if (!n) continue;
        const one = h('span', '', `${n} ${name.toLowerCase()}`);
        one.style.setProperty('--c', toneOf(name));
        legend.append(one);
      }
      col.append(strip, legend);
    } else col.append(h('div', 'jr-said dim sh', 'nothing in it yet.'));
    const lit = ctx.lit();
    for (const name of names) {
      const mine = children.filter((one) => placeOf(one) === name);
      if (!mine.length) continue;
      col.append(h('div', 'jr-grp sh', name.toLowerCase(), h('span', '', String(mine.length))));
      for (const kid of mine) {
        const done = categoryOf(kid.fields.status?.statusCategory?.key) === 'done';
        const pts = (kid as RawIssue & { points?: unknown }).points;
        const row = h(
          'div',
          `jr-kid${done ? ' done' : ''}`,
          icon(jira, kid.fields.issuetype?.iconUrl, kid.fields.issuetype?.name ?? ''),
          h('span', 'k', kid.key),
          titled(kid.fields.summary ?? '', 's', 'span'),
          typeof pts === 'number' ? h('span', 'jr-pts', String(pts)) : h('span'),
          face(jira, personOf(kid.fields.assignee), 'small')
        );
        const on = lit[kid.key];
        if (on) {
          row.classList.add('lit');
          row.style.setProperty('--lit', moodOf(on.mood).color);
        }
        row.addEventListener('click', () => hands.open(kid.key));
        col.append(row);
      }
    }
    if (comments.length) {
      col.append(h('div', 'jr-head-label sh', "what's been said", h('span', 'n', String(comments.length))));
      comments.forEach((c, at) => col.append(commentOf(c, at < comments.length - 1)));
    }
    return col;
  };

  // ── right: where it stands ──────────────────────────────────────────────
  const stands = (now: Full): HTMLElement => {
    const f = now.fields;
    const col = h('div', 'jr-c', h('div', 'jr-head-label sh', 'where it stands'));
    const thread = h('div', 'jr-thread sh');
    const moves = now.transitions ?? [];
    const step = (name: string, state: 'was' | 'now' | 'can' | 'far', said: string, statuses: string[], done = false): HTMLElement => {
      const el = h('div', `jr-step ${state}${done ? ' done' : ''}`, name.toLowerCase(), said ? h('small', '', said) : null);
      const move = moves.find((one) => one.to?.id && statuses.includes(one.to.id));
      if (state === 'can' && move)
        el.addEventListener('click', () =>
          void write(() => jira.send('POST', `/rest/api/3/issue/${key}/transitions`, { transition: { id: move.id } }), `${key} is ${name.toLowerCase()} now`)
        );
      return el;
    };
    const since = f.statuscategorychangedate ? `since ${ago(f.statuscategorychangedate as string).replace(/ ago$/, '')}`.replace('since just now', 'just now').replace('since yesterday', 'since yesterday') : '';
    const at = columnOf(f.status?.id);
    if (ctx.board && at >= 0) {
      ctx.board.columns.forEach((column, i) => {
        if (i === at) thread.append(step(column.name, 'now', since, column.statuses, column.category === 'done'));
        else {
          const reachable = moves.some((one) => one.to?.id && column.statuses.includes(one.to.id));
          thread.append(step(column.name, reachable ? 'can' : i < at ? 'was' : 'far', '', column.statuses));
        }
      });
    } else {
      thread.append(step(f.status?.name ?? 'somewhere', 'now', since, [f.status?.id ?? ''], categoryOf(f.status?.statusCategory?.key) === 'done'));
      for (const move of moves)
        if (move.to?.id !== f.status?.id) thread.append(step(move.to?.name ?? move.name, 'can', move.name !== move.to?.name ? move.name.toLowerCase() : '', [move.to?.id ?? '']));
    }
    col.append(thread);

    const on = ctx.lit()[key];
    if (on) {
      const mood = moodOf(on.mood);
      const take = h('div', 'jr-take sh', lantern(on, 'lamp'), h('div', '', gold(`walk into ${on.name}`, () => hands.go(on.task)), h('small', '', mood.says)));
      take.style.setProperty('--lit', mood.color);
      col.append(take);
    } else if (categoryOf(f.status?.statusCategory?.key) !== 'done' && !isEpic(now)) {
      const lamp = sprite(KIT_NAMES.lanternOff, 2);
      lamp.classList.add('lamp', 'off');
      col.append(h('div', 'jr-take sh', lamp, h('div', '', gold('take it on in mender', () => hands.take(key)), h('small', 'quiet', 'its own workspace, its own branch'))));
    }

    col.append(h('div', 'jr-head-label sh', 'details'));
    for (const id of fieldOrder(now)) {
      const row = fieldRow(now, id);
      if (row) col.append(row);
    }
    const creator = (f.creator as { displayName?: string } | undefined)?.displayName;
    col.append(
      h(
        'div',
        'jr-dates sh',
        h('div', '', `made ${day(f.created as string)}${creator ? `, by ${creator.split(' ')[0]}` : ''}`),
        h('div', '', `last touched ${ago(f.updated as string)}`),
        f.resolutiondate ? h('div', '', `finished ${when(f.resolutiondate as string)}`) : null
      )
    );
    return col;
  };

  // ── fields ──────────────────────────────────────────────────────────────
  const fieldOrder = (now: Full): string[] => {
    const edit = Object.keys(now.editmeta?.fields ?? {});
    const filled = Object.keys(now.fields).filter((id) => present(now.fields[id]));
    const all = [...new Set([...FIRST, ...edit, ...filled])];
    return all.filter((id) => {
      if (SKIP.has(id)) return false;
      const custom = now.editmeta?.fields[id]?.schema.custom ?? now.schema?.[id]?.custom ?? '';
      if (SKIP_CUSTOM.some((end) => custom.endsWith(end))) return false;
      return Boolean(now.editmeta?.fields[id]) || present(now.fields[id]);
    });
  };

  const fieldRow = (now: Full, id: string): HTMLElement | null => {
    const meta = now.editmeta?.fields[id];
    const name = (meta?.name ?? now.names[id] ?? id).toLowerCase();
    const value = now.fields[id];
    const schema = meta?.schema ?? now.schema?.[id];
    const cell = h('div', 'v');
    cell.append(display(value, schema));
    if (meta && editable(meta)) {
      cell.classList.add('edit');
      cell.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).closest('input,textarea,.mine')) return;
        edit(now, id, meta, value, cell);
      });
    }
    if (id === 'assignee' && ctx.me && (value as { accountId?: string } | null)?.accountId !== ctx.me) {
      const mine = h('span', 'mine', 'mine');
      mine.title = 'give it to me';
      mine.addEventListener('click', (event) => {
        event.stopPropagation();
        void write(() => jira.send('PUT', `/rest/api/3/issue/${key}/assignee`, { accountId: ctx.me }), `${key} is yours`);
      });
      cell.append(mine);
    }
    const row = h('div', 'jr-row sh', h('div', 'n', name), cell);
    row.title = meta?.name ?? now.names[id] ?? id;
    return row;
  };

  const display = (value: unknown, schema: Meta['schema'] | undefined): Node => {
    if (!present(value)) return h('span', 'none', schema?.system === 'assignee' ? 'nobody' : 'none');
    if (Array.isArray(value)) {
      const all = h('span', '');
      all.style.flexWrap = 'wrap';
      for (const one of value) all.append(chip(one, schema));
      return all;
    }
    return chip(value, schema);
  };

  const chip = (value: unknown, schema: Meta['schema'] | undefined): Node => {
    if (value === null || value === undefined) return h('span', 'none', 'none');
    if (typeof value === 'string') {
      if (schema?.type === 'date') return document.createTextNode(day(value));
      if (schema?.type === 'datetime') return document.createTextNode(when(value));
      if (schema?.items === 'string' || schema?.system === 'labels') return h('span', 'lab', value);
      return document.createTextNode(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') return document.createTextNode(String(value));
    const v = value as Record<string, unknown>;
    if (v.type === 'doc') return document.createTextNode(adfToMarkdown(v) || 'none');
    if (typeof v.accountId === 'string') {
      const who = personOf(v as never);
      return h('span', '', face(jira, who, 'small'), who?.name ?? '');
    }
    if (typeof v.key === 'string' && v.fields) return h('span', '', `${v.key} · ${shortEpic(String((v.fields as { summary?: string }).summary ?? ''))}`);
    const iconUrl = typeof v.iconUrl === 'string' ? v.iconUrl : undefined;
    const label =
      (v.displayName as string) ??
      (v.name as string) ??
      (v.value as string) ??
      (v.title as string) ??
      (v.key as string) ??
      (typeof v.originalEstimate === 'string' ? `${v.originalEstimate} estimated` : undefined) ??
      JSON.stringify(v);
    if (schema?.system === 'priority') return h('span', '', pri(label) ?? '', label.toLowerCase());
    return h('span', '', iconUrl ? icon(jira, iconUrl, label) : null, label);
  };

  const editable = (meta: Meta): boolean => {
    const t = meta.schema.type;
    const c = meta.schema.custom ?? '';
    if (c.endsWith(':gh-sprint')) return Boolean(ctx.board && ctx.board.kind !== 'project');
    if (meta.schema.system === 'parent') return true;
    if (['user', 'priority', 'issuetype', 'option', 'resolution', 'version', 'component'].includes(t)) return true;
    if (t === 'array' && (meta.allowedValues?.length || meta.schema.items === 'string' || meta.schema.items === 'user')) return true;
    if (t === 'string' || t === 'number' || t === 'date' || t === 'datetime') return true;
    return Boolean(meta.allowedValues?.length);
  };

  const edit = (now: Full, id: string, meta: Meta, value: unknown, cell: HTMLElement): void => {
    const t = meta.schema.type;
    const c = meta.schema.custom ?? '';
    const many = t === 'array';
    const current = (Array.isArray(value) ? value : value ? [value] : []) as Record<string, unknown>[];
    const host = ctx.host;

    if (t === 'user' || meta.schema.items === 'user') {
      const setUser = (who: Person | null): void => {
        if (id === 'assignee')
          void write(() => jira.send('PUT', `/rest/api/3/issue/${key}/assignee`, { accountId: who?.id ?? null }), who ? `${who.name.split(' ')[0]} has it` : 'nobody has it');
        else void setField(id, who ? { accountId: who.id } : null);
      };
      slab(host, cell, async (query) => {
        const found = await jira.get<{ accountId: string; displayName: string; avatarUrls?: Record<string, string> }[]>(
          id === 'assignee'
            ? `/rest/api/3/user/assignable/search?issueKey=${key}&query=${enc(query)}&maxResults=30`
            : `/rest/api/3/user/search?query=${enc(query)}&maxResults=30`
        );
        return [
          ...(meta.required || many ? [] : [{ label: h('span', 'face-row', face(jira, undefined, 'tiny'), 'nobody'), pick: () => setUser(null) }]),
          ...found.map((u): Row => {
            const who = personOf(u)!;
            const on = current.some((one) => one.accountId === u.accountId);
            return many
              ? {
                  label: h('span', 'face-row', face(jira, who, 'tiny'), who.name),
                  tick: on,
                  pick: () => {
                    const ids = current.map((one) => String(one.accountId));
                    const next = on ? ids.filter((x) => x !== u.accountId) : [...ids, u.accountId];
                    void setField(id, next.map((accountId) => ({ accountId })));
                  },
                }
              : { label: h('span', 'face-row', face(jira, who, 'tiny'), who.name), on, pick: () => setUser(who) };
          }),
        ];
      }, { search: 'find somebody…' });
      return;
    }

    if (c.endsWith(':gh-sprint') && ctx.board) {
      const board = ctx.board;
      slab(host, cell, async () => {
        const got = await jira.get<{ values: { id: number; name: string; state: string }[] }>(`/rest/agile/1.0/board/${board.id}/sprint?state=active,future&maxResults=50`);
        return [
          { label: 'no sprint, the backlog', pick: () => void setField(id, null, 'back in the backlog') },
          ...got.values.map((s): Row => ({
            label: s.name,
            hint: s.state === 'active' ? 'running' : 'next',
            on: current.some((one) => one.id === s.id),
            pick: () => void setField(id, s.id, `in ${s.name}`),
          })),
        ];
      });
      return;
    }

    if (meta.schema.system === 'parent') {
      slab(host, cell, async (query) => {
        const project = (now.fields.project as { key?: string } | undefined)?.key ?? '';
        const text = query.trim().replace(/"/g, '');
        const jql = [
          `project = "${project}"`,
          `key != ${key}`,
          text ? (/^[A-Z][A-Z0-9_]+-\d+$/i.test(text) ? `key = "${text}"` : `summary ~ "${text}*"`) : 'issuetype = Epic',
        ].join(' AND ');
        const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', { jql: `${jql} ORDER BY updated DESC`, fields: ['summary', 'issuetype'], maxResults: 30 });
        return [
          { label: 'no parent', pick: () => void setField('parent', null, 'no parent now') },
          ...got.issues.map((one): Row => {
            const sw = h('span', 'sw');
            sw.style.background = tapeOf(undefined, one.key);
            return { label: h('span', '', sw, shortEpic(one.fields.summary ?? '')), hint: one.key, on: (now.fields.parent?.key ?? '') === one.key, pick: () => void setField('parent', { key: one.key }, `under ${one.key} now`) };
          }),
        ];
      }, { search: 'find an epic…' });
      return;
    }

    if (meta.allowedValues?.length) {
      const idOf = (one: Record<string, unknown>) => String(one.id ?? one.value ?? one.name);
      const labelOf = (one: Record<string, unknown>) => String(one.name ?? one.value ?? one.displayName ?? one.id);
      const on = new Set(current.map(idOf));
      slab(
        host,
        cell,
        [
          ...(!meta.required && !many ? [{ label: h('span', 'quiet', 'none'), text: 'none', pick: () => void setField(id, null) }] : []),
          ...meta.allowedValues.map((one): Row => {
            const label = h('span', '', typeof one.iconUrl === 'string' ? icon(jira, one.iconUrl, '') : null, labelOf(one));
            return many
              ? {
                  label,
                  text: labelOf(one),
                  tick: on.has(idOf(one)),
                  pick: () => {
                    const next = on.has(idOf(one)) ? current.filter((x) => idOf(x) !== idOf(one)) : [...current, one];
                    void setField(id, next.map((x) => ({ id: String(x.id) })));
                  },
                }
              : { label, text: labelOf(one), on: on.has(idOf(one)), pick: () => void setField(id, { id: String(one.id) }) };
          }),
        ],
        meta.allowedValues.length > 8 ? { search: 'find one…' } : {}
      );
      return;
    }

    if (t === 'array' && meta.schema.items === 'string') {
      const labels = (value as string[] | null) ?? [];
      let all: string[] | null = null;
      slab(host, cell, async (query) => {
        all ??= await jira.get<{ values: string[] }>('/rest/api/3/label?maxResults=1000').then((got) => got.values).catch(() => []);
        const q = query.trim().replace(/\s+/g, '_');
        const names = [...new Set([...labels, ...all])].filter((one) => !q || one.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
        const rows: Item[] = names.map((label) => ({
          label,
          tick: labels.includes(label),
          pick: () => void write(() => jira.send('PUT', `/rest/api/3/issue/${key}`, { update: { [id]: [labels.includes(label) ? { remove: label } : { add: label }] } })),
        }));
        if (q && !names.includes(q)) rows.unshift({ label: `+ ${q}`, pick: () => void write(() => jira.send('PUT', `/rest/api/3/issue/${key}`, { update: { [id]: [{ add: q }] } }), `labelled ${q}`) });
        return rows;
      }, { search: 'find or write a label…' });
      return;
    }

    /* Text, numbers and dates are written where they stand. */
    const doc = t === 'string' && (meta.schema.system === 'environment' || c.endsWith(':textarea') || (value as { type?: string } | null)?.type === 'doc');
    const input = doc ? h('textarea') : h('input');
    if (input instanceof HTMLInputElement) input.type = t === 'number' ? 'number' : t === 'date' ? 'date' : t === 'datetime' ? 'datetime-local' : 'text';
    input.value = doc ? adfToMarkdown(value) : t === 'datetime' && typeof value === 'string' ? value.slice(0, 16) : value === null || value === undefined ? '' : String(value);
    let gone = false;
    const save = (): void => {
      if (gone) return;
      gone = true;
      const raw = input.value.trim();
      const was = doc ? adfToMarkdown(value) : value === null || value === undefined ? '' : String(value);
      if (raw === was.trim()) {
        paint();
        return;
      }
      const next = !raw ? null : t === 'number' ? Number(raw) : doc ? markdownToAdf(raw) : t === 'datetime' ? new Date(raw).toISOString().replace('Z', '+0000') : raw;
      void setField(id, next);
    };
    (input as HTMLElement).addEventListener('keydown', (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Enter' && (!doc || event.metaKey)) {
        event.preventDefault();
        save();
      }
      if (event.key === 'Escape') {
        gone = true;
        paint();
      }
    });
    input.addEventListener('blur', save);
    cell.replaceChildren(input);
    input.focus();
  };

  void load();
  return { top, body, refresh: () => void load() };
}

function present(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return false;
  return true;
}
