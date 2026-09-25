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
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { Naming } from '../board/naming';
import { Palette } from '../board/palette';
import type { MenderClient } from '../wire';
import { yardOf } from './from';
import type { Health, Yard } from './what';

export interface Watching {
  /** Everything else moved: the task list, somebody's mood, the project. */
  moved(now: { project: Project; tasks: Task[]; moods: Record<string, Mood> }): void;
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
  /** Everything carried went with what was just said. */
  handed(): void;
  close(): Promise<void>;
}

export interface Opening {
  project: Project;
  tasks: Task[];
  moods: Record<string, Mood>;
  /** The session you are standing in. A project nobody has worked has none. */
  here?: Task;
}

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

  const shut: (() => Promise<void>)[] = [];
  let held: readonly Carried[] = [];

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
      ...(working ? { mood: working.mood } : {}),
      ...(working?.told ? { told: working.told } : {}),
      ...(kit ? { kit } : {}),
      ...(working?.asking ? { asking: working.asking } : {}),
      ...(working?.plan.length ? { plan: working.plan } : {}),
      ...(working?.room === null || working?.room === undefined ? {} : { room: working.room }),
      ...(working?.queued.length ? { waiting: working.queued } : {}),
      ...(held.length ? { carrying: held } : {}),
      ...(working?.failure ? { failure: working.failure } : {}),
      ...(working?.carryOn === null || working?.carryOn === undefined
        ? {}
        : { carryOn: working.carryOn }),
      on: standing(from.project, head),
      health,
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
  if (parsed.success) {
    const model = client.git.checkout.model;
    const watch = new ReplicaState(model.state({ checkout: parsed.data }, 'head'), {
      onChange: (value) => {
        head = value;
        health = value ? 'ok' : 'not-git';
        again();
      },
    });
    shut.push(() => watch.dispose());
    await watch.ready;
    head = watch.current();
    if (!head) health = 'not-git';
  }

  return {
    moved: (now) => {
      from = { ...from, ...now };
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
    handed: () => {
      held = [];
      again();
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
