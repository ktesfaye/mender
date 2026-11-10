import { readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * What kind of session a conversation is, written where the agent worker can
 * read it before it starts one.
 *
 * Which tools a session is handed is fixed the moment its agent starts, and
 * the worker that starts it is another process with no way to ask the app.
 * So the app writes down, by the agent's own conversation id, which sessions
 * are a lead (who may only talk, watch and launch, never touch code) and
 * which are crew under one, and the worker reads this synchronously, once,
 * as the session is made. Nothing else reads it.
 */
export type Role = { role: 'lead' } | { role: 'crew'; lead: string };

export const rolesFile = (door: string): string => join(dirname(door), 'roles.json');

export function readRole(file: string, conversation: string): Role | undefined {
  try {
    const all = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Role>;
    return all[conversation];
  } catch {
    return undefined;
  }
}

let line: Promise<unknown> = Promise.resolve();

/** Set one conversation's role, or take it off with `null`. Writes are queued so none overwrites another. */
export function writeRole(file: string, conversation: string, role: Role | null): Promise<void> {
  const next = line.then(async () => {
    let all: Record<string, Role> = {};
    try {
      all = JSON.parse(await readFile(file, 'utf8')) as Record<string, Role>;
    } catch {
      all = {};
    }
    if (role) all[conversation] = role;
    else delete all[conversation];
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(all));
    await rename(tmp, file);
  });
  line = next.catch(() => undefined);
  return next;
}
