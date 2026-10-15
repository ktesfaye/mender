import type { JiraBoard, JiraIssue, JiraLink, JiraTicket } from '@shared/jira';
import type { Row } from './row';
import { saying } from './writing';

/**
 * A project's Jira board, laid over its yard like a notice board outside an
 * inn.
 *
 * The columns are the board's own, in its own order and under its own names,
 * so a work board with five columns and a personal one with three both read as
 * themselves. Every ticket is a note pinned under the column it stands in; the
 * ones a session here is working on carry that session's light, the done ones
 * are weathered into the wood, and the ones that are yours are pinned brighter
 * than the team's.
 *
 * The words around it — what board this is, what you can do — are rows like
 * every other board in the village. Only the notes themselves are drawn, since
 * a board of columns was never going to read as a list of lines.
 */

export interface Lit {
  task: string;
  name: string;
  /** Its lantern's mood: working, arriving, asking, resting, hurt or empty. */
  mood: string;
}

/** A mood, the way a lantern on the rail says it. */
const SAYS: Record<string, string> = {
  working: 'working',
  arriving: 'waking',
  asking: 'wants you',
  resting: 'done',
  hurt: 'broken',
  empty: 'idle',
};
const says = (mood: string): string => SAYS[mood] ?? 'idle';

export interface Quest {
  project: string;
  link: JiraLink | null;
  phase: 'reading' | 'not-connected' | 'linking' | 'board' | 'ticket' | 'failed';
  said?: string;
  picks?: { site: string; key: string; name: string }[];
  board?: JiraBoard;
  ticket?: JiraTicket;
  /** A new ticket's summary, being written. */
  written?: string;
  /** Set while Jira is being told something. */
  waiting?: string;
  lit: Record<string, Lit>;
}

/** How many done tickets stay on the board before the rest fold into a count. */
const DONE_SHOWN = 4;

export function questRows(q: Quest): Row[] {
  if (q.phase === 'reading')
    return [
      { kind: 'title', text: `${q.project}'s board` },
      { kind: 'line', text: 'reading it off Jira…', tone: 'faded' },
    ];
  if (q.phase === 'not-connected')
    return [
      { kind: 'title', text: `${q.project}'s board` },
      { kind: 'line', text: 'nothing on this Mac is connected to Jira yet.', tone: 'faded' },
      { kind: 'gap' },
      { kind: 'entry', mark: '+', text: 'connect a Jira site', pick: 'jira-connect' },
    ];
  if (q.phase === 'failed')
    return [
      { kind: 'title', text: `${q.project}'s board` },
      { kind: 'prose', text: q.said ?? 'Jira did not answer.', tone: 'sore' },
      { kind: 'gap' },
      { kind: 'entry', mark: '↻', text: 'try again', pick: 'jira-again' },
      { kind: 'entry', mark: '⇄', text: 'tie it to a different board', pick: 'jira-relink' },
    ];
  if (q.phase === 'linking') {
    const rows: Row[] = [
      { kind: 'title', text: `which board is ${q.project}'s?` },
      { kind: 'line', text: 'picking one ties it to this project.', tone: 'faded' },
      { kind: 'gap' },
    ];
    if (!q.picks) rows.push({ kind: 'line', text: 'asking Jira…', tone: 'faded' });
    else if (!q.picks.length)
      rows.push({ kind: 'line', text: 'no projects on the connected sites.', tone: 'faded' });
    for (const one of q.picks ?? [])
      rows.push({
        kind: 'entry',
        mark: '→',
        text: `${one.name}   ${one.key} · ${one.site.replace('.atlassian.net', '')}`,
        keep: 'tail',
        pick: `jira-link:${one.site} ${one.key}`,
      });
    rows.push(
      { kind: 'gap' },
      { kind: 'entry', mark: '+', text: 'connect another site', pick: 'jira-connect' }
    );
    return rows;
  }
  if (q.phase === 'ticket')
    return q.ticket
      ? ticketRows(q, q.ticket)
      : [{ kind: 'line', text: q.waiting ?? 'reading it off Jira…', tone: 'faded' }];
  return boardRows(q);
}

function boardRows(q: Quest): Row[] {
  const board = q.board;
  if (!board) return [];
  const open = board.issues.filter((one) => one.category !== 'done').length;
  const rows: Row[] = [
    { kind: 'title', text: `what needs doing in ${q.project}` },
    {
      kind: 'line',
      tone: 'faded',
      text: [
        `${board.key} on ${board.site.replace('.atlassian.net', '')}`,
        board.sprint,
        `${open} open`,
      ]
        .filter(Boolean)
        .join(' · '),
    },
    { kind: 'gap' },
  ];
  if (q.waiting) rows.push({ kind: 'line', text: q.waiting, tone: 'faded' });
  else if (q.written !== undefined)
    rows.push({
      kind: 'line',
      text: 'what needs doing? write it on the line, return pins it up.',
      tone: 'faded',
    });
  else
    rows.push(
      { kind: 'entry', mark: '+', text: 'pin a new one', pick: 'jira-new' },
      { kind: 'entry', mark: '↗', text: 'open it in jira', pick: 'jira-open' }
    );
  return rows;
}

