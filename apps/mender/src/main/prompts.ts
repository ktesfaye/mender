import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { createController, type Controller } from '@emdash/wire/rpc';
import { cell, expose } from '@emdash/wire/state';
import { app } from 'electron';
import { promptsContract, type Prompt } from '@shared/prompts';

const KEY = 'prompts';

/** The one Emdash starts everybody with, so the list is never empty on day one. */
const SEEDED: Prompt[] = [
  {
    id: 'review-prompt',
    title: 'Review prompt',
    prompt:
      'Review all changes in this worktree. Focus on correctness, regressions, edge cases, and missing tests. List concrete issues first, then note residual risks.',
  },
];

/** How much of a prompt names it: all of it if it is short, its first words and a mark if not. */
function titled(prompt: string): string {
  const flat = prompt.replace(/\s+/g, ' ').trim();
  if (flat.length <= 44) return flat;
  const cut = flat.slice(0, 44);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : 44)}…`;
}

export function createPromptsController(): Controller {
  const store = createJsonFileKeyValueStore({
    path: join(process.env.MENDER_DATA_DIR ?? app.getPath('userData'), 'prompts.json'),
  });
  const kept = cell<Prompt[]>([], { name: 'prompts:all' });

  const read = async (): Promise<Prompt[]> => {
    const loaded = await store.get(KEY);
    if (!loaded.success || !Array.isArray(loaded.data)) return SEEDED;
    return loaded.data as unknown as Prompt[];
  };
  const save = async (prompts: Prompt[]): Promise<void> => {
    await store.set(KEY, prompts as unknown as never);
    kept.set(prompts);
  };
  void read().then((prompts) => kept.set(prompts));

  return createController(promptsContract, {
    all: expose(promptsContract.all, { list: () => kept }),
    async keep({ prompt }) {
      const one: Prompt = { id: randomUUID(), title: titled(prompt), prompt: prompt.trim() };
      await save([...(await read()), one]);
      return one;
    },
    async forget({ id }) {
      await save((await read()).filter((one) => one.id !== id));
    },
  });
}
