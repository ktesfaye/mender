import { adfToMarkdown } from '@shared/jira-adf';
import { markdownToAdf } from '@shared/jira-md';
import { sessionPill, type Lit } from './board-view';
import type { Board, Jira, RawIssue } from './data';
import { categoryOf, personOf } from './data';
import { ago, avatar, button, h, icon, menu, rich, when, type MenuItem } from './dom';

/**
 * One ticket, the way Jira's own issue view lays it out: what it says on the
 * left, with its children, its links, its attachments and everything said
 * about it; where it stands and every one of its fields down the right, each
 * changed in place. Nothing a team keeps on a ticket is left off: any field
 * Jira says this ticket has, or could have, is on it.
 */

export interface IssueHands {
  take(key: string): void;
  go(task: string): void;
  close(): void;
  changed(): void;
  open(key: string): void;
  outside(url: string): void;
  toast(said: string, sore?: boolean): void;
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
  'aggregatetimespent', 'timeestimate', 'timeoriginalestimate', 'timespent',
]);
const SKIP_CUSTOM = [':gh-lexo-rank', ':devsummarycf', ':agent-sessions', ':jsw-issue-color'];
/** The fields Jira itself puts first, in its order. */
const FIRST = ['assignee', 'reporter', 'labels', 'parent', 'priority', 'issuetype', 'duedate', 'components', 'fixVersions', 'timetracking'];

