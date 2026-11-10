import { describe, expect, it } from 'vitest';
import type { Agents } from './agents';
import type { JiraHands } from './jira';
import { createJiraLaunch } from './jira-launch';
import type { Tasks } from './tasks';

const world = (category: string) => {
  const events: string[] = [];
  const hands = {
    api: async (_site: string, method: string, path: string) => {
      if (method === 'GET' && path.includes('fields=')) {
        return {
          success: true,
          data: {
            fields: { summary: 'Wash sale info', status: { statusCategory: { key: category } } },
          },
        };
      }
      if (method === 'GET') {
        return {
          success: true,
          data: {
            transitions: [
              { id: '31', to: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } },
            ],
          },
        };
      }
      events.push('moved');
      return { success: true, data: {} };
    },
    recipe: async () => 'Work on {key}: {summary}',
    take: async () => void events.push('taken'),
  } as unknown as JiraHands;
  const tasks = {
    begin: async () => {
      events.push('begun');
      return { success: true, data: { id: 't1', title: 'x' } };
    },
  } as unknown as Tasks;
  const agents = {
    tell: async (_task: string, text: string) => {
      events.push(`told:${text}`);
      return { success: true, data: undefined };
    },
  } as unknown as Agents;
  return { events, launch: createJiraLaunch(hands, tasks, agents) };
};

describe('launching a ticket', () => {
  it('moves a to-do ticket, links the session before anything is said, then says the recipe', async () => {
    const { events, launch } = world('new');
    const done = await launch.one(
      'p',
      'x.atlassian.net',
      'INV-1',
      async () => void events.push('linked')
    );
    expect(done.ok).toBe(true);
    expect(events).toEqual([
      'moved',
      'begun',
      'taken',
      'linked',
      'told:Work on INV-1: Wash sale info',
    ]);
  });

  it('leaves a ticket that is already under way where it is', async () => {
    const { events, launch } = world('indeterminate');
    await launch.one('p', 'x.atlassian.net', 'INV-1');
    expect(events).not.toContain('moved');
  });
});