function ticketRows(q: Quest, t: JiraTicket): Row[] {
  const rows: Row[] = [
    { kind: 'prose', text: t.summary },
    {
      kind: 'line',
      tone: 'faded',
      text: [t.key, t.type.toLowerCase(), t.status.toLowerCase(), t.priority?.toLowerCase()]
        .filter(Boolean)
        .join(' · '),
    },
  ];
  if (t.epic) rows.push({ kind: 'line', text: `under ${t.epic}`, tone: 'faded', keep: 'tail' });
  const people = [
    t.assignee ? `${t.assignee}'s` : 'nobody has it',
    t.reporter ? `asked for by ${t.reporter}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  rows.push({ kind: 'line', text: people, tone: 'faded' }, { kind: 'gap' });

  const lit = q.lit[t.key];
  if (q.waiting) rows.push({ kind: 'line', text: q.waiting, tone: 'faded' });
  else {
    if (lit)
      rows.push({
        kind: 'entry',
        mark: '◆',
        text: `walk into ${lit.name}, ${says(lit.mood)}`,
        pick: `jira-session:${lit.task}`,
      });
    rows.push({
      kind: 'entry',
      mark: '→',
      text: lit ? 'take it on again, in another copy' : 'take this on',
      pick: 'jira-take',
    });
    const board = q.board;
    if (board) {
      const here = board.columns.findIndex((column) =>
        column.statuses.includes(board.issues.find((one) => one.key === t.key)?.statusId ?? '')
      );
      board.columns.forEach((column, at) => {
        if (at !== here)
          rows.push({
            kind: 'entry',
            mark: '·',
            text: `move it to ${column.name.toLowerCase()}`,
            pick: `jira-move:${at}`,
          });
      });
    }
    rows.push({ kind: 'entry', mark: '↗', text: 'open it in jira', pick: 'jira-open-ticket' });
  }
  if (t.description.trim()) {
    rows.push(
      { kind: 'gap' },
      { kind: 'heading', text: 'what it says' },
      ...saying(t.description, undefined)
    );
  }
  return rows;
}

/** What a session taking a ticket on is told first. */
export function briefOf(recipe: string, t: JiraTicket): string {
  return recipe
    .replaceAll('{key}', t.key)
    .replaceAll('{summary}', t.summary)
    .replaceAll('{url}', t.url)
    .replaceAll('{description}', t.description || '(no description)')
    .trim();
}

export interface QuestHands {
  open(key: string): void;
  /** A note let go over another column. */
  moved(key: string, column: number): void;
}

/** The notes themselves, under their columns. */
export function questBoard(q: Quest, hands: QuestHands): HTMLElement | undefined {
  const board = q.board;
  if (q.phase !== 'board' || !board) return undefined;
  const root = document.createElement('div');
  root.className = 'quest';
  board.columns.forEach((column, at) => {
    const col = document.createElement('div');
    col.className = 'quest-col';
    const all = board.issues.filter((one) => column.statuses.includes(one.statusId));
    const done = column.category === 'done';
    const shown = sorted(all, done).slice(0, done ? DONE_SHOWN : undefined);
    const head = document.createElement('div');
    head.className = 'quest-head';
    const name = document.createElement('span');
    name.textContent = column.name.toLowerCase();
    const count = document.createElement('span');
    count.textContent = String(all.length);
    head.append(name, count);
    col.appendChild(head);
    const list = document.createElement('div');
    list.className = 'quest-list';
    for (const issue of shown) list.appendChild(note(issue, done, q.lit[issue.key], hands));
    if (all.length > shown.length) {
      const more = document.createElement('div');
      more.className = 'quest-more';
      more.textContent = `and ${all.length - shown.length} before that`;
      list.appendChild(more);
    }
    col.appendChild(list);
    col.addEventListener('dragover', (event) => {
      event.preventDefault();
      col.classList.add('over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', (event) => {
      event.preventDefault();
      col.classList.remove('over');
      const key = event.dataTransfer?.getData('text/x-jira');
      if (
        key &&
        !column.statuses.includes(board.issues.find((one) => one.key === key)?.statusId ?? '')
      )
        hands.moved(key, at);
    });
    root.appendChild(col);
  });
  return root;
}

/** Yours first, then whatever moved last. */
function sorted(issues: JiraIssue[], done: boolean): JiraIssue[] {
  return [...issues].sort((a, b) =>
    done ? b.updated.localeCompare(a.updated) : Number(b.mine) - Number(a.mine)
  );
}

function note(
  issue: JiraIssue,
  done: boolean,
  lit: Lit | undefined,
  hands: QuestHands
): HTMLElement {
  const card = document.createElement('div');
  card.className = `quest-note${done ? ' worn' : ''}${issue.mine ? ' mine' : ''}${lit ? ` lit ${lit.mood}` : ''}`;
  card.draggable = true;
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData('text/x-jira', issue.key);
    card.classList.add('held');
  });
  card.addEventListener('dragend', () => card.classList.remove('held'));
  card.addEventListener('click', () => hands.open(issue.key));
  const key = document.createElement('div');
  key.className = 'quest-key';
  key.textContent = issue.key;
  const title = document.createElement('div');
  title.className = 'quest-title';
  title.textContent = issue.summary;
  card.append(key, title);
  const meta = [
    issue.epic,
    issue.type.toLowerCase() === 'bug' ? 'bug' : '',
    issue.priority && /high|highest|p0|p1|critical|blocker/i.test(issue.priority)
      ? issue.priority.toLowerCase()
      : '',
  ].filter(Boolean);
  if (meta.length && !done) {
    const line = document.createElement('div');
    line.className = 'quest-meta';
    line.textContent = meta.join(' · ');
    card.appendChild(line);
  }
  if (!done && issue.assignee && !issue.mine) {
    const who = document.createElement('div');
    who.className = 'quest-who';
    who.textContent = issue.assignee;
    card.appendChild(who);
  }
  if (lit) {
    const by = document.createElement('div');
    by.className = 'quest-lit';
    const ember = document.createElement('span');
    ember.className = 'quest-ember';
    const said = document.createElement('span');
    said.textContent = `${lit.name} · ${says(lit.mood)}`;
    by.append(ember, said);
    card.appendChild(by);
  }
  return card;
}
