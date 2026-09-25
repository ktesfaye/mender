import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { knacksFor } from './kit';

describe('knacksFor', () => {
  let worktree: string | undefined;

  afterEach(async () => {
    if (worktree) await rm(worktree, { recursive: true, force: true });
    worktree = undefined;
  });

  it('says an agent with no notion of a skill keeps none', async () => {
    const found = await knacksFor('an-agent-nobody-taught', undefined);
    expect(found).toEqual({ supported: false, knacks: [] });
  });

  it('reads a project skill from the agent-specific folder it actually looks in', async () => {
    worktree = await mkdtemp(join(tmpdir(), 'mender-kit-'));
    const skill = join(worktree, '.qwen', 'skills', 'reviewer');
    await mkdir(skill, { recursive: true });
    await writeFile(join(skill, 'SKILL.md'), 'description: reviews things\n');

    const found = await knacksFor('qwen', worktree);
    expect(found.supported).toBe(true);
    expect(found.knacks).toContainEqual({
      name: 'reviewer',
      about: 'reviews things',
      from: 'here',
    });
  });
});
