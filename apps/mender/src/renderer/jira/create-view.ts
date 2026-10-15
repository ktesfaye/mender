import { markdownToAdf } from '@shared/jira-md';
import type { Board, Jira } from './data';
import { personOf, type Person } from './data';
import { avatar, button, h, icon, menu } from './dom';

/**
 * Jira's own Create dialog: which kind, what it is, what it says and whose
 * it is. Made from a column it lands in that column; on a scrum board it goes
 * into the running sprint, the way the board's own + does.
 */
export function createView(
  jira: Jira,
  board: Board,
  column: number,
  ctx: { overlay: HTMLElement; me?: string },
  hands: { close(): void; made(key: string): void; toast(said: string, sore?: boolean): void }
): HTMLElement {
  const blanket = h('div', 'jr-blanket');
  const modal = h('div', 'jr-modal narrow');
  blanket.append(modal);
  blanket.addEventListener('mousedown', (event) => {
    if (event.target === blanket) hands.close();
  });

  let types: { id: string; name: string; iconUrl?: string; subtask?: boolean }[] = [];
  let type = '';
  let assignee: Person | null = null;

  const typeBtn = button('Loading…', '', () => {
    menu(
      ctx.overlay,
      typeBtn,
      types.map((t) => ({
        label: h('span', '', icon(jira, t.iconUrl, t.name), ` ${t.name}`),
        text: t.name,
        on: t.id === type,
        pick: () => {
          type = t.id;
          paintType();
        },
      })),
      false
    );
  });
  const paintType = (): void => {
    const t = types.find((x) => x.id === type);
    typeBtn.replaceChildren(t ? icon(jira, t.iconUrl, t.name) : '', ` ${t?.name ?? 'Type'} ▾`);
  };

  const summary = h('input', 'jr-input');
  summary.placeholder = 'What needs doing?';
  const description = h('textarea', 'jr-textarea');
  description.placeholder = 'Markdown works';
  description.style.minHeight = '120px';

  const whoBtn = button('', '', () => {
    menu(ctx.overlay, whoBtn, async (query) => {
      const found = await jira.get<{ accountId: string; displayName: string; avatarUrls?: Record<string, string> }[]>(
        `/rest/api/3/user/assignable/search?project=${board.projectKey}&query=${encodeURIComponent(query)}&maxResults=30`
      );
      return [
        { label: h('span', '', avatar(jira, undefined), ' Unassigned'), text: 'Unassigned', pick: () => setWho(null) },
        ...found.map((u) => ({
          label: h('span', '', avatar(jira, personOf(u)), ` ${u.displayName}`),
          text: u.displayName,
          pick: () => setWho(personOf(u) ?? null),
        })),
      ];
    });
  });
  const setWho = (who: Person | null): void => {
    assignee = who;
    whoBtn.replaceChildren(avatar(jira, who ?? undefined), ` ${who?.name ?? 'Unassigned'} ▾`);
  };
  setWho(null);
  const mine = h('a', '', 'Assign to me');
  mine.href = '#';
  mine.style.cssText = 'font-size:12px;margin-left:10px';
  mine.addEventListener('click', (event) => {
    event.preventDefault();
    if (board.self) setWho(board.self);
  });

  const go = button('Create', 'primary', () => void make());
  const make = async (): Promise<void> => {
    const text = summary.value.trim();
    if (!text || !type) {
      summary.focus();
      return;
    }
    go.disabled = true;
    try {
      const made = await jira.send<{ key: string }>('POST', '/rest/api/3/issue', {
        fields: {
          project: { key: board.projectKey },
          issuetype: { id: type },
          summary: text,
          ...(description.value.trim() ? { description: markdownToAdf(description.value) } : {}),
          ...(assignee ? { assignee: { accountId: assignee.id } } : {}),
        },
      });
      if (board.sprint)
        await jira.send('POST', `/rest/agile/1.0/sprint/${board.sprint.id}/issue`, { issues: [made.key] }).catch(() => undefined);
      const into = board.columns[column];
      if (column > 0 && into) await jira.move(made.key, into.statuses).catch(() => false);
      hands.toast(`${made.key} created`);
      hands.made(made.key);
    } catch (cause) {
      go.disabled = false;
      hands.toast((cause as Error).message || 'Jira said no.', true);
    }
  };
  for (const field of [summary, description])
    (field as HTMLElement).addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (field === summary || event.metaKey)) {
        event.preventDefault();
        void make();
      }
    });

  const into = board.columns[column]?.name;
  modal.append(
    h('div', 'jr-modal-top', h('div', 'crumb', h('b', '', `Create in ${board.projectName}`), into && column > 0 ? h('span', 'jr-hint', ` · into ${into}`) : null)),
    h(
      'div',
      'jr-form',
      h('div', '', h('label', '', 'Work type'), typeBtn),
      h('div', '', h('label', '', 'Summary *'), summary),
      h('div', '', h('label', '', 'Description'), description),
      h('div', '', h('label', '', 'Assignee'), h('div', '', whoBtn, mine))
    ),
    h('div', 'jr-form-foot', button('Cancel', 'subtle', () => hands.close()), go)
  );
  requestAnimationFrame(() => summary.focus());

  void jira
    .get<{ issueTypes?: typeof types; values?: typeof types }>(
      `/rest/api/3/issue/createmeta/${board.projectKey}/issuetypes?maxResults=50`
    )
    .then((got) => {
      types = (got.issueTypes ?? got.values ?? []).filter((t) => !t.subtask);
      type = (types.find((t) => t.name === 'Task') ?? types.find((t) => t.name !== 'Epic') ?? types[0])?.id ?? '';
      paintType();
    })
    .catch(() => {
      typeBtn.textContent = 'No work types';
    });
  return blanket;
}
