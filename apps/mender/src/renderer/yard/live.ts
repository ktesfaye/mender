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
import type { Ask, Carried, Glance, Kit, Mood, WorkingState } from '@shared/agents';
import type { BoardVersion } from '@shared/board';
import type { FiveHours } from '@shared/five-hours';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { Naming } from '../board/naming';
import { Palette } from '../board/palette';
import type { MenderClient } from '../wire';
import { yardOf } from './from';
import { onThisMachine } from './pictures';
import type { Health, Signboard, Yard } from './what';

export interface Watching {
  /** Everything else moved: the task list, somebody's mood, the project. */
  moved(now: {
    project: Project;
    tasks: Task[];
    moods: Record<string, Mood>;
    /** Sessions asked for whose worktree has no row yet, by that draft id. */
    cutting?: ReadonlySet<string>;
    /** What each lantern says beyond its mood. */
    glances?: Readonly<Record<string, Glance>>;
    /** Sessions done with something you have not been in to see, and when. */
    unread?: ReadonlyMap<string, number>;
    /** The project's workspaces; an empty list is its own folder alone. */
    workspaces?: readonly Signboard[];
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
  /** Pick one just put down back up, the way undo puts a deleted word back. */
  pickBack(id: string): void;
  /** Pictures already handed over, picked back up off a turn called off before anything came of it. */
  carryBack(pictures: readonly (Carried & { path?: string })[]): void;
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
  glances?: Readonly<Record<string, Glance>>;
  unread?: ReadonlyMap<string, number>;
  /** Whether walking in is about to wake whoever lives there. */
  waking?: boolean;
  /** The one you are standing in is still being made, and this is how. Until
      it is, there is nobody in there to ask anything of. */
  settingUp?: string;
  /** The project's workspaces; an empty list is its own folder alone. */
  workspaces?: readonly Signboard[];
}

/**
 * Past this a wake that has not finished is shown anyway, however far through
 * it is. A board held behind a fire forever is worse than one still filling.
 */
const WAKE_GIVES_UP_MS = 20_000;

/** How often a standing yard asks after the five hours between turns. */
const WINDOW_EVERY_MS = 90_000;

/** The last history read off each checkout, to stand in while it is read again. */
const readBefore = new Map<string, BoardVersion[]>();

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
  /* The subscription's five-hour window, one meter for the whole account.
     Read when the yard opens, again whenever a turn here finishes, since that
     is when it moves, and every so often besides so a yard left standing
     still says the truth. */
  let fiveHours: FiveHours | undefined;

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
  /* The picture itself, kept here while it is carried so pointing at it on
     the line can show it. */
  const previews = new Map<string, string>();
  const letGo = (id: string): void => {
    const url = previews.get(id);
    if (url) URL.revokeObjectURL(url);
    previews.delete(id);
  };
  /* Put down off the line but not let go of yet, because undo can put it
     straight back. Only once something is said, or the yard closes, is it
     really gone. */
  const aside = new Map<string, Carried>();
  const letAsideGo = (): void => {
    for (const id of aside.keys()) {
      letGo(id);
      if (from.here) void client.agents.putDown({ task: from.here.id, id });
    }
    aside.clear();
  };
  shut.push(async () => letAsideGo());
  let pinned: readonly PinnedNote[] = [];

  const again = (): void => changed(build());

  let readingWindow = false;
  const readWindow = (): void => {
    if (readingWindow) return;
    readingWindow = true;
    void client.appSettings.fiveHours({}, { timeoutMs: 0 }).then(
      (read) => {
        readingWindow = false;
        fiveHours = read;
        again();
      },
      () => {
        readingWindow = false;
      }
    );
  };
  readWindow();
  const rereading = window.setInterval(readWindow, WINDOW_EVERY_MS);
  shut.push(async () => window.clearInterval(rereading));

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
      ...(from.settingUp ? { settingUp: from.settingUp } : {}),
      ...(from.servers ? { servers: from.servers } : {}),
      ...(from.cutting ? { cutting: from.cutting } : {}),
      ...(from.glances ? { glances: from.glances } : {}),
      ...(from.unread ? { unread: from.unread } : {}),
      ...(from.workspaces ? { workspaces: from.workspaces } : {}),
      ...(working ? { mood: working.mood } : {}),
      ...(working?.told ? { told: working.told } : {}),
      ...(kit ? { kit } : {}),
      ...(working?.asking ? { asking: working.asking } : {}),
      ...(working?.plan.length ? { plan: working.plan } : {}),
      ...(working?.room === null || working?.room === undefined ? {} : { room: working.room }),
      ...(working?.cost ? { cost: working.cost } : {}),
      ...(working?.queued.length ? { waiting: working.queued } : {}),
      ...(held.length
        ? {
            carrying: held.map((one) => {
              const preview = previews.get(one.id);
              return preview ? { ...one, preview } : one;
            }),
          }
        : {}),
      ...(pinned.length ? { pinnedNotes: pinned } : {}),
      ...(working?.failure ? { failure: working.failure } : {}),
      ...(working?.carryOn === null || working?.carryOn === undefined
        ? {}
        : { carryOn: working.carryOn }),
      on: standing(from.project, head),
      health,
      ...(versions ? { versions } : {}),
      ...(fiveHours ? { fiveHours } : {}),
      ...(waking() ? { waking: true } : {}),
    });
  }

  const here = from.settingUp ? undefined : from.here;
  if (here) {
    const work = new ReplicaState(client.agents.work.state({ task: here.id }, 'state'), {
      onChange: (value) => {
        /* A turn coming to rest is when the window has moved. */
        const rested =
          value?.told?.ended &&
          (working?.told?.ended !== value.told.ended || working?.mood === 'working');
        working = value;
        if (rested && value.mood !== 'working') readWindow();
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
  const where = here?.path || from.project.path;
  /* What was last read here, or in the project's own folder, stands until the
     read comes back: the changelog is the place's, and a switch between two
     sessions that took it down and put it back up was the place blinking. */
  versions ??= readBefore.get(where) ?? readBefore.get(from.project.path);
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
        readBefore.set(where, found.versions);
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
      previews.set(picked.data.id, URL.createObjectURL(file));
      held = [...held, picked.data];
      again();
      return null;
    },
    putDown: (id) => {
      const one = held.find((each) => each.id === id);
      if (!one) return;
      held = held.filter((each) => each !== one);
      aside.set(id, one);
      again();
    },
    pickBack: (id) => {
      const one = aside.get(id);
      if (!one) return;
      aside.delete(id);
      held = [...held, one];
      again();
    },
    carryBack: (pictures) => {
      held = [...held, ...pictures.map(({ id, name, mime }) => ({ id, name, mime }))];
      for (const one of pictures) {
        if (!one.path) continue;
        void onThisMachine(one.path).then((url) => {
          if (!url || !held.some((each) => each.id === one.id)) return;
          previews.set(one.id, url);
          again();
        });
      }
      again();
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
      for (const one of held) letGo(one.id);
      held = [];
      letAsideGo();
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
