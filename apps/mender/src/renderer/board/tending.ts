import type { Carrying, Picture } from '@shared/projects';
import type { Project } from '@shared/projects';
import { toolFor } from '../yard/face';
import type { Row } from './row';

/**
 * The project itself, rather than the work in it.
 *
 * Reached by pressing its name, because the name is the project. What is here
 * is what is true of the place whoever is working in it: what it looks like on
 * the rack, what it is called, what every new session takes into its worktree,
 * where it is on the disk, and at the very bottom the village forgetting it.
 *
 * Its face is picked out of its own checkout first. Nearly every repository
 * already has one — the icon a build ships, a favicon, a logo — so the board
 * finds those and lays them out in the rack's own slots, the likeliest first,
 * with the rack's stand-in beside them for a project that would rather not.
 */
export interface Tending {
  project: Project;
  /** Where it came in the island's order, which is what its stand-in is. */
  at: number;
  /** Null while its checkout is still being looked through. */
  pictures: Picture[] | null;
  more: number;
  carrying: Carrying | null;
  /** How many sessions it has, which is what forgetting it costs. */
  sessions: number;
  /** Set while a new name is being written on the line. */
  renaming?: string;
  /** Set once forgetting it has been pressed once. */
  asked?: boolean;
  /** Just moved in, so this is the first thing it is asked. */
  fresh?: boolean;
  /** What happened last, when it did not go. */
  trouble?: string;
}

/** How many faces are laid out before it asks whether to look further. */
export const FACES = 11;

export function tended(tending: Tending): Row[] {
  const { project } = tending;
  if (tending.renaming !== undefined) {
    return [
      { kind: 'title', text: project.name },
      { kind: 'line', text: project.path, tone: 'faded', keep: 'tail' },
      { kind: 'gap' },
      { kind: 'line', text: 'call it what?' },
      { kind: 'typed', text: tending.renaming },
      { kind: 'gap' },
      {
        kind: 'line',
        text: 'return to keep it. the folder keeps its own name. escape leaves it alone.',
        tone: 'faded',
      },
    ];
  }

  const rows: Row[] = [{ kind: 'title', text: project.name }];
  if (tending.fresh) {
    rows.push({
      kind: 'line',
      text: 'it has moved in. pick what it looks like on the rack, or leave it the one it was given.',
      tone: 'faded',
    });
  }

  rows.push({ kind: 'heading', text: 'on the rack' });
  rows.push(...faces(tending));

  rows.push({ kind: 'heading', text: 'its name' });
  rows.push({ kind: 'entry', mark: '', text: 'call it something else', pick: 'tend:rename' });

  rows.push({ kind: 'heading', text: 'every new session' });
  rows.push(...carried(tending.carrying));

  rows.push({ kind: 'heading', text: 'where it is' });
  rows.push({ kind: 'entry', mark: '', text: project.path, tone: 'quoted', keep: 'tail' });
  rows.push({ kind: 'entry', mark: '', text: 'show it in the finder', pick: 'tend:show' });

  rows.push({ kind: 'gap' });
  rows.push(
    tending.asked
      ? {
          kind: 'entry',
          mark: '✗',
          text: `press again — ${costOf(tending.sessions)}`,
          tone: 'sore',
          pick: 'tend:forget!',
        }
      : { kind: 'entry', mark: '✗', text: 'forget this project', pick: 'tend:forget' }
  );
  return rows;
}

function faces(tending: Tending): Row[] {
  const { project, pictures } = tending;
  const own = project.picture;
  const rows: Row[] = [];
  const laid: Extract<Row, { kind: 'faces' }>['faces'] = [
    {
      pick: 'face:none',
      said: 'the one the rack gave it',
      here: !own,
      tool: toolFor(tending.at),
    },
  ];
  /* Whatever it wears now goes first after the stand-in, even when it came
     from somewhere that is not in the checkout, so what is chosen is always on
     the board to be seen chosen. */
  const wearing = own && !pictures?.some((one) => same(one.path, own, project.path));
  if (own && project.icon && wearing) {
    laid.push({ pick: 'face:kept', said: shortOf(own), here: true, icon: project.icon, tool: '' });
  }
  for (const picture of pictures ?? []) {
    laid.push({
      pick: `face:in:${picture.path}`,
      said: `${picture.path} · ${picture.wide}×${picture.tall}`,
      here: Boolean(own && same(picture.path, own, project.path)),
      icon: picture.src,
      tool: '',
    });
  }
  rows.push({ kind: 'faces', faces: laid });

  if (pictures === null) {
    rows.push({ kind: 'line', text: 'looking through the checkout for pictures…', tone: 'faded' });
  } else if (!pictures.length) {
    rows.push({ kind: 'line', text: 'there are no pictures in this checkout.', tone: 'faded' });
  }
  if (tending.more > 0) {
    rows.push({
      kind: 'entry',
      mark: '',
      text: `${tending.more} more in the checkout`,
      pick: 'face:more',
    });
  }
  rows.push({ kind: 'entry', mark: '', text: 'one from somewhere else…', pick: 'face:own' });
  if (tending.trouble) rows.push({ kind: 'line', text: tending.trouble, tone: 'sore' });
  return rows;
}

/**
 * What every session takes into its worktree.
 *
 * A worktree is cut from what git knows, so whatever git ignores never gets
 * there: the `.env` is missing, the keys are missing, nothing is installed.
 * These are the ones this checkout has, and pressing one sends it along.
 */
function carried(carrying: Carrying | null): Row[] {
  if (!carrying) return [{ kind: 'line', text: 'asking the checkout…', tone: 'faded' }];
  const rows: Row[] = [
    {
      kind: 'line',
      text: carrying.base
        ? `is cut from ${carrying.base}, and takes nothing git ignores unless it is sent along.`
        : 'is cut from whatever is checked out, and takes nothing git ignores unless it is sent along.',
      tone: 'faded',
    },
  ];
  if (!carrying.carries.length) {
    rows.push({ kind: 'line', text: 'there is nothing ignored in here to send.', tone: 'faded' });
    return rows;
  }
  for (const one of carrying.carries) {
    rows.push({
      kind: 'entry',
      mark: one.on ? 'takes' : '',
      text: one.folder ? `${one.path}/` : one.path,
      pick: `carry:${one.on ? 'off' : 'on'}:${one.path}`,
    });
  }
  return rows;
}

function costOf(many: number): string {
  if (!many) return 'the folder stays exactly where it is';
  const sessions = many === 1 ? 'the one session' : `all ${many} sessions`;
  return `${sessions} in here go, the folder stays`;
}

/** Whether a picture in the checkout is the one it already wears. */
function same(relative: string, picture: string, checkout: string): boolean {
  return picture === relative || picture === `${checkout.replace(/\/+$/, '')}/${relative}`;
}

function shortOf(path: string): string {
  return path.split('/').at(-1) ?? path;
}
