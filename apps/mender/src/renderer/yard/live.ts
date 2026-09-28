/**
 * Keeping a yard current.
 *
 * A yard is a value, and the whole point of this app is that it is never the
 * same value for long: an agent says another sentence, a file changes on disk,
 * somebody else's session finishes while you are reading this one. So this
 * holds open everything the yard is made of and rebuilds it whenever any of it
 * moves.
 *
 * Which is three live models and nothing else: what the session has been up to,
 * what it works with, and where its checkout stands. Projects and the other
 * sessions in the project are fed in from outside, because the whole island is
 * already watching those and a second subscription per district would be a
 * second answer to the same question.
 */

import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import { shortName, type CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { Ask, Carried, Kit, Mood, WorkingState } from '@shared/agents';
import type { BoardVersion } from '@shared/board';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { Naming } from '../board/naming';
import { Palette } from '../board/palette';
import type { MenderClient } from '../wire';
import { yardOf } from './from';
import type { Health, Yard } from './what';

export interface Watching {
  /** Everything else moved: the task list, somebody's mood, the project. */
  moved(now: {
    project: Project;
    tasks: Task[];
    moods: Record<string, Mood>;
    /** Sessions asked for whose worktree has no row yet, by that draft id. */
    cutting?: ReadonlySet<string>;
  }): void;
  /** Which checkouts (by path) now have something noticed listening. */
  noticed(servers: ReadonlySet<string>): void;
  /** What the yard says right now, for anything that needs to ask. */
  yard(): Yard;
  /** The question at the gate, for whoever is listening for a number key. */
  asked(): Ask | null;
  /** Whether somebody is mid-sentence in there, which is what an empty line stops. */
  working(): boolean;
  /** What a slash on the line has opened, if there is one. */
  readonly slash: Palette;
  /** What an @ on the line has opened, if there is one. */
  readonly names: Naming;
  /** Something was typed, so both of those know what they are narrowing. */
  typed(text: string): void;
  /** What has been picked up off the wood and not yet handed over. */
  carrying(): readonly Carried[];
  /** Pick a picture up. What comes back is what went wrong, or nothing. */
  pickUp(file: File): Promise<string | null>;
  /** Put one down again. */
  putDown(id: string): void;
  /** Notes pinned to a diff line, waiting to go with what you next say. */
  notes(): readonly PinnedNote[];
  /** Pin one. */
  noteIt(note: PinnedNote): void;
  /** Take one back off the line before it is said. */
  unnote(id: string): void;
  /** Everything carried, and every pinned note, went with what was just said. */
  handed(): void;
  /** The wake that opening the yard sent, so the yard knows when it is over. */
  woke(wake: Promise<unknown>): void;
  close(): Promise<void>;
}

/** A note pinned to a diff line, kept in full so it can be folded into the
    next thing said the moment that happens. */
export interface PinnedNote {
  id: string;
  /** Which file, and which of its diff lines — enough to find the pinned
      mark again on that file's own board. */
  path: string;
  at: number;
  /** What it reads as, waiting by the line — `file:line`. */
  label: string;
  /** What was actually written, read back on the diff line it is pinned to. */
  note: string;
  /** `file:line — the note`, ready to fold into what is said. */
  text: string;
}

export interface Opening {
  project: Project;
  tasks: Task[];
  moods: Record<string, Mood>;
  /** The session you are standing in. A project nobody has worked has none. */
  here?: Task;
  /** Checkouts (by path) with something noticed listening on a port. */
  servers?: ReadonlySet<string>;
  /** Sessions asked for whose worktree has no row yet, by that draft id. */
  cutting?: ReadonlySet<string>;
  /** Whether walking in is about to wake whoever lives there. */
  waking?: boolean;
}

/**
 * Past this a wake that has not finished is shown anyway, however far through
 * it is. A board held behind a fire forever is worse than one still filling.
 */
const WAKE_GIVES_UP_MS = 20_000;

export async function openYard(
  client: MenderClient,
  opening: Opening,
  changed: (yard: Yard) => void
): Promise<Watching> {
  let from = opening;
  let working: WorkingState | undefined;
  let kit: Kit | undefined;
  let head: CheckoutHeadState | undefined;
  /* Whether the ground under all of this is where it said it was. Declared up
     here with everything else the yard is built from, because a live model can
     speak the moment it is subscribed to and a value the build reaches for
     before it exists takes the whole board down with it. */
  let health: Health = 'ok';
  /* The checkout's history by version, read again whenever where it stands
     moves, since that is what a new commit looks like from here. */
  let versions: BoardVersion[] | undefined;

  const shut: (() => Promise<void>)[] = [];
  /* A sleeping session comes back by reading its whole history in, a piece at
     a time, and a yard drawn over that is a yard flickering through every
     half of it. So until the wake is over the yard says only that it is
     waking. Assumed from the start, since the first thing drawn comes before
     the agent's own side has heard it is being woken; the agent's side says
     for itself from then on. */
  let assumed = Boolean(opening.waking && opening.here);
  let gaveUp = false;
  const giving = window.setTimeout(() => {
    gaveUp = true;
    again();
  }, WAKE_GIVES_UP_MS);
  shut.push(async () => window.clearTimeout(giving));
  const waking = (): boolean =>
    !gaveUp && working?.mood !== 'hurt' && (assumed || Boolean(working?.waking));
  let held: readonly Carried[] = [];
  let pinned: readonly PinnedNote[] = [];

  const again = (): void => changed(build());

  /* The slash and the @ live here rather than on the board, because what they
     offer is a fact about this session: the agent's own commands and skills,
     and the files in its own checkout. Both are narrowed by what is on the
     line, and neither reaches the agent as words. */
  const slash = new Palette();
  const names = new Naming(async (like) => {
    const task = from.here;
    return task ? await client.tasks.files({ id: task.id, like }) : [];
  }, again);

  function build(): Yard {
    return yardOf({
      project: from.project,
      tasks: from.tasks,
      moods: from.moods,
      ...(from.here ? { here: from.here } : {}),
      ...(from.servers ? { servers: from.servers } : {}),
      ...(from.cutting ? { cutting: from.cutting } : {}),
      ...(working ? { mood: working.mood } : {}),
      ...(working?.told ? { told: working.told } : {}),
      ...(kit ? { kit } : {}),
      ...(working?.asking ? { asking: working.asking } : {}),
      ...(working?.plan.length ? { plan: working.plan } : {}),
      ...(working?.room === null || working?.room === undefined ? {} : { room: working.room }),
      ...(working?.cost ? { cost: working.cost } : {}),
      ...(working?.queued.length ? { waiting: working.queued } : {}),
      ...(held.length ? { carrying: held } : {}),
      ...(pinned.length ? { pinnedNotes: pinned } : {}),
      ...(working?.failure ? { failure: working.failure } : {}),
      ...(working?.carryOn === null || working?.carryOn === undefined
        ? {}
        : { carryOn: working.carryOn }),
      on: standing(from.project, head),
      health,
      ...(versions ? { versions } : {}),
      ...(waking() ? { waking: true } : {}),
    });
  }

  const here = from.here;
  if (here) {
    const work = new ReplicaState(client.agents.work.state({ task: here.id }, 'state'), {
      onChange: (value) => {
        working = value;
        again();
      },
    });
    const gear = new ReplicaState(client.agents.kit.state({ task: here.id }, 'state'), {
      onChange: (value) => {
        kit = value;
        slash.told(value);
        again();
      },
    });
    shut.push(
      () => work.dispose(),
      () => gear.dispose()
    );
    await Promise.all([work.ready, gear.ready]);
    working = work.current();
    kit = gear.current();
    slash.told(kit ?? null);
  }

  /* Where the checkout stands is the session's own worktree when you are in
     one and the project's own folder when you are not, because a project board
     with nobody in it is still standing on a branch. */
  const where = here?.path ?? from.project.path;
  const parsed = parseNativeAbsolute(where);
  /* A checkout that is not where it was is the one thing about a project worth
     saying before anything else about it, because nothing else on the board
     means anything until it is put right. */
  if (!parsed.success) health = 'path-moved';
  /* Only the newest ask is kept, so a slow read never lands over a newer one. */
  let reading = 0;
  let readAt: string | undefined;
  const readVersions = (): void => {
    const oid = head && 'oid' in head ? head.oid : '';
    if (oid === readAt) return;
    readAt = oid;
    const mine = ++reading;
    void client.board.versions({ path: where }, { timeoutMs: 0 }).then(
      (found) => {
        if (mine !== reading) return;
        versions = found.versions;
        again();
      },
      () => {}
    );
  };
  if (parsed.success) {
    const model = client.git.checkout.model;
    const watch = new ReplicaState(model.state({ checkout: parsed.data }, 'head'), {
      onChange: (value) => {
        head = value;
        health = value ? 'ok' : 'not-git';
        readVersions();
        again();
      },
    });
    shut.push(() => watch.dispose());
    await watch.ready;
    head = watch.current();
    if (!head) health = 'not-git';
    readVersions();
  }

  return {
    moved: (now) => {
      from = { ...from, ...now };
      again();
    },
    noticed: (servers) => {
      from = { ...from, servers };
      again();
    },
    yard: build,
    asked: () => working?.asking ?? null,
    working: () => working?.mood === 'working',
    slash,
    names,
    typed: (text) => {
      slash.typed(text);
      names.typed(text);
    },
    carrying: () => held,
    pickUp: async (file) => {
      const task = from.here;
      if (!task) return 'there is nobody here to show it to.';
      const picked = await client.agents.carry(
        { task: task.id },
        /* Spelled out rather than handed over whole: what the wire wants a
           file to call its kind is not what the browser calls it. */
        {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          lastModified: file.lastModified,
          source: file.stream(),
        },
        { timeoutMs: 0 }
      );
      if (!picked.success) {
        return picked.error.kind === 'refused' ? picked.error.because : 'that would not go.';
      }
      held = [...held, picked.data];
      again();
      return null;
    },
    putDown: (id) => {
      held = held.filter((each) => each.id !== id);
      again();
      if (from.here) void client.agents.putDown({ task: from.here.id, id });
    },
    notes: () => pinned,
    noteIt: (note) => {
      pinned = [...pinned, note];
      again();
    },
    unnote: (id) => {
      pinned = pinned.filter((each) => each.id !== id);
      again();
    },
    handed: () => {
      held = [];
      pinned = [];
      again();
    },
    woke: (wake) => {
      const over = (): void => {
        if (!assumed) return;
        assumed = false;
        again();
      };
      wake.then(over, over);
    },
    close: async () => {
      await Promise.all(shut.map((run) => run()));
    },
  };
}

/**
 * The one phrase under a project's name that says where it is.
 *
 * The repository and the branch, because those are the two things you would
 * say out loud if somebody asked what you were working on. Not the path: the
 * path is a footnote and it has its own line.
 */
function standing(project: Project, head: CheckoutHeadState | undefined): string {
  const folder = project.path.replace(/\/+$/, '').split('/').at(-1) ?? project.name;
  if (!head) return folder;
  if (head.kind === 'detached') return `${folder} · adrift at ${head.shortHash}`;
  const branch = shortName(head.ref);
  if (head.kind === 'unborn') return `${folder}/${branch} · nothing committed yet`;
  const tracking = head.upstream.kind === 'none' ? undefined : head.upstream.tracking;
  if (!tracking || tracking.kind !== 'resolved') return `${folder}/${branch}`;
  const drift = [
    tracking.ahead ? `${tracking.ahead} ahead` : '',
    tracking.behind ? `${tracking.behind} behind` : '',
  ].filter(Boolean);
  return drift.length ? `${folder}/${branch} · ${drift.join(' and ')}` : `${folder}/${branch}`;
}
