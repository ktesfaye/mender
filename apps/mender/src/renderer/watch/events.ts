import { emit } from './emit';

const NAME = /[^A-Za-z0-9_.:-]/g;
const clean = (word: string): string => word.replace(NAME, '-').slice(0, 40);

/** A key or press that led to an action: the action's name only, never what it was pressed on. */
export function act(action: string, task?: string): void {
  emit('info', { msg: 'action', kind: clean(action.split(':')[0]), task });
}

let here = 'island';

/** Where the window is standing, said each time it changes: from, to and the session's opaque id. */
export function where(kind: string, task?: string): void {
  if (kind === here) return;
  emit('info', { msg: 'board changed', stage: clean(here), kind: clean(kind), task });
  here = kind;
}

/** A lantern's state as the window sees it, said when it changes. */
export function lantern(task: string, from: string | undefined, to: string | undefined): void {
  if (from === to) return;
  emit('info', {
    msg: 'lantern changed',
    task,
    stage: from ? clean(from) : 'none',
    kind: to ? clean(to) : 'gone',
  });
}