export function issueView(
  jira: Jira,
  key: string,
  ctx: { board?: Board; me?: string; lit: () => Record<string, Lit>; overlay: HTMLElement },
  hands: IssueHands
): { el: HTMLElement; refresh(): void } {
  const blanket = h('div', 'jr-blanket');
  const modal = h('div', 'jr-modal');
  blanket.append(modal);
  blanket.addEventListener('mousedown', (event) => {
    if (event.target === blanket) hands.close();
  });
  modal.append(h('div', 'jr-loading', `Loading ${key}…`));

  let issue: Full | null = null;
  let comments: Comment[] = [];
  let children: RawIssue[] = [];
  let tab: 'comments' | 'history' = 'comments';
  let editingDescription = false;
  let left: HTMLElement | null = null;
  let right: HTMLElement | null = null;

  const load = async (): Promise<void> => {
    try {
      const [got, said] = await Promise.all([
        jira.get<Full>(`/rest/api/3/issue/${key}?expand=names,editmeta,renderedFields,transitions,schema,changelog`),
        jira.get<{ comments: Comment[] }>(
          `/rest/api/3/issue/${key}/comment?expand=renderedBody&orderBy=-created&maxResults=100`
        ),
      ]);
      issue = got;
      comments = said.comments;
      const kids = await jira
        .send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
          jql: `parent = ${key} ORDER BY rank`,
          fields: ['summary', 'status', 'issuetype', 'assignee', 'priority'],
          maxResults: 100,
        })
        .catch(() => ({ issues: [] as RawIssue[] }));
      children = kids.issues;
      paint();
    } catch (cause) {
      modal.replaceChildren(
        h('div', 'jr-note sore', `Jira would not hand ${key} over: ${(cause as Error).message}`)
      );
    }
  };

  /** Writes a change to Jira and reads the ticket back. */
  const write = async (what: () => Promise<unknown>, okSaid?: string): Promise<void> => {
    try {
      await what();
      if (okSaid) hands.toast(okSaid);
      hands.changed();
    } catch (cause) {
      hands.toast((cause as Error).message || 'Jira said no.', true);
    }
    await load();
  };
  const setField = (id: string, value: unknown): Promise<void> =>
    write(() => jira.send('PUT', `/rest/api/3/issue/${key}`, { fields: { [id]: value } }));

  const paint = (): void => {
    const now = issue;
    if (!now) return;
    const keepLeft = left?.scrollTop ?? 0;
    const keepRight = right?.scrollTop ?? 0;
    const f = now.fields;
    const url = `https://${jira.site}/browse/${key}`;

    // ── top ─────────────────────────────────────────────────────────────
    const crumb = h('div', 'crumb');
    const parent = f.parent;
    if (parent?.key) {
      const p = h('a', '', parent.key);
      p.href = '#';
      p.addEventListener('click', (event) => {
        event.preventDefault();
        hands.open(parent.key!);
      });
      crumb.append(p, h('span', '', '/'));
    }
    const typeAt = h('span', '', icon(jira, f.issuetype?.iconUrl, f.issuetype?.name ?? ''));
    crumb.append(typeAt, h('a', '', key));
    const top = h('div', 'jr-modal-top', crumb, h('span', 'grow'));
    (top.lastElementChild as HTMLElement).style.flex = '1';
    const on = ctx.lit()[key];
    if (on) {
      const pill = sessionPill(on);
      pill.style.cursor = 'pointer';
      pill.title = 'Walk into that session';
      pill.addEventListener('click', () => hands.go(on.task));
      top.append(pill);
    }
    top.append(
      button('Open in Jira ↗', 'subtle small', () => hands.outside(url)),
      button('✕', 'subtle', () => hands.close())
    );

    // ── left ────────────────────────────────────────────────────────────
    left = h('div', 'jr-issue-left');
    const summary = h('textarea', 'jr-summary');
    summary.rows = 1;
    summary.value = f.summary ?? '';
    const fit = (): void => {
      summary.style.height = 'auto';
      summary.style.height = `${summary.scrollHeight}px`;
    };
    requestAnimationFrame(fit);
    summary.addEventListener('input', fit);
    summary.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        summary.blur();
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        summary.value = f.summary ?? '';
        summary.blur();
      }
    });
    summary.addEventListener('blur', () => {
      const next = summary.value.trim();
      if (next && next !== f.summary) void setField('summary', next);
    });
    left.append(summary);

    // Status, and the one thing the village adds.
    const status = h('div', 'jr-status-row');
    const cat = categoryOf(f.status?.statusCategory?.key);
    const statusBtn = button(`${f.status?.name ?? 'Status'} ▾`, `jr-status-btn ${cat}`, () => {
      menu(
        ctx.overlay,
        statusBtn,
        (now.transitions ?? []).map(
          (t): MenuItem => ({
            label: h(
              'span',
              '',
              t.name,
              t.to?.name && t.to.name !== t.name ? h('span', 'jr-hint', `  → ${t.to.name}`) : null
            ),
            text: t.name,
            on: t.to?.id === f.status?.id,
            pick: () =>
              void write(() =>
                jira.send('POST', `/rest/api/3/issue/${key}/transitions`, { transition: { id: t.id } })
              ),
          })
        ),
        false
      );
    });
    status.append(statusBtn);
    if (!on && cat !== 'done') {
      const take = button('Take it on in Mender', 'mender', () => hands.take(key));
      take.title = 'Its own workspace, its own branch, and a session told what this ticket says';
      status.append(take);
    }
    left.append(status);

    left.append(h('div', 'jr-section', 'Description'));
    left.append(descriptionBlock(now));

    if (children.length) {
      const done = children.filter((c) => categoryOf(c.fields.status?.statusCategory?.key) === 'done').length;
      left.append(h('div', 'jr-section', 'Child work items', h('span', 'count', `${done} of ${children.length} done`)));
      for (const child of children) left.append(issueRow(child));
    }
    const subtasks = (f.subtasks as RawIssue[] | undefined) ?? [];
    if (subtasks.length) {
      left.append(h('div', 'jr-section', 'Subtasks', h('span', 'count', String(subtasks.length))));
      for (const sub of subtasks) left.append(issueRow(sub));
    }

    const links = (f.issuelinks as {
      type: { inward: string; outward: string };
      inwardIssue?: RawIssue;
      outwardIssue?: RawIssue;
    }[] | undefined) ?? [];
    if (links.length) {
      left.append(h('div', 'jr-section', 'Linked work items'));
      const grouped = new Map<string, RawIssue[]>();
      for (const link of links) {
        const kind = link.inwardIssue ? link.type.inward : link.type.outward;
        const other = link.inwardIssue ?? link.outwardIssue;
        if (!other) continue;
        grouped.set(kind, [...(grouped.get(kind) ?? []), other]);
      }
      for (const [kind, issues] of grouped) {
        left.append(h('div', 'jr-link-kind', kind));
        for (const one of issues) left.append(issueRow(one));
      }
    }

    const attachments = (f.attachment as {
      id: string;
      filename: string;
      mimeType: string;
      content: string;
      thumbnail?: string;
      created: string;
    }[] | undefined) ?? [];
    if (attachments.length) {
      left.append(h('div', 'jr-section', 'Attachments', h('span', 'count', String(attachments.length))));
      const grid = h('div', 'jr-attachments');
      for (const a of attachments) {
        const thumb = h('div', 'thumb', a.mimeType.startsWith('image/') ? '' : a.filename.split('.').pop()?.toUpperCase() ?? '');
        if (a.thumbnail || a.mimeType.startsWith('image/'))
          void jira.image(a.thumbnail ?? a.content).then((data) => {
            if (data) thumb.style.backgroundImage = `url("${data}")`;
          });
        const tile = h('div', 'jr-attachment', thumb, h('div', 'name', a.filename));
        tile.title = `${a.filename} · ${ago(a.created)}`;
        tile.addEventListener('click', () => {
          if (a.mimeType.startsWith('image/'))
            void jira.image(a.content).then((data) => data && lightbox(data));
          else hands.outside(`${url}`);
        });
        grid.append(tile);
      }
      left.append(grid);
    }

    left.append(h('div', 'jr-section', 'Activity'));
    const tabs = h('div', 'jr-tabs');
    for (const [id, label] of [
      ['comments', 'Comments'],
      ['history', 'History'],
    ] as const)
      tabs.append(
        button(label, `subtle small${tab === id ? ' on' : ''}`, () => {
          tab = id;
          paint();
        })
      );
    left.append(tabs);
    if (tab === 'comments') {
      left.append(newComment());
      for (const c of comments) left.append(commentEl(c));
      if (!comments.length) left.append(h('div', 'jr-hint', 'No comments yet.'));
    } else {
      const histories = [...(now.changelog?.histories ?? [])].reverse();
      if (!histories.length) left.append(h('div', 'jr-hint', 'Nothing has changed yet.'));
      for (const hist of histories)
        for (const item of hist.items)
          left.append(
            h(
              'div',
              'jr-change',
              avatar(jira, personOf(hist.author)),
              h(
                'div',
                '',
                h('b', '', hist.author?.displayName ?? 'Someone'),
                ` changed the `,
                h('b', '', item.field),
                item.fromString ? ` from “${item.fromString}”` : '',
                item.toString ? ` to “${item.toString}”` : ' (cleared)',
                h('div', 'jr-hint', ago(hist.created))
              )
            )
          );
    }

    // ── right ───────────────────────────────────────────────────────────
    right = h('div', 'jr-issue-right');
    const details = h('div', 'jr-details', h('div', 'jr-details-head', 'Details'));
    for (const id of fieldOrder(now)) {
      const row = fieldRow(now, id);
      if (row) details.append(row);
    }
    right.append(details);
    right.append(
      h(
        'div',
        'jr-dates',
        h('div', '', `Created ${when(f.created as string)}`),
        h('div', '', `Updated ${ago(f.updated as string)}`),
        f.resolutiondate ? h('div', '', `Resolved ${when(f.resolutiondate as string)}`) : null,
        personOf(f.creator as never) ? h('div', '', `Created by ${(f.creator as { displayName?: string }).displayName}`) : null
      )
    );

    modal.replaceChildren(top, h('div', 'jr-modal-body', left, right));
    left.scrollTop = keepLeft;
    right.scrollTop = keepRight;
  };

  // ── pieces ────────────────────────────────────────────────────────────
  const issueRow = (one: RawIssue): HTMLElement => {
    const cat = categoryOf(one.fields.status?.statusCategory?.key);
    const row = h(
      'div',
      'jr-list-item',
      icon(jira, one.fields.issuetype?.iconUrl, one.fields.issuetype?.name ?? ''),
      h('span', 'key', one.key),
      h('span', 'grow', one.fields.summary ?? ''),
      one.fields.priority?.iconUrl ? icon(jira, one.fields.priority.iconUrl, one.fields.priority.name ?? '') : null,
      avatar(jira, personOf(one.fields.assignee)),
      h('span', `jr-lozenge ${cat}`, one.fields.status?.name ?? '')
    );
    row.addEventListener('click', () => hands.open(one.key));
    return row;
  };

  const descriptionBlock = (now: Full): HTMLElement => {
    const html = (now.renderedFields?.description as string | undefined) ?? '';
    const canEdit = Boolean(now.editmeta?.fields.description);
    if (editingDescription) {
      const box = h('div');
      const area = h('textarea', 'jr-textarea');
      area.value = adfToMarkdown(now.fields.description);
      area.style.minHeight = '220px';
      const save = (): void => {
        editingDescription = false;
        void setField('description', area.value.trim() ? markdownToAdf(area.value) : null);
      };
      area.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.metaKey) {
          event.preventDefault();
          save();
        }
        if (event.key === 'Escape') {
          event.stopPropagation();
          editingDescription = false;
          paint();
        }
      });
      box.append(
        area,
        h(
          'div',
          'jr-row-actions',
          button('Save', 'primary', save),
          button('Cancel', 'subtle', () => {
            editingDescription = false;
            paint();
          }),
          h('span', 'jr-hint', 'Markdown works: **bold**, `code`, - lists, # headings. ⌘↩ saves.')
        )
      );
      requestAnimationFrame(() => area.focus());
      return box;
    }
    const shown = html.trim()
      ? rich(jira, html, hands.outside)
      : h('div', 'jr-rich empty', canEdit ? 'Add a description…' : 'No description');
    if (!canEdit) return shown;
    shown.classList.add('jr-editable');
    shown.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) return;
      editingDescription = true;
      paint();
    });
    return shown;
  };

  const newComment = (): HTMLElement => {
    const wrap = h('div', 'jr-new-comment');
    const me = ctx.board?.self;
    const box = h('div', 'box');
    const placeholder = h('div', 'placeholder', 'Add a comment…');
    box.append(placeholder);
    placeholder.addEventListener('click', () => {
      const area = h('textarea', 'jr-textarea');
      area.style.minHeight = '100px';
      const send = (): void => {
        const text = area.value.trim();
        if (!text) return;
        void write(
          () => jira.send('POST', `/rest/api/3/issue/${key}/comment`, { body: markdownToAdf(text) }),
          'Comment added'
        );
      };
      area.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.metaKey) {
          event.preventDefault();
          send();
        }
        if (event.key === 'Escape') {
          event.stopPropagation();
          paint();
        }
      });
      box.replaceChildren(
        area,
        h('div', 'jr-row-actions', button('Save', 'primary', send), button('Cancel', 'subtle', () => paint()))
      );
      area.focus();
    });
    wrap.append(avatar(jira, me, true), box);
    return wrap;
  };

  const commentEl = (c: Comment): HTMLElement => {
    const mine = Boolean(ctx.me && c.author?.accountId === ctx.me);
    const body = h('div', 'body');
    body.append(rich(jira, c.renderedBody ?? '', hands.outside));
    const acts = h('div', 'acts');
    if (mine) {
      const edit = h('span', '', 'Edit');
      edit.addEventListener('click', () => {
        const area = h('textarea', 'jr-textarea');
        area.value = adfToMarkdown(c.body);
        area.style.minHeight = '100px';
        body.replaceChildren(
          area,
          h(
            'div',
            'jr-row-actions',
            button('Save', 'primary', () =>
              void write(() =>
                jira.send('PUT', `/rest/api/3/issue/${key}/comment/${c.id}`, { body: markdownToAdf(area.value) })
              )
            ),
            button('Cancel', 'subtle', () => paint())
          )
        );
        area.focus();
      });
      let armed = false;
      const del = h('span', '', 'Delete');
      del.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          del.textContent = 'Delete it for good?';
          del.style.color = '#f87168';
          return;
        }
        void write(() => jira.send('DELETE', `/rest/api/3/issue/${key}/comment/${c.id}`), 'Comment deleted');
      });
      acts.append(edit, del);
    }
    return h(
      'div',
      'jr-comment',
      avatar(jira, personOf(c.author), true),
      h(
        'div',
        '',
        h('span', 'who', c.author?.displayName ?? 'Someone'),
        h('span', 'when', ago(c.created)),
        body,
        acts
      )
    );
  };

  const lightbox = (data: string): void => {
    const box = h('div', 'jr-blanket');
    box.style.alignItems = 'center';
    box.style.zIndex = '40';
    const img = h('img');
    img.src = data;
    img.style.cssText = 'max-width:92%;max-height:92%;border-radius:4px;box-shadow:0 8px 24px #000a';
    box.append(img);
    box.addEventListener('click', () => box.remove());
    ctx.overlay.append(box);
  };

  // ── fields ────────────────────────────────────────────────────────────
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
    const name = meta?.name ?? now.names[id] ?? id;
    const value = now.fields[id];
    const schema = meta?.schema ?? now.schema?.[id];
    const cell = h('div', 'value');
    cell.append(display(value, schema));
    if (meta && editable(meta)) {
      cell.classList.add('edit');
      cell.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).closest('input,select,textarea,.jr-menu')) return;
        edit(now, id, meta, value, cell);
      });
    }
    const row = h('div', 'jr-field', h('div', 'name', name), cell);
    if (id === 'assignee' && ctx.me && (value as { accountId?: string } | null)?.accountId !== ctx.me) {
      const me = h('a', '', 'Assign to me');
      me.href = '#';
      me.style.fontSize = '12px';
      me.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void write(() => jira.send('PUT', `/rest/api/3/issue/${key}/assignee`, { accountId: ctx.me }));
      });
      const wrap = h('div', '', cell, me);
      return h('div', 'jr-field', h('div', 'name', name), wrap);
    }
    return row;
  };

  const display = (value: unknown, schema: Meta['schema'] | undefined): Node => {
    if (!present(value)) return h('span', 'none', schema?.system === 'assignee' ? 'Unassigned' : 'None');
    if (Array.isArray(value)) {
      const frag = h('span', '');
      frag.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
      for (const one of value) frag.append(chip(one, schema));
      return frag;
    }
    return chip(value, schema);
  };

  const chip = (value: unknown, schema: Meta['schema'] | undefined): Node => {
    if (value === null || value === undefined) return h('span', 'none', 'None');
    if (typeof value === 'string') {
      if (schema?.type === 'date') return document.createTextNode(new Date(`${value}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
      if (schema?.type === 'datetime') return document.createTextNode(when(value));
      if (schema?.items === 'string' || schema?.system === 'labels') return h('span', 'jr-label', value);
      return document.createTextNode(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') return document.createTextNode(String(value));
    const v = value as Record<string, unknown>;
    if (v.type === 'doc') return document.createTextNode(adfToMarkdown(v) || '—');
    if (typeof v.accountId === 'string') {
      const who = personOf(v as never);
      return h('span', '', avatar(jira, who), ` ${who?.name ?? ''}`);
    }
    if (typeof v.key === 'string' && v.fields)
      return h('span', '', `${v.key} `, h('span', 'jr-hint', String((v.fields as { summary?: string }).summary ?? '')));
    const iconUrl = typeof v.iconUrl === 'string' ? v.iconUrl : undefined;
    const label =
      (v.displayName as string) ??
      (v.name as string) ??
      (v.value as string) ??
      (v.title as string) ??
      (v.key as string) ??
      (typeof v.originalEstimate === 'string' ? `${v.originalEstimate} estimated` : undefined) ??
      JSON.stringify(v);
    return h('span', '', iconUrl ? icon(jira, iconUrl, label) : null, iconUrl ? ` ${label}` : label);
  };

  const editable = (meta: Meta): boolean => {
    const t = meta.schema.type;
    const c = meta.schema.custom ?? '';
    if (c.endsWith(':gh-sprint')) return Boolean(ctx.board && ctx.board.kind !== 'project');
    if (meta.schema.system === 'parent') return true;
    if (t === 'user' || t === 'priority' || t === 'issuetype' || t === 'option' || t === 'resolution' || t === 'version' || t === 'component') return true;
    if (t === 'array' && (meta.allowedValues?.length || meta.schema.items === 'string' || meta.schema.items === 'user')) return true;
    if (t === 'string' || t === 'number' || t === 'date' || t === 'datetime') return true;
    if (meta.allowedValues?.length) return true;
    return false;
  };

  const edit = (now: Full, id: string, meta: Meta, value: unknown, cell: HTMLElement): void => {
    const t = meta.schema.type;
    const c = meta.schema.custom ?? '';
    const many = t === 'array';
    const current = (Array.isArray(value) ? value : value ? [value] : []) as Record<string, unknown>[];

    const users = (query: string): Promise<MenuItem[]> =>
      jira
        .get<{ accountId: string; displayName: string; avatarUrls?: Record<string, string> }[]>(
          id === 'assignee'
            ? `/rest/api/3/user/assignable/search?issueKey=${key}&query=${encodeURIComponent(query)}&maxResults=30`
            : `/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=30`
        )
        .then((found) => [
          ...(meta.required || many
            ? []
            : [{ label: h('span', '', avatar(jira, undefined), ' Unassigned'), text: 'Unassigned', pick: () => setUser(null) }]),
          ...found.map((u) => {
            const who = personOf(u);
            const on = current.some((one) => one.accountId === u.accountId);
            return {
              label: h('span', '', avatar(jira, who), ` ${u.displayName}`),
              text: u.displayName,
              on,
              pick: () => {
                if (!many) setUser(u.accountId);
                else {
                  const ids = current.map((one) => String(one.accountId));
                  const next = on ? ids.filter((x) => x !== u.accountId) : [...ids, u.accountId];
                  void setField(id, next.map((accountId) => ({ accountId })));
                }
              },
            };
          }),
        ]);
    const setUser = (accountId: string | null): void => {
      if (id === 'assignee')
        void write(() => jira.send('PUT', `/rest/api/3/issue/${key}/assignee`, { accountId }));
      else void setField(id, accountId ? { accountId } : null);
    };

    if (t === 'user' || meta.schema.items === 'user') {
      menu(ctx.overlay, cell, users);
      return;
    }

    if (c.endsWith(':gh-sprint') && ctx.board) {
      const board = ctx.board;
      menu(ctx.overlay, cell, async () => {
        const got = await jira.get<{ values: { id: number; name: string; state: string }[] }>(
          `/rest/agile/1.0/board/${board.id}/sprint?state=active,future&maxResults=50`
        );
        return [
          { label: h('span', 'none', 'No sprint (backlog)'), text: 'none', pick: () => void setField(id, null) },
          ...got.values.map((s) => ({
            label: h('span', '', s.name, h('span', 'jr-hint', `  ${s.state}`)),
            text: s.name,
            on: current.some((one) => one.id === s.id),
            pick: () => void setField(id, s.id),
          })),
        ];
      }, false);
      return;
    }

    if (meta.schema.system === 'parent') {
      menu(ctx.overlay, cell, async (query) => {
        const project = (now.fields.project as { key?: string } | undefined)?.key ?? '';
        const text = query.trim().replace(/"/g, '');
        const jql = [
          `project = "${project}"`,
          `key != ${key}`,
          text ? (/^[A-Z][A-Z0-9_]+-\d+$/i.test(text) ? `key = "${text}"` : `summary ~ "${text}*"`) : 'issuetype in standardIssueTypes()',
        ].join(' AND ');
        const got = await jira.send<{ issues: RawIssue[] }>('POST', '/rest/api/3/search/jql', {
          jql: `${jql} ORDER BY updated DESC`,
          fields: ['summary', 'issuetype'],
          maxResults: 30,
        });
        return [
          { label: h('span', 'none', 'No parent'), text: 'none', pick: () => void setField('parent', null) },
          ...got.issues.map((one) => ({
            label: h('span', '', icon(jira, one.fields.issuetype?.iconUrl, ''), ` ${one.key} ${one.fields.summary ?? ''}`),
            text: `${one.key} ${one.fields.summary ?? ''}`,
            pick: () => void setField('parent', { key: one.key }),
          })),
        ];
      });
      return;
    }

    if (meta.allowedValues?.length) {
      const idOf = (one: Record<string, unknown>) => String(one.id ?? one.value ?? one.name);
      const labelOf = (one: Record<string, unknown>) =>
        String(one.name ?? one.value ?? one.displayName ?? one.id);
      const on = new Set(current.map(idOf));
      menu(ctx.overlay, cell, [
        ...(!meta.required && !many
          ? [{ label: h('span', 'none', 'None'), text: 'None', pick: () => void setField(id, null) }]
          : []),
        ...meta.allowedValues.map((one) => ({
          label: h(
            'span',
            '',
            typeof one.iconUrl === 'string' ? icon(jira, one.iconUrl, '') : null,
            ` ${labelOf(one)}`
          ),
          text: labelOf(one),
          on: on.has(idOf(one)),
          pick: () => {
            if (!many) void setField(id, { id: String(one.id) });
            else {
              const next = on.has(idOf(one))
                ? current.filter((x) => idOf(x) !== idOf(one))
                : [...current, one];
              void setField(id, next.map((x) => ({ id: String(x.id) })));
            }
          },
        })),
      ]);
      return;
    }

    if (t === 'array' && meta.schema.items === 'string') {
      const labels = (value as string[] | null) ?? [];
      menu(ctx.overlay, cell, async (query) => {
        const q = query.trim().replace(/\s+/g, '_');
        const got = await jira
          .get<{ suggestions?: { label: string }[] }>(
            `/rest/api/1.0/labels/suggest?query=${encodeURIComponent(q)}`
          )
          .catch(() => ({ suggestions: [] }));
        const names = [...new Set([...(q && !labels.includes(q) ? [q] : []), ...labels, ...(got.suggestions ?? []).map((s) => s.label)])];
        return names.map((label) => ({
          label: h('span', '', labels.includes(label) ? '✓ ' : '+ ', label),
          text: label,
          on: labels.includes(label),
          pick: () =>
            void setField(id, labels.includes(label) ? labels.filter((x) => x !== label) : [...labels, label]),
        }));
      });
      return;
    }

    // Text, numbers and dates are written where they stand.
    const doc = t === 'string' && (meta.schema.system === 'environment' || c.endsWith(':textarea') || (value as { type?: string } | null)?.type === 'doc');
    const input = doc ? h('textarea', 'jr-textarea') : h('input', 'jr-input');
    if (input instanceof HTMLInputElement)
      input.type = t === 'number' ? 'number' : t === 'date' ? 'date' : t === 'datetime' ? 'datetime-local' : 'text';
    input.value = doc
      ? adfToMarkdown(value)
      : t === 'datetime' && typeof value === 'string'
        ? value.slice(0, 16)
        : value === null || value === undefined
          ? ''
          : String(value);
    if (doc) input.style.minHeight = '90px';
    const save = (): void => {
      const raw = input.value.trim();
      const next =
        !raw ? null : t === 'number' ? Number(raw) : doc ? markdownToAdf(raw) : t === 'datetime' ? new Date(raw).toISOString().replace('Z', '+0000') : raw;
      void setField(id, next);
    };
    (input as HTMLElement).addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (!doc || event.metaKey)) {
        event.preventDefault();
        save();
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        paint();
      }
    });
    input.addEventListener('blur', () => {
      if (!doc) save();
    });
    cell.replaceChildren(input);
    if (doc) cell.append(h('div', 'jr-row-actions', button('Save', 'primary small', save), button('Cancel', 'subtle small', () => paint())));
    input.focus();
  };

  void load();
  return { el: blanket, refresh: () => void load() };
}

function present(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return false;
  return true;
}
