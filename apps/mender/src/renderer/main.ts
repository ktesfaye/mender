import {
  formatAbsolute,
  joinAbsolute,
  parseNativeAbsolute,
  type PortableRelativePath,
} from '@emdash/core/primitives/path/api';
import type { HostDependencyView } from '@emdash/core/primitives/host-dependencies/api';
import type { FileContentModel } from '@emdash/core/runtimes/files/api';
import {
  gitContract,
  shortName,
  type Commit,
  type FileChange,
  type GitFilePath,
} from '@emdash/core/runtimes/git/api';
import type { WorkspaceRecord } from '@emdash/core/runtimes/workspace-registry/api';
import { ReplicaState } from '@emdash/wire/live';
import { CAMP, Document, extentOf, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { Mood } from '@shared/agents';
import type { Hand, ProviderConfig } from '@shared/app-settings';
import type { At, Change } from '@shared/changes';
import type { FoundFrom, Project } from '@shared/projects';
import type { Prompt } from '@shared/prompts';
import type { Task } from '@shared/tasks';
import { branchMade, branchUnmade, unbranchMade } from './board/branch';
import { browsing, openPage, safe as safeAddress } from './board/browsing';
import { openCard, transcriptMarkdown, type LiveCard } from './board/card';
import { lineNumberOf, opening, readOut, unreadable, type Noting } from './board/changed';
import { committing } from './board/committing';
import { conflict, conflictMessage } from './board/conflict';
import { landingLines, openCheckout, type Landing, type LiveBoard } from './board/district';
import { chordFor, FIND, finding, type Standing as Where } from './board/finder';
import { openTree, type LiveTree } from './board/inside';
import { hunting, type Hunt } from './board/looking';
import { amending as amendBoard, made, unmade, unread } from './board/made';
import type { Offer } from './board/offer';
import { keptNow, type Meant } from './board/palette';
import { read, unopened, type Read } from './board/reading';
import type { Row } from './board/row';
import { sent, toHand, toHandCheck, type Sent } from './board/sent';
import { shell } from './board/shell';
import { openShell, type LiveShell } from './board/talking';
import { refused, trouble, unwritten } from './board/trouble';
import { tuiSession } from './board/tui-session';
import { openTuiTerminal, type LiveTuiTerminal } from './board/tui-terminal';
import { answerFor, SEND_ALL } from './board/work';
import { ran } from './job';
import { setPace } from './pace';
import { createCamera, flyOut, flyToYard, frame, type Extent } from './village/camera';
import { Folk, loadFolk, type Standing } from './village/folk';
import { Ground, type Aim } from './village/ground';
import { loadKit } from './village/kit';
import './yard/tokens.css';
import { say } from './village/notice';
import { buildScene } from './village/scene';
import { wire, type MenderClient } from './wire';
import { openFounding, type Founding } from './yard/founding';
import { dim, makeLayer } from './yard/frame';
import { openYard, type Watching } from './yard/live';
import { showMissed } from './yard/missed';
import { showQuitCost } from './yard/quit';
import { FACES, openSettings, type Settings, type SettingsState } from './yard/settings';
import { makeShelf } from './yard/shelf';
import { loadCuts } from './yard/sprite';
import {
  keepsBranch,
  openWindmill,
  type MachineSample,
  type WorktreeRow,
  type Windmill,
} from './yard/windmill';
import { makeYard } from './yard/yard';

/** The kinds of picture an agent can actually be shown. */
const CARRIED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Which files a folder walk offers to show as a picture rather than read. */
const PICTURE = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
function isPicture(path: string): boolean {
  return PICTURE.test(path);
}
/** How wide a picture is asked for, sized to a board comfortably. */
const PICTURE_WIDTH = 640;

/** Now, as a filename-safe stamp, for the one file this app writes unasked. */
function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * You open Mender and you see the village.
 *
 * Nothing else is on the screen: no title bar full of buttons, no sidebar, no
 * tab strip. The island is composed in the main process out of the state the
 * app is actually in — which projects exist, which tasks are running in them —
 * and drawn here. Everything the app can do arrives as something standing on
 * it, and everything it has to say arrives on one wooden board.
 */
async function boot(): Promise<void> {
  const pixi = new Application();
  await pixi.init({
    resizeTo: window,
    background: '#2d5d6b',
    antialias: false,
    roundPixels: true,
    preference: 'webgl',
    /* ONE ANIMATION LOOP, NOT TWO. Pixi gives an application a ticker of its
       own unless told otherwise, and pixi-viewport puts its update on the
       shared one — so the default here was two independent loops running the
       island side by side forever. */
    sharedTicker: true,
  });
  setPace(pixi);
  pixi.renderer.canvas.style.imageRendering = 'pixelated';
  document.body.appendChild(pixi.canvas);

  const camera = createCamera(pixi);
  const world = new Container();
  camera.addChild(world);

  try {
    say('waking the village…');
    const [client] = await Promise.all([wire(), loadKit(), loadFolk()]);
    /* The plank along the bottom used to carry the projects. It carries the
       sessions of whatever project you are in now, so the projects moved to a
       rack in the corner and the old plank is not drawn at all. */
    await loadCuts();
    const layer = makeLayer();
    const shelf = makeShelf(layer.root, (id) => void go(`project:${id}`));

    /* What was half-written on a session's line, kept against that session so
       it is still there after the app itself restarts. Written a moment
       after the keys stop, not on every one of them. */
    const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const saveDraft = (task: string, text: string): void => {
      const already = draftTimers.get(task);
      if (already) clearTimeout(already);
      draftTimers.set(
        task,
        setTimeout(() => {
          draftTimers.delete(task);
          void client.agents.setDraft({ task, text });
        }, 400)
      );
    };

    const yard = makeYard(layer, {
      open: (id) => void go(`task:${id}`),
      answer: (id, requestId) => void answered(id, requestId),
      press: (pick) => press(pick),
      typed: (text) => {
        /* A real terminal is open: every key is its own, including the ones
           that land here because a click put the keyboard back on this line
           instead. Handing it straight back is how "the terminal is what is
           open" stays true no matter how the keyboard got away from it. */
        if (talking) {
          talking.shell?.focus();
          return;
        }
        /* One line, and whatever is open decides what is being written on it:
           a name for a new session, a new name for this one, a commit message,
           something to look for, or something to say to the agent. */
        if (naming || titling || writing || looking || hunt || reading?.noting) {
          wrote(text);
          return;
        }
        watching?.typed(text);
        yard.narrowing(...narrowing());
        /* Half-written and said to nobody yet: kept against the session it
           was written in, so it is still there after the app restarts. */
        if (inside) saveDraft(inside.id, text);
      },
      say: (text) => {
        if (talking) {
          talking.shell?.focus();
          return;
        }
        if (reading?.noting) {
          pinNote();
          return;
        }
        if (naming) {
          void begin();
          return;
        }
        if (titling) {
          void retitle();
          return;
        }
        if (writing) {
          void commit();
          return;
        }
        void tell(text);
      },
      leave: () => void backOut(),
    });

    /* Escape's whole ladder lives at the bottom of this file, and the yard is
       built at the top of it, so the yard is handed the way out rather than
       reaching for it. */
    let backOut: () => void = () => {};

    /**
     * Put something on the line, from anywhere but the keyboard.
     *
     * A path picked out of the @, a command picked out of the slash, a line
     * thrown away by Escape. All of them go through here so the two things
     * narrowing underneath always hear about it; the line itself tells them
     * when the change came from a hand on the keys.
     */
    const said = (text: string): void => {
      yard.line.write(text);
      watching?.typed(text);
      if (watching) yard.show(watching.yard());
      yard.narrowing(...narrowing());
      yard.line.take();
    };

    /** What the yard is standing on, while it is up. */
    let watching: Watching | null = null;

    /**
     * The lines under the one you are writing on.
     *
     * A slash turns them into everything you could mean and an @ into every
     * file in the checkout. Only ever one of them: an @ inside a command is
     * still an @, and the nearer thing wins.
     */
    const narrowing = (): [Offer[], number] =>
      watching?.names.open
        ? [watching.names.offers(), watching.names.from]
        : watching?.slash.open
          ? [watching.slash.offers(), watching.slash.from]
          : [[], 0];

    /**
     * One surface at a time.
     *
     * The yard and the old wooden board are two different things and are never
     * both up: anything still drawn on wood covers the yard while it is open
     * and gives it back afterwards. The wood is on its way out; until every
     * board it still carries has been moved onto the yard's own scrim, this is
     * what keeps them from being written over each other.
     */
    const wood = (rows: Row[], terminal?: HTMLElement): void => {
      /* Anything opened from inside a project is laid over its yard rather
         than shown instead of it: the world drops to silhouettes, a wash comes
         down over the middle and the right, and what you asked for is written
         on that. The gatepost and the rail stay exactly where they were.

         Anything opened from the island has no yard to be laid over, so for
         the moment it is still drawn on wood. That is the last of the board
         left, and it goes when the island's own boards come across. */
      dim(pixi.canvas, 'reading');
      /* Out on the island there is no yard to lay anything over, so only the
         line and the wash come up. The village behind stays the whole picture
         either way; nothing here is ever a screen somewhere else. */
      if (!yard.showing) yard.up(true, true);
      const asks = prompting();
      yard.reading({
        trail: wayHome(),
        rows,
        ...(asks ? { asks } : {}),
        ...(terminal ? { terminal } : {}),
      });
    };

    /**
     * The same surface again, for a board that has changed under you.
     *
     * Every board in this app is live: a file changes on disk, a commit lands,
     * an agent says another sentence. Nothing here decides what the board says
     * — it is handed the rows again and writes them where they already were.
     */
    const rewrite = (rows: Row[], terminal?: HTMLElement): void => {
      if (!yard.open) return;
      const asks = prompting();
      yard.reading({
        trail: wayHome(),
        rows,
        ...(asks ? { asks } : {}),
        ...(terminal ? { terminal } : {}),
      });
    };

    /**
     * The checkout this yard stands on, laid over it.
     *
     * Where the branch stands, what is uncommitted in it, what was done in it
     * lately, and the handful of things you can do about any of that. It is a
     * footnote to the work rather than the point of it, which is why it is
     * something you open rather than something the yard already says.
     */
    const openCheckoutBoard = async (): Promise<void> => {
      const aim = open;
      const project = aim ? projectOn(aim.district) : undefined;
      if (!aim || !project) return;
      const where = inside ?? project;
      const session = inside;
      const was = live;
      live = null;
      landing = null;
      conflicted = null;
      await was?.close();
      wood([{ kind: 'line', text: 'reading the checkout…', tone: 'faded' }]);
      const opened = await openCheckout(
        client,
        {
          name: 'name' in where ? where.name : project.name,
          path: where.path,
          ...(session ? { since: session.base ?? null } : {}),
          ...(session?.base ? { tail: () => landingLines(landing) } : {}),
          servers: () => servers.get(where.path) ?? [],
        },
        (rows) => {
          if (open === aim && plainCheckout()) rewrite(rows);
        }
      );
      if (open !== aim) {
        await opened.close();
        return;
      }
      live = opened;
      wood(opened.rows());
      if (session?.base) void refreshLanding(aim, session, project);
    };

    /** How the session's branch stands against the base it was cut from, asked
        for fresh after opening the board and after every merge attempt. */
    const refreshLanding = async (aim: Aim, session: Task, project: Project): Promise<void> => {
      const base = session.base;
      if (!base) return;
      const parsed = parseNativeAbsolute(session.path);
      if (!parsed.success) return;
      const got = await client.git.checkout.compareRef({ checkout: parsed.data, ref: base });
      if (open !== aim || inside !== session || !live) return;
      landing = got.success
        ? { base, ahead: got.data.ahead, behind: got.data.behind, landed: got.data.landed }
        : null;
      if (plainCheckout()) rewrite(live.rows());
      void project;
    };

    /** Bringing the base in, or landing this session's branch into it — the
        one operation both turn out to be, aimed at whichever checkout the
        merge belongs in. */
    const merging = async (mode: 'bring' | 'land'): Promise<void> => {
      const aim = open;
      const session = inside;
      const project = aim ? projectOn(aim.district) : undefined;
      if (!aim || !session?.base || !project) return;
      const target = mode === 'bring' ? session.path : project.path;
      const ref = mode === 'bring' ? session.base : session.branch;
      const parsed = parseNativeAbsolute(target);
      if (!parsed.success) return;
      say(mode === 'bring' ? 'bringing it in…' : 'landing it…', 30000);
      const done = await client.git.checkout.model.mutate('merge', {
        key: { checkout: parsed.data },
        input: { ref },
      });
      if (!done.success) {
        if (done.error.type === 'conflict') {
          conflicted = {
            aim,
            checkout: target,
            base: mode === 'bring' ? session.base : `${session.base} (as ${ref})`,
            mode,
            files: done.error.conflictedFiles ?? [],
          };
          wood(conflict(conflicted.base, conflicted.files, false));
          return;
        }
        say(trouble(done.error), 6000);
        return;
      }
      say(mode === 'bring' ? 'brought in.' : 'landed.', 3000);
      void refreshLanding(aim, session, project);
    };

    /** Handing a stopped merge to whoever is working here, as the next thing
        said on the gatepost. */
    const handConflict = (): void => {
      const on = conflicted;
      if (!on) return;
      said(conflictMessage(on.base, on.files));
      conflicted = null;
      home();
    };

    /** Giving up on a stopped merge, on the second press. Nothing here is
        lost: the merge itself is the only thing undone. */
    const abortMerge = async (sure: boolean): Promise<void> => {
      const on = conflicted;
      if (!on) return;
      if (!sure) {
        conflicted = { ...on, asked: true };
        rewrite(conflict(on.base, on.files, true));
        return;
      }
      const parsed = parseNativeAbsolute(on.checkout);
      if (!parsed.success) return;
      await client.git.checkout.model.mutate('mergeAbort', {
        key: { checkout: parsed.data },
        input: {},
      });
      conflicted = null;
      say('given up. the checkout is back where it was.', 4000);
      home();
    };

    /* Whether the checkout board is the thing being read right now.
     *
     * It stays open and stays live under everything opened from it — a file, a
     * commit, the folder, the shell, what is open for the branch — so "there is
     * a live checkout" is not the same question as "the checkout is on the
     * screen". Answering the first one let a git refresh write the checkout
     * over whatever you had actually opened, trail and all. */
    const plainCheckout = (): boolean =>
      Boolean(live) &&
      !reading &&
      !writing &&
      !looked &&
      !branchLooked &&
      !walking &&
      !talking &&
      !sending &&
      !hunt &&
      !naming &&
      !titling &&
      !looking &&
      !conflicted &&
      !card;

    /**
     * Back to the yard itself, with nothing laid over it.
     *
     * Every step of backing out ends here: whatever was being read comes down,
     * the world comes back up from silhouettes, and the yard is written again
     * from whatever it says now rather than from what it said when you opened
     * the thing you have just closed.
     */
    const home = (): void => {
      if (live) {
        const was = live;
        live = null;
        void was.close();
      }
      if (!watching) return;
      yard.reading(null);
      dim(pixi.canvas, 'yard');
      yard.show(watching.yard());
      yard.line.take();
    };

    /**
     * The way home, one step per level, written across the top of whatever you
     * opened.
     *
     * Read off where you actually are rather than kept as a list, because the
     * state already says it and two records of the same thing is how they come
     * apart. Every step but the last is pressable, and Escape walks the same
     * steps one at a time.
     */
    const wayHome = (): { said: string; go?: () => void }[] => {
      const back = (): void => hand.escaped();
      const steps: { said: string; go?: () => void }[] = [{ said: 'yard', go: back }];
      if (looking) steps.push({ said: 'looking for something', go: back });
      if (naming) steps.push({ said: 'a new session', go: back });
      if (titling)
        steps.push({
          said: titling.mode === 'mcp' ? 'a server' : titling.mode === 'skill' ? 'a skill' : 'its name',
          go: back,
        });
      if (live) steps.push({ said: 'the checkout', go: back });
      if (walking) steps.push({ said: 'files', go: back });
      if (hunt) steps.push({ said: 'looking', go: back });
      if (looked) steps.push({ said: 'history', go: back });
      if (branchLooked) steps.push({ said: 'everything this session changed', go: back });
      if (writing) steps.push({ said: 'a commit', go: back });
      if (talking) steps.push({ said: talking.name, go: back });
      if (sending) steps.push({ said: 'what is open', go: back });
      if (card) steps.push({ said: 'who works here', go: back });
      if (reading) steps.push({ said: shortly(reading.path), go: back });
      if (opened) steps.push({ said: shortly(opened.path), go: back });
      const last = steps.at(-1);
      if (last) delete last.go;
      return steps;
    };

    /** The last thing in a path, which is the only part worth a breadcrumb. */
    const shortly = (path: string): string => path.split('/').at(-1) ?? path;

    /** What the line asks for while a particular thing is open. */
    const prompting = (): 'file' | 'changes' | undefined =>
      reading ? 'changes' : opened ? 'file' : undefined;
    let drawn = await draw(world, client);
    let projects = await client.projects.list({});
    let tasks: Task[] = [];
    /* A session that has been asked for but whose worktree is still being cut
       has no row in the registry yet, so it is not in `tasks` at all. It still
       hangs a lantern, dark and saying so, rather than the rail pretending
       nothing was asked until the cutting finishes. */
    const cutting = new Map<string, Task>();
    const tasksFor = (projectId: string): Task[] => [
      ...tasks.filter((task) => task.project === projectId),
      ...[...cutting.values()].filter((task) => task.project === projectId),
    ];
    frame(camera, drawn.island);
    /* The window is not its real size when the renderer starts — it is
       restored to whatever it was last time a moment later — so the opening
       shot has to be taken again once it settles, or the island sits small in
       a corner of a window it was never measured against. Only while nothing
       is open: once you are looking at something, the camera is yours. */
    window.addEventListener('resize', () => {
      if (!open) frame(camera, drawn.island);
    });
    pixi.ticker.add((ticker) => {
      drawn.ground.tick(ticker);
      drawn.folk.tick(ticker);
    });

    /** The place the board is standing in front of, while it is in. */
    let open: Aim | null = null;
    let live: LiveBoard | null = null;
    /** The task that board belongs to. */
    let inside: Task | null = null;
    /** How this session's branch stands against the base it was cut from. */
    let landing: Landing | null = null;
    /** A merge that stopped on a conflict, laid over the checkout board. */
    let conflicted: {
      aim: Aim;
      checkout: string;
      base: string;
      mode: 'bring' | 'land';
      files: string[];
      asked?: boolean;
    } | null = null;
    /** Set while the board is showing what that session works with. */
    let card: LiveCard | null = null;
    /** A project's settings, while that window is up over everything. */
    let settings: { ui: Settings; state: SettingsState } | null = null;
    /** Founding a project, while that board is up over the island. */
    let founding: Founding | null = null;
    /** The windmill, while that window is up over everything. */
    let windmill: Windmill | null = null;
    /* Which file's change is on the board, over the checkout it came from.
       The checkout board underneath stays open and stays live; it is simply
       not what the wood is showing. */
    let reading: {
      aim: Aim;
      path: string;
      at?: At;
      change?: Change;
      asked?: boolean;
      /** A note being written against one of this file's diff lines. */
      noting?: Noting;
    } | null = null;
    /* Which commit is on the board, over the checkout it came from. A commit
       is stepped into the same way a change is, and a file pressed inside one
       reads the change that commit made to it. */
    /* Which folder of the checkout is on the board, if you have walked into
       it, and which file of it is open over that. */
    let walking: LiveTree | null = null;
    /* The tree kept open for the checkout you are in, so walking back into it
       is instant and never races its own teardown. */
    let kept: { path: string; tree: LiveTree } | null = null;
    let opened: Read | null = null;
    /* Kept live while a file is open, so an agent writing to it out from under
       you shows here the same way a checkout's own status does. Disposed
       whenever `opened` stops meaning this file. */
    let openedLive: ReplicaState<FileContentModel> | null = null;
    let openingGen = 0;
    /* The one board you last Escaped all the way out of in this checkout, so
       wanting it back a minute later is one key rather than walking to it
       again. Deliberately narrow: the file or the folder, the two boards this
       area owns. */
    let lastLeft: { kind: 'file'; path: string } | { kind: 'folder' } | null = null;
    /* Set while the checkout is being searched rather than walked. */
    let hunt: (Hunt & { checkout: string; asked: number }) | null = null;
    /* The shell running in this checkout, while its board is the one open. */
    /* `shell` is a plain shell's own live terminal most of the time, and an
       agent's own CLI running raw when the session behind it is a terminal
       one instead — the same slot, the same cleanup, whichever it is. */
    let talking: { shell: LiveShell | LiveTuiTerminal | null; name: string } | null = null;
    /* A browser laid over the yard, showing one page. `url` is what is
       actually loaded; `written` is what the foot-of-board line currently
       says, which differs from it while an address is being typed. */
    let browsingAt: { url: string; written: string; el: HTMLElement } | null = null;
    /* What each checkout's own shell has noticed listening, most recent
       first. Never asked for; only ever noticed in what the shell printed. */
    const servers = new Map<string, string[]>();
    /* What is open against the other end for this checkout's branch. */
    let sending: (Sent & { repository: string; number?: number }) | null = null;
    let looked: {
      aim: Aim;
      checkout: string;
      commit: Commit | null;
      files: readonly FileChange[] | undefined;
      isHead?: boolean;
      asked?: boolean;
    } | null = null;
    /** Set while the board is reading everything a session's branch changed
        against the base it grew out of. */
    let branchLooked: {
      aim: Aim;
      checkout: string;
      base: string;
      mergeBase: string;
      files: readonly FileChange[] | undefined;
    } | null = null;
    /* Saying a commit differently. The same write-line a new one is said on,
       just aimed at `--amend` instead of a fresh commit. */
    let amending: { aim: Aim; checkout: string; hash: string; written: string } | null = null;
    /* The commit being written, if one is. Nothing is staged and nothing is
       committed until return: what is held back lives here until then. */
    let writing: {
      aim: Aim;
      checkout: string;
      name: string;
      held: Set<string>;
      written: string;
    } | null = null;
    /** Set while a name for something new is being written on the wood. */
    let naming: {
      district: District;
      project: Project;
      slot: number | null;
      written: string;
      /** The one just taken down here, if putting it back up is still on offer. */
      revivable: { title: string } | null;
      /** In its own terminal — the agent's own CLI, raw — rather than the
          ordinary chat yard. */
      terminal: boolean;
      /** The project's open issues, offered as a way to name and start the
          session; `null` means never asked, an empty array means asked and
          none came back or `gh` had nothing to say. */
      issues?: { number: number; title: string }[] | null;
      /** Whether the issue list is what is on the board right now, rather
          than the ordinary typed name. */
      pickingIssue?: boolean;
      /** Start it already allowing everything, the agent's own most
          permissive mode, applied the moment it is awake to hear it. */
      allowAll: boolean;
    } | null = null;
    /** Set while an existing session is being called something else, or —
        the same one line, the same keys — while a custom server is being
        named for the card. */
    let titling: { task: Task; written: string; mode?: 'title' | 'mcp' | 'skill' } | null = null;
    /** Set while the board is the finder, and what has been typed into it. */
    let looking: { written: string; from: Spot } | null = null;
    /** What everybody is doing, as the main process sees it. */
    let seen: Record<string, Mood> = {};

    /* Where you have been, so you can go back. One list, one finger on it:
       arriving somewhere new cuts off whatever you had gone back from, which
       is the only behaviour anybody has ever expected of this. */
    let trail: Spot[] = [{ kind: 'island' }];
    let step = 0;
    /** Set while the trail is walking itself, so it does not record its own
        footsteps as new places. */
    let retracing = false;

    /** Where you are standing, which decides what there is to do. */
    const standing = (): Where =>
      card ? 'card' : inside ? 'session' : open ? 'district' : 'island';

    const spot = (): Spot =>
      inside
        ? { kind: 'task', id: inside.id, card: Boolean(card) }
        : open
          ? { kind: 'project', id: projectOn(open.district)?.id ?? '' }
          : { kind: 'island' };

    const arrived = (): void => {
      if (retracing || looking) return;
      const now = spot();
      if (same(trail[step], now)) return;
      trail = [...trail.slice(0, step + 1), now].slice(-40);
      step = trail.length - 1;
      // And the app opens where you left it. Closing an app is not the same as
      // being finished with what was on the screen.
      try {
        localStorage.setItem('mender.where', JSON.stringify(now));
      } catch {
        // A window with no storage is a window that opens on the island.
      }
    };

    const projectOn = (district: District): Project | undefined =>
      projects.find((candidate) => candidate.district === district.id);
    const tasksOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasks.filter((task) => task.project === project.id) : [];
    };
    /* Which house a session stands in, which is scenery and nothing else:
       it decides where a villager is drawn and never what anything opens. */
    /** The first building on a district nobody is in, if there is one. */
    const freeSlot = (district: District): number | null => {
      const taken = new Set(tasksOn(district).map((task) => task.slot));
      for (let slot = 0; slot < drawn.ground.room(district); slot += 1) {
        if (!taken.has(slot)) return slot;
      }
      return null;
    };

    /* The rail carries one peg per project and nothing else. Where the work
       is happening is the project's own board to say; this is only how you
       walk from one village to the next. */
    const paintRail = (): void => {
      const here = open ? projectOn(open.district) : undefined;
      shelf.show(
        projects.map((project, at) => ({
          id: project.id,
          name: project.name,
          at,
          here: project.id === here?.id,
          ...(project.icon ? { icon: project.icon } : {}),
          ...(wantsOf(project.id) ? { wants: wantsOf(project.id) } : {}),
        }))
      );
    };

    /**
     * Every session that wants him, island-wide, worst and oldest first.
     *
     * The same rule the rack's own light and the notification banner read
     * off `seen`: hurt outranks asking, and merely working is not "wants
     * you." `tasks` is already in the order sessions were cut in, which is
     * the closest thing to "how long has it been asking" this house keeps.
     */
    const waiting = (): Task[] => [
      ...tasks.filter((task) => seen[task.id] === 'hurt'),
      ...tasks.filter((task) => seen[task.id] === 'asking'),
    ];

    /**
     * Stand in whichever yard wants him most.
     *
     * Pressed again from inside one, it goes to the next — a bad morning
     * with three sessions asking things is three presses apart. The
     * notification's own click lands on this same door (`go('task:…')`),
     * not a second way in that could disagree with this one.
     */
    const attendNext = (): void => {
      const list = waiting();
      if (!list.length) return;
      const here = inside?.id;
      const at = here ? list.findIndex((task) => task.id === here) : -1;
      const next = list[(at + 1) % list.length];
      if (next) go(`task:${next.id}`);
    };

    /**
     * The worst thing anybody in a project wants, if anything does.
     *
     * The same mood map that lights every lantern and every house window,
     * folded down to one project: hurt outranks asking, and everything else —
     * working, resting, arriving — is not a reason to light the rack, which
     * only ever answers "does somebody want me," not "is anybody home."
     */
    const wantsOf = (project: string): 'asking' | 'hurt' | undefined => {
      let worst: 'asking' | 'hurt' | undefined;
      for (const task of tasks) {
        if (task.project !== project) continue;
        const mood = seen[task.id];
        if (mood === 'hurt') return 'hurt';
        if (mood === 'asking') worst = 'asking';
      }
      return worst;
    };

    /**
     * What a pressed thing means, wherever it was pressed.
     *
     * A peg on the rail and a line on the board say the same words, so they
     * are answered in the same place: a project takes you to its board, a
     * session opens it, and the one you are already inside is how you call it
     * something else.
     */
    const go = (id: string): void => {
      // The finder is a board like any other, so picking something on it is
      // picking that thing: it steps out of the way first and then answers.
      if (looking && id !== FIND) looking = null;
      if (id === 'new') {
        const district = open?.district;
        if (district) askName({ kind: 'district', district }, freeSlot(district));
        return;
      }
      if (id === FIND) {
        look();
        return;
      }
      if (id === 'do:found') {
        openFound();
        return;
      }
      if (id === 'do:windmill') {
        openTheWindmill();
        return;
      }
      if (id === 'hunt') {
        hunted(false);
        return;
      }
      if (id === 'do:reopen') {
        if (lastLeft?.kind === 'file') void openFile(lastLeft.path);
        else if (lastLeft?.kind === 'folder') void walkIn();
        return;
      }
      if (id === 'do:out') {
        void (async () => {
          await shut();
          flyOut(camera, drawn.island);
          arrived();
        })();
        return;
      }
      if (id === 'do:back' || id === 'do:forward') {
        void retrace(id === 'do:back' ? -1 : 1);
        return;
      }
      if (id === 'do:attend') {
        attendNext();
        return;
      }
      // Taking back something you said while it was busy. It never reached the
      // agent, so nothing has to be undone — it just stops waiting.
      if (id.startsWith('unsay:')) {
        const task = inside;
        if (task) void client.agents.unsay({ task: task.id, id: id.slice(6) });
        return;
      }
      if (id === 'do:rename') {
        if (inside) askTitle(inside);
        return;
      }
      // Turning the board over, which is the same move whichever way it is
      // facing: it is one board showing one of two things about one session.
      if (id === 'card') {
        const task = inside;
        const aim = open;
        if (task && aim) void (card ? openTask(aim, task) : showCard(aim, task));
        return;
      }
      if (id.startsWith('rail:')) {
        /* The rail carries the sessions of whatever project you are in, so a
           number walks into one of those. Out on the island there is no rail
           and the numbers are the projects on the shelf instead. */
        const at = Number(id.slice(5));
        const here = open ? tasksOn(open.district) : [];
        if (here.length) {
          const task = here[at];
          if (task) go(`task:${task.id}`);
          return;
        }
        const project = projects[at];
        if (project) go(`project:${project.id}`);
        return;
      }
      if (id.startsWith('project:')) {
        const project = projects.find((candidate) => candidate.id === id.slice(8));
        const district = project && drawn.districts.get(project.district ?? '');
        // A peg always takes you to that project, never away from it: pressing
        // the one you are standing on is how you get back out of a session.
        if (district) void openDistrict({ kind: 'district', district });
        return;
      }
      if (!id.startsWith('task:')) return;
      const task = tasks.find((candidate) => candidate.id === id.slice(5));
      if (!task) return;
      const district = drawn.districts.get(
        projects.find((project) => project.id === task.project)?.district ?? ''
      );
      if (district) void openTask({ kind: 'district', district }, task);
    };

    /** Open the finder over whatever you were looking at. */
    const look = (): void => {
      looking = { written: '', from: spot() };
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      wood(finding('', { projects, tasks, moods: seen, where: standing() }));
      /* From nowhere, every time. The mark outlives a board on purpose, so
         without this the finder opens standing on whatever row it was left on
         last time and steps one further from there, which lands it two or
         three rows down a list it just drew fresh. */
      yard.walk.stand(null);
      yard.walk.step(1);
    };

    /** Put the board back on whatever the finder was opened over. */
    const unlook = async (): Promise<void> => {
      const was = looking;
      looking = null;
      if (was) await visit(was.from);
    };

    /** Walk the trail one step, without laying a new one. */
    const retrace = async (by: number): Promise<void> => {
      const next = step + by;
      const going = trail[next];
      if (!going) return;
      step = next;
      retracing = true;
      try {
        await visit(going);
      } finally {
        retracing = false;
      }
    };

    /** Stand somewhere the trail remembers, or somewhere it was told. */
    const visit = async (going: Spot): Promise<void> => {
      if (going.kind === 'island') {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      if (going.kind === 'project') {
        const project = projects.find((each) => each.id === going.id);
        const district = project && drawn.districts.get(project.district ?? '');
        if (district) await openDistrict({ kind: 'district', district });
        else {
          await shut();
          flyOut(camera, drawn.island);
        }
        return;
      }
      const task = tasks.find((each) => each.id === going.id);
      const district =
        task && drawn.districts.get(projects.find((p) => p.id === task.project)?.district ?? '');
      // Somewhere that is not there any more puts you back out on the water,
      // rather than leaving you looking at whatever was already on the board.
      if (!task || !district) {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      const aim: Aim = { kind: 'district', district };
      await openTask(aim, task);
      if (going.card) await showCard(aim, task);
    };

    /** Put a checkout on the island. The one thing the campfire is for. */
    const settle = async (from?: FoundFrom): Promise<void> => {
      const moved = await found(
        client,
        async () => {
          await shut();
          drawn = await draw(world, client);
          projects = await client.projects.list({});
          people();
          frame(camera, drawn.island);
        },
        from
      );
      /* And the first thing a project that has just moved in is asked is what
         it looks like, standing in its own yard, with the pictures its checkout
         already has laid out to choose from. */
      const district = moved && drawn.districts.get(moved.district);
      if (!moved || !district) return;
      await openDistrict({ kind: 'district', district });
      const project = projects.find((one) => one.id === moved.id);
      if (project) configure(project, true);
    };

    /** What the campfire opens: which of the three ways a checkout arrives. */
    const openFound = (): void => {
      founding?.close();
      founding = openFounding({
        folder: () => void settle(),
        clone: (url) => void settle({ kind: 'clone', url }),
        create: (name, isPrivate) => void settle({ kind: 'create', name, private: isPrivate }),
        closed: () => {
          founding = null;
        },
      });
    };

    /** The windmill: the app's own settings, reached the same way any other
        doing is until it has an island of its own to stand on. */
    const openTheWindmill = (): void => {
      windmill?.close();
      const state = {
        hand: null as string | null,
        hands: null as Hand[] | null,
        worktrees: null as WorktreeRow[] | null,
        machine: null as MachineSample | null,
        providers: {} as Record<string, ProviderConfig>,
        installs: {} as Record<string, HostDependencyView>,
      };
      let records: ReplicaState<Record<string, WorkspaceRecord>> | null = null;
      const readProviders = (hands: Hand[]): void => {
        for (const hand of hands.filter((one) => one.here)) {
          void client.appSettings
            .providerConfig({ agent: hand.id }, { timeoutMs: 0 })
            .then((config) => {
              state.providers = { ...state.providers, [hand.id]: config };
              ui.update(state);
            });
        }
      };
      const ui = openWindmill(state, {
        choose: async (id) => {
          state.hand = await client.appSettings.setDefaultHand({ id }, { timeoutMs: 0 });
          ui.update(state);
        },
        clear: async (row) => {
          const done = await client.workspaces.deleteWorktree({
            workspaceId: row.id,
            deleteBranch: !keepsBranch(row),
          });
          if (!done.success) say(worktreeTrouble(done.error), 6000);
        },
        setExtraArgs: async (agent, extraArgs) => {
          const config = await client.appSettings.setExtraArgs({ agent, extraArgs }, { timeoutMs: 0 });
          state.providers = { ...state.providers, [agent]: config };
        },
        setEnvVar: async (agent, key, value) => {
          const config = await client.appSettings.setEnvVar({ agent, key, value }, { timeoutMs: 0 });
          state.providers = { ...state.providers, [agent]: config };
        },
        removeEnvVar: async (agent, key) => {
          const config = await client.appSettings.removeEnvVar({ agent, key }, { timeoutMs: 0 });
          state.providers = { ...state.providers, [agent]: config };
        },
        selectInstall: async (agent, path) => {
          const view = await client.host.snapshot.mutate('setSelection', {
            key: undefined,
            input: { id: agent, selection: { kind: 'path', path } },
          });
          if (view.success) state.installs = { ...state.installs, [agent]: view.data.data };
        },
        closed: () => {
          if (windmill === ui) windmill = null;
          void records?.dispose();
          clearInterval(sampling);
          yard.line.take();
        },
      });
      windmill = ui;
      // A number counting up rather than a spinner, resampled every few
      // seconds while the windmill is actually open.
      const sample = (): void => {
        void client.resourceUsage.sample(undefined, { timeoutMs: 0 }).then((done) => {
          if (!done.success) return;
          state.machine = {
            cpuPercent: done.data.cpu.usedPercent,
            memUsedBytes: done.data.memory.usedBytes,
            memTotalBytes: done.data.memory.totalBytes,
            diskUsedBytes: done.data.disk.usedBytes,
            diskTotalBytes: done.data.disk.totalBytes,
          };
          ui.update(state);
        });
      };
      sample();
      const sampling = setInterval(sample, 5000);
      void (async () => {
        const [hand, hands] = await Promise.all([
          client.appSettings.defaultHand({}, { timeoutMs: 0 }),
          client.appSettings.hands({}, { timeoutMs: 0 }),
        ]);
        state.hand = hand;
        state.hands = hands;
        ui.update(state);
        readProviders(hands);
        const hostReplica = new ReplicaState(client.host.snapshot.state(undefined, 'current'), {
          onChange: (snap) => {
            state.installs = snap.dependencies;
            ui.update(state);
          },
        });
        await hostReplica.ready;
        state.installs = hostReplica.current().dependencies;
        ui.update(state);
        void hostReplica.dispose();
      })();
      const measured = new Map<string, number | null>();
      const measure = (id: string): void => {
        void client.workspaces.measureUsage({ workspaceId: id }).then((done) => {
          measured.set(id, done.success ? done.data.totalBytes : null);
          state.worktrees =
            state.worktrees?.map((row) =>
              row.id === id ? { ...row, bytes: measured.get(id) ?? null } : row
            ) ?? null;
          ui.update(state);
        });
      };
      // How much of a worktree a second press would actually throw away: the
      // same question a session's own takedown asks of its checkout, asked
      // here of a worktree nothing is currently open on.
      const uncommitted = new Map<string, number | null>();
      const preflight = (id: string, path: string): void => {
        const parsed = parseNativeAbsolute(path);
        if (!parsed.success) {
          uncommitted.set(id, null);
          return;
        }
        const status = new ReplicaState<{ kind: string; entries?: Record<string, unknown> }>(
          client.git.checkout.model.state({ checkout: parsed.data }, 'status'),
          { onChange: () => {} }
        );
        void status.ready.then(() => {
          uncommitted.set(id, Object.keys(status.current()?.entries ?? {}).length);
          state.worktrees =
            state.worktrees?.map((row) =>
              row.id === id ? { ...row, uncommitted: uncommitted.get(id) ?? null } : row
            ) ?? null;
          ui.update(state);
          void status.dispose();
        });
      };
      records = new ReplicaState<Record<string, WorkspaceRecord>>(
        client.workspaces.records.state(undefined, 'list'),
        {
          onChange: (all) => {
            const paths = new Set(tasks.map((task) => task.path));
            const rows: WorktreeRow[] = Object.values(all)
              .filter((each) => each.kind === 'worktree')
              .map((each) => ({
                id: each.id,
                branch: each.git?.branch ?? null,
                path: each.path,
                bytes: measured.has(each.id) ? (measured.get(each.id) ?? null) : null,
                stale: Boolean(each.git?.prunable) || !paths.has(each.path),
                uncommitted: uncommitted.has(each.id) ? (uncommitted.get(each.id) ?? null) : null,
                unsent: each.git?.ahead ?? null,
              }))
              .sort((a, b) => (b.stale ? 1 : 0) - (a.stale ? 1 : 0));
            state.worktrees = rows;
            ui.update(state);
            for (const row of rows) {
              if (!measured.has(row.id)) measure(row.id);
              if (!uncommitted.has(row.id)) preflight(row.id, row.path);
            }
          },
        }
      );
    };

    const worktreeTrouble = (error: { type: string }): string =>
      `that worktree would not clear: ${error.type}.`;

    const shut = async (): Promise<void> => {
      open = null;
      naming = null;
      titling = null;
      looking = null;
      inside = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      /* Out of the district altogether, so the checkout's watcher goes too. */
      letGoOfTree();
      stopTalking();
      sending = null;
      const shown = card;
      card = null;
      await shown?.close();
      yard.up(false);
      dim(pixi.canvas, 'island');
      const held = watching;
      watching = null;
      await held?.close();
      paintRail();
      const was = live;
      live = null;
      await was?.close();
    };

    /**
     * Stand in a project's yard, and keep standing there until something else.
     *
     * With a session it is that session's yard; without one it is the project
     * with nobody in it, which is a yard with no fire and every lantern on the
     * rail dark. Either way the village behind stays visible and dims, rather
     * than a board sliding over it.
     */
    const showYard = async (aim: Aim, project: Project, here?: Task): Promise<void> => {
      const was = live;
      live = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      /* A different checkout is a different tree, so the one being held goes. */
      if (kept && kept.path !== (here?.path ?? project.path)) letGoOfTree();
      else stopWalking();
      stopTalking();
      sending = null;
      inside = here ?? null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();
      const held = watching;
      watching = null;
      await held?.close();

      open = aim;
      naming = null;
      titling = null;
      yard.up(true);
      yard.reading(null);
      dim(pixi.canvas, 'yard');
      paintRail();

      const opened = await openYard(
        client,
        {
          project,
          tasks: tasksFor(project.id),
          moods: seen,
          ...(here ? { here } : {}),
          servers: servingCheckouts(),
          ...(cutting.size ? { cutting: new Set(cutting.keys()) } : {}),
        },
        (now) => {
          if (open === aim && !reading && !looked && !walking && !talking && !sending && !card) {
            yard.show(now);
            yard.narrowing(...narrowing());
            /* A place nobody has touched for days is darker than one somebody
               is standing in. Age is carried by the light, never by a date. */
            if (!yard.open) dim(pixi.canvas, now.session?.cold ? 'stale' : 'yard');
          }
        }
      );
      if (open !== aim) {
        await opened.close();
        return;
      }
      watching = opened;
      yard.show(opened.yard());
      yard.narrowing(...narrowing());
      yard.line.take();
      /* And wake whoever lives in there. A session keeps its checkout and its
         transcript across a restart but the agent is not running, and a
         sleeping agent cannot say what it can do — so walking into the yard is
         what starts it, not the first thing you say. */
      // A terminal-kind session wakes over the TUI runtime instead — see
      // `openTuiTask`, which calls `showYard` for the rail and gatepost and
      // then takes the board itself over.
      if (here && here.kind !== 'terminal') {
        void client.agents.wake({ task: here.id }, { timeoutMs: 0 });
        /* Whatever was half-written last time is still on the line. */
        void client.agents.draft({ task: here.id }).then((text) => {
          if (open === aim && text && !yard.line.written()) said(text);
        });
      }
    };

    /**
     * What a project's board is: everything running in it.
     *
     * You open a district to get at the work, so the work is what is on the
     * wood — every session in it under the name it gave itself, what each one
     * is doing, and a line that starts another. The checkout underneath is a
     * footnote at the bottom, because the folder is not the point.
     */
    /* Whether the project board is asking about being forgotten. Nothing on
       the board keeps this: it is a question, and a question you walked away
       from is not one. */

    /* Opening a district is one move with two halves: the camera pulls in on
       its land, aiming at the part of the window the board is about to leave,
       and the board comes in from the right with everything running in there
       written on it. Neither waits for the other. */
    const openDistrict = async (aim: Aim): Promise<void> => {
      const project = projectOn(aim.district);
      if (!project) return;
      flyToYard(camera, aim.district);
      /* You open a project to get at the work in it, so you land in the work:
         whichever session you were last in, or none if it has never had one. */
      const standing = tasksOn(aim.district);
      const last = lastIn.get(project.id);
      const here = standing.find((task) => task.id === last) ?? standing[0];
      await showYard(aim, project, here);
      arrived();
    };

    /* Which session you were last standing in, per project, so walking back
       into a district puts you where you left rather than at its first. */
    const lastIn = new Map<string, string>();

    /**
     * What the session works with, on the same board the conversation was on.
     *
     * This is the whole answer to how the board shows something else: the rail
     * does it, the same way it changes which session you are looking at. There
     * is still one board and it is still showing one thing.
     */
    const showCard = async (aim: Aim, task: Task): Promise<void> => {
      const was = live;
      live = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      inside = task;
      const opened = await openCard(client, task, (rows) => {
        if (open === aim && card) rewrite(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      card = opened;
      paintRail();
      wood(opened.rows());
      arrived();
    };

    /**
     * A project's settings, in a window of their own over everything.
     *
     * Not laid over the yard like the rest, because it is not about the work
     * in there: nothing under it moves, and closing it leaves you exactly
     * where you were. It opens at once with what is known and fills in as the
     * checkout answers, since reading every picture in it takes a moment.
     */
    const configure = (project: Project, fresh = false): void => {
      settings?.ui.close();
      const state: SettingsState = {
        project,
        at: Math.max(
          0,
          projects.findIndex((one) => one.id === project.id)
        ),
        pictures: null,
        more: 0,
        carrying: null,
        scripts: null,
        github: null,
        sessions: tasks.filter((task) => task.project === project.id).length,
        ...(fresh ? { fresh } : {}),
      };
      let shown = FACES;
      const redraw = (): void => {
        if (settings?.state === state) settings.ui.update(state);
      };
      const look = async (many: number): Promise<void> => {
        const found = await client.projects.pictures({ id: project.id, many }, { timeoutMs: 0 });
        state.pictures = found.pictures;
        state.more = found.more;
        redraw();
      };
      /* The project changed under the window: the rack wears it at once, and
         so does the name at the top of the yard underneath. */
      const refreshed = async (): Promise<void> => {
        projects = await client.projects.list({});
        paintRail();
        const now = projects.find((one) => one.id === project.id);
        if (!now) return;
        state.project = now;
        const here = open ? projectOn(open.district) : undefined;
        if (watching && here?.id === now.id) {
          watching.moved({
            project: now,
            tasks: tasksFor(now.id),
            moods: seen,
          });
        }
        redraw();
      };
      const ui = openSettings(state, {
        face: async (from) => {
          const done = await client.projects.picture({ id: project.id, from }, { timeoutMs: 0 });
          if (!done.success) {
            if (done.error.kind === 'cancelled') return null;
            return done.error.kind === 'unreadable'
              ? `${done.error.path.split('/').at(-1)} would not open as an image.`
              : 'That project is not here any more.';
          }
          await refreshed();
          return null;
        },
        more: () => {
          shown = (state.pictures?.length ?? shown) + 24;
          void look(shown);
        },
        rename: async (name) => {
          await client.projects.rename({ id: project.id, name });
          await refreshed();
        },
        carry: (path, on) =>
          void (async () => {
            state.carrying = await client.projects.carry(
              { id: project.id, path, on },
              { timeoutMs: 0 }
            );
            redraw();
          })(),
        identity: async (name, email) => {
          await client.projects.identity({ id: project.id, name, email }, { timeoutMs: 0 });
          await refreshed();
        },
        script: async (which, value) => {
          state.scripts = await client.projects.script(
            { id: project.id, which, value },
            { timeoutMs: 0 }
          );
          redraw();
        },
        signIn: async () => {
          const started = await client.github.signIn({}, { timeoutMs: 0 });
          if (!started.success) {
            return {
              wrong:
                started.error.kind === 'no-gh'
                  ? 'This machine has no `gh` installed.'
                  : `gh would not start signing in: ${started.error.said}`,
            };
          }
          return started.data;
        },
        show: () => window.mender.showIt(project.path),
        openEditor: () => window.mender.openInEditor(project.path),
        forget: async () => {
          const went = await forget(project.id);
          say('said' in went ? went.said : went.wrong, 4000);
        },
        closed: () => {
          if (settings?.ui === ui) settings = null;
          yard.line.take();
        },
      });
      settings = { ui, state };
      void look(shown);
      void (async () => {
        state.carrying = await client.projects.carrying({ id: project.id }, { timeoutMs: 0 });
        redraw();
      })();
      void (async () => {
        state.scripts = await client.projects.scripts({ id: project.id }, { timeoutMs: 0 });
        redraw();
      })();
      void (async () => {
        state.github = await client.github.status({}, { timeoutMs: 0 });
        redraw();
      })();
    };

    /**
     * Getting out of whatever is laid over the yard, by clicking outside it.
     *
     * Escape walks out one step at a time; a click on the world is the other
     * way everybody expects out of anything, and it takes you all the way
     * back to the yard. A session's card turns back to the session, and a
     * name half written is let go, because you clicked away from it.
     */
    const dismiss = (): void => {
      if (looking) {
        void unlook();
        return;
      }
      if (card || titling) {
        titling = null;
        const task = inside;
        const aim = open;
        if (task && aim) void openTask(aim, task);
        return;
      }
      if (naming) {
        naming = null;
        if (open) void openDistrict({ kind: 'district', district: open.district });
        return;
      }
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      home();
    };

    /**
     * One file's change, on the same board its checkout was on.
     *
     * The checkout board stays open underneath and stays live: a change is
     * something you look at and step back out of, not somewhere you go.
     */
    const openChange = async (path: string, at?: At): Promise<void> => {
      const aim = open;
      const checkout = inside?.path ?? (aim ? projectOn(aim.district)?.path : undefined);
      if (!aim || !checkout) return;
      reading = { aim, path, ...(at ? { at } : {}) };
      const mine = reading;
      wood(opening(path));
      const got = await client.changes.file({ checkout, path, ...(at ? { at } : {}) });
      if (reading !== mine) return;
      if (!got.success) {
        wood(unreadable(path, whyNot(got.error)));
        return;
      }
      reading.change = got.data;
      wood(rowsForChange());
    };

    /* A committed change is history and there is nothing to undo about it; one
       in the working tree is the only thing in the village that can be thrown
       away, so it is the only place that offers it. */
    const rowsForChange = (): Row[] => {
      if (!reading?.change) return [];
      const pinned = new Map(
        (watching?.notes() ?? [])
          .filter((note) => note.path === reading?.path)
          .map((note) => [note.at, { id: note.id, text: note.note }] as const)
      );
      const notes = { ...(reading.noting ? { noting: reading.noting } : {}), pinned };
      if (reading.at) return readOut(reading.change, undefined, notes);
      return readOut(reading.change, reading.asked ? 'asked' : 'offered', notes);
    };

    /**
     * Pinning a note against a diff line — Return, while writing one.
     *
     * It rides into the next thing said to this session, exactly the way a
     * dropped picture does: it waits by the line until then.
     */
    const pinNote = (): void => {
      const read = reading;
      if (!read?.noting || !read.change || !watching) return;
      const at = read.noting.at;
      const text = read.noting.text.trim();
      reading = { ...read, noting: undefined };
      if (!text) {
        rewrite(rowsForChange());
        return;
      }
      const line = lineNumberOf(read.change, at);
      const label = `${shortly(read.path)}:${line}`;
      watching.noteIt({
        id: crypto.randomUUID(),
        path: read.path,
        at,
        label,
        note: text,
        text: `${read.path}:${line} — ${text}`,
      });
      yard.line.write('');
      yard.show(watching.yard());
      rewrite(rowsForChange());
    };

    /**
     * Throwing a change away, on the second press.
     *
     * Nothing else in the village asks twice, because nothing else in the
     * village cannot be pressed again. This one is off the machine afterwards.
     */
    const undo = async (sure: boolean): Promise<void> => {
      const read = reading;
      if (!read?.change || read.at) return;
      if (!sure) {
        read.asked = true;
        rewrite(rowsForChange());
        return;
      }
      const place = inside ?? (open ? projectOn(open.district) : undefined);
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!parsed?.success) return;
      const thrown = await client.git.checkout.model.mutate('revert', {
        key: { checkout: parsed.data },
        input: { paths: [read.path as GitFilePath] },
      });
      if (!thrown.success) {
        say(trouble(thrown.error), 6000);
        return;
      }
      stopReading();
      say(read.change.kind === 'new' ? 'thrown away.' : 'put back.', 3000);
    };

    /**
     * One commit, on the board the checkout was on.
     *
     * What it was for, who did it, and which files it moved. Pressing one of
     * those files reads the change that commit made to it, which is the same
     * board a working change is read on: a change is a change wherever you
     * meet it, and the only difference is which two versions are being held up
     * against each other.
     */
    const openMade = async (hash: string): Promise<void> => {
      const aim = open;
      const place = inside ?? (aim ? projectOn(aim.district) : undefined);
      if (!aim || !place) return;
      const parsed = parseNativeAbsolute(place.path);
      if (!parsed.success) return;
      const checkout = parsed.data;
      reading = null;
      writing = null;
      looked = { aim, checkout: place.path, commit: null, files: undefined };
      const mine = looked;
      wood(unread());

      const [got, touched, atHead] = await Promise.all([
        client.git.checkout.getCommit({ checkout, hash }),
        client.git.checkout.getCommitFiles({ checkout, hash }),
        client.git.checkout.model.state({ checkout }, 'head').snapshot(),
      ]);
      if (looked !== mine) return;
      if (!got.success) {
        wood(unmade(trouble(got.error)));
        return;
      }
      if (!got.data.commit) {
        wood(unmade('that commit is not in this checkout any more.'));
        return;
      }
      looked.commit = got.data.commit;
      looked.files = touched.success ? touched.data.files : [];
      const head = atHead.data;
      looked.isHead = !!head && 'oid' in head && head.oid === hash;
      wood(rowsForMade());
    };

    const rowsForMade = (): Row[] =>
      looked?.commit
        ? made(looked.commit, looked.files, {
            isHead: !!looked.isHead,
            reverting: looked.asked ? 'asked' : 'offered',
          })
        : [];

    /**
     * Everything a session's branch changed, read against the base it grew
     * out of — not the commit it started from, but the commit it and the
     * base still share, since the base may well have moved on since.
     */
    const openBranchMade = async (): Promise<void> => {
      const aim = open;
      const session = inside;
      if (!aim || !session?.base) return;
      const parsed = parseNativeAbsolute(session.path);
      if (!parsed.success) return;
      const checkout = parsed.data;
      reading = null;
      looked = null;
      branchLooked = {
        aim,
        checkout: session.path,
        base: session.base,
        mergeBase: '',
        files: undefined,
      };
      const mine = branchLooked;
      wood(unbranchMade());

      const [base, changed] = await Promise.all([
        client.git.checkout.getMergeBase({ checkout, ref: session.base }),
        client.git.checkout.getChangedFiles({
          checkout,
          target: {
            kind: 'merge-base',
            base: { kind: 'branch', branch: { type: 'local', branch: session.base } },
            head: { kind: 'commit', sha: 'HEAD' },
          },
        }),
      ]);
      if (branchLooked !== mine) return;
      if (!base.success) {
        wood(branchUnmade(trouble(base.error)));
        return;
      }
      if (!changed.success) {
        wood(branchUnmade(trouble(changed.error)));
        return;
      }
      branchLooked.mergeBase = base.data.sha;
      branchLooked.files = changed.data.files;
      wood(rowsForBranchMade());
    };

    const rowsForBranchMade = (): Row[] =>
      branchLooked ? branchMade(branchLooked.base, branchLooked.files) : [];

    /** Step back from a file inside this view onto the view itself. */
    const showBranchMade = (): void => {
      if (!branchLooked) return;
      wood(rowsForBranchMade());
    };

    /** Opening the write-line to say the last commit differently. */
    const askAmend = (): void => {
      const on = looked;
      if (!on?.commit || !on.isHead) return;
      amending = {
        aim: on.aim,
        checkout: on.checkout,
        hash: on.commit.hash,
        written: on.commit.subject,
      };
      yard.asks('amend');
      yard.line.write(amending.written);
      wood(amendBoard(amending.written));
      yard.line.take();
    };

    /** Saying it. The message changes; nothing else about the commit does. */
    const amended = async (): Promise<void> => {
      const said = amending;
      if (!said) return;
      const message = said.written.trim();
      if (!message) {
        say('a commit with nothing written on it is not a commit.', 4000);
        return;
      }
      const parsed = parseNativeAbsolute(said.checkout);
      if (!parsed.success) return;
      const made = await client.git.checkout.model.mutate('commit', {
        key: { checkout: parsed.data },
        input: { message, options: { amend: true } },
      });
      if (!made.success) {
        say(trouble(made.error), 6000);
        return;
      }
      amending = null;
      home();
      say('said differently.', 3000);
    };

    /** Taking the last commit back. Nothing is lost: it lands back uncommitted. */
    const uncommit = async (): Promise<void> => {
      const on = looked;
      if (!on?.commit || !on.isHead) return;
      const parsed = parseNativeAbsolute(on.checkout);
      if (!parsed.success) return;
      const done = await client.git.checkout.model.mutate('uncommit', {
        key: { checkout: parsed.data },
        input: {},
      });
      if (!done.success) {
        say(trouble(done.error), 6000);
        return;
      }
      looked = null;
      branchLooked = null;
      home();
      say('taken back. what it wrote is still there.', 4000);
    };

    /** Undoing a commit with a new one, on the second press. */
    const revertMade = async (sure: boolean): Promise<void> => {
      const on = looked;
      if (!on?.commit) return;
      if (!sure) {
        on.asked = true;
        rewrite(rowsForMade());
        return;
      }
      const parsed = parseNativeAbsolute(on.checkout);
      if (!parsed.success) return;
      const done = await client.git.checkout.model.mutate('revertCommit', {
        key: { checkout: parsed.data },
        input: { hash: on.commit.hash },
      });
      if (!done.success) {
        say(trouble(done.error), 6000);
        return;
      }
      looked = null;
      branchLooked = null;
      home();
      say('undone, with a new commit.', 4000);
    };

    /**
     * Walking into the checkout itself.
     *
     * A project's board is the work in it and the checkout is a footnote, so
     * what is actually in the folder is one step further in: a place you go
     * rather than a tree propped open beside everything else.
     */
    const walkIn = async (): Promise<void> => {
      const place = inside ?? (open ? projectOn(open.district) : undefined);
      if (!place || !open) return;
      const aim = open;
      const name = 'title' in place ? place.title : place.name;

      /* Already holding this checkout's tree: walk it back to the top and show
         it, with nothing to wait for and nothing to tear down. */
      if (kept?.path === place.path) {
        walking = kept.tree;
        while (await kept.tree.up());
        if (open !== aim || walking !== kept?.tree) return;
        wood(kept.tree.rows());
        return;
      }

      wood([
        { kind: 'title', text: name },
        { kind: 'line', text: 'reading it…', tone: 'faded' },
      ]);
      letGoOfTree();
      if (releasing) {
        await releasing;
        releasing = null;
        if (open !== aim) return;
      }
      /* The callback fires while this is still being awaited, so what it
         checks against cannot be the binding it is about to become. */
      const mine: { tree?: LiveTree } = {};
      const tree = await openTree(client, place.path, name, (rows) => {
        if (mine.tree && walking === mine.tree && !opened) rewrite(rows);
      });
      if (!tree || open !== aim) {
        await tree?.close();
        return;
      }
      mine.tree = tree;
      kept = { path: place.path, tree };
      walking = tree;
      wood(tree.rows());
    };

    /** Letting go of whichever file is open, and its live subscription with it. */
    const closeFile = (): void => {
      opened = null;
      const live = openedLive;
      openedLive = null;
      if (live) void live.dispose();
    };

    /** Opening one file of it, live, so an agent writing to it shows. */
    const openFile = async (path: string): Promise<void> => {
      const place = inside ?? (open ? projectOn(open.district) : undefined);
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!parsed?.success) return;
      const whole = joinAbsolute(parsed.data, path as PortableRelativePath);
      if (!whole.success) return;
      closeFile();
      wood(unopened(path));
      const gen = ++openingGen;
      const live = new ReplicaState<FileContentModel>(
        client.files.content.state({ path: whole.data }, 'content'),
        {
          onChange: (value) => {
            // Late news about a file you have since left, or replaced with
            // another one, says nothing to the board any more.
            if (gen !== openingGen || !opened || opened.path !== path) return;
            opened = { ...opened, content: value };
            rewrite(read(opened));
          },
        }
      );
      await live.ready;
      // Still in a checkout a file can be read from — whether you walked to
      // this one or found it from the yard, without ever walking in at all.
      const here = inside ?? (open ? projectOn(open.district) : undefined);
      if (gen !== openingGen || !here) {
        void live.dispose();
        return;
      }
      openedLive = live;
      opened = { path, content: live.current() };
      wood(read(opened));
      // A picture shows the picture, not its size in a binary line. Asked for
      // once, off the side: nothing here waits on it to show the rest.
      if (live.current().kind === 'binary' && isPicture(path)) {
        void client.board
          .picture({ path: formatAbsolute(whole.data), width: PICTURE_WIDTH })
          .then((got) => {
            if (gen !== openingGen || !opened || opened.path !== path) return;
            opened = { ...opened, picture: got.picture };
            rewrite(read(opened));
          });
      }
    };

    /** Taking one line of it down to the line you write on. */
    const fixLine = (at: number): void => {
      const file = opened;
      if (!file || file.content.kind !== 'text' || file.content.readonly) return;
      const lines = file.content.content.split('\n');
      file.fixing = { at, written: lines[at] ?? '' };
      rewrite(read(file));
      /* The writing moved up onto the taken line, so the line at the foot of
         the board stops looking like the place it is happening. */
      yard.line.blur();
    };

    /** And putting it back, which writes the file. */
    const wroteLine = async (): Promise<void> => {
      const file = opened;
      if (!file || !file.fixing || file.content.kind !== 'text') return;
      const { at, written } = file.fixing;
      const lines = file.content.content.split('\n');
      if (lines[at] === written) {
        file.fixing = undefined;
        rewrite(read(file));
        yard.line.take();
        return;
      }
      lines[at] = written;
      const place = inside ?? (open ? projectOn(open.district) : undefined);
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!parsed?.success) return;
      const whole = joinAbsolute(parsed.data, file.path as PortableRelativePath);
      if (!whole.success) return;
      const put = await client.files.content.mutate('write', {
        key: { path: whole.data },
        input: {
          content: lines.join('\n'),
          precondition: { kind: 'etag', etag: file.content.etag },
        },
      });
      if (!put.success) {
        say(unwritten(put.error), 6000);
        return;
      }
      const again = await client.files.content.state({ path: whole.data }, 'content').snapshot();
      if (opened !== file) return;
      opened = { path: file.path, content: again.data };
      wood(read(opened));
      yard.line.take();
      say('written.', 2000);
    };

    /** Where a path in the checkout you are walking sits on the disk. */
    const onDisk = (path: string) => {
      const place = onPlace();
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!parsed?.success) return null;
      const whole = joinAbsolute(parsed.data, path as PortableRelativePath);
      return whole.success ? whole.data : null;
    };

    /**
     * Making something in the folder you are standing in.
     *
     * A name ending in a slash is a folder, which is the only way to say which
     * of the two you meant without asking you twice.
     */
    const makeIt = async (): Promise<void> => {
      const tree = walking;
      const written = tree?.naming()?.trim();
      if (!tree || !written) return;
      const folder = written.endsWith('/');
      const name = folder ? written.slice(0, -1) : written;
      const where = tree.at() ? `${tree.at()}/${name}` : name;
      const whole = onDisk(where);
      if (!whole) return;
      const done = folder
        ? await client.files.fs.createDirectory({ path: whole })
        : await client.files.fs.createFile({ path: whole });
      if (!done.success) {
        say(unwritten(done.error), 6000);
        return;
      }
      tree.name(undefined);
      say(folder ? 'made.' : 'made. press it to write in it.', 3000);
    };

    /** Calling a file something else, which is a move on the disk. */
    const renamed = async (): Promise<void> => {
      const file = opened;
      const written = file?.renaming?.trim();
      if (!file || !written) return;
      const cut = file.path.lastIndexOf('/');
      const to = cut === -1 ? written : `${file.path.slice(0, cut)}/${written}`;
      const from = onDisk(file.path);
      const onto = onDisk(to);
      if (!from || !onto) return;
      const done = await client.files.fs.rename({ from, to: onto });
      if (!done.success) {
        say(unwritten(done.error), 6000);
        return;
      }
      closeFile();
      if (walking) wood(walking.rows());
      say('renamed.', 3000);
    };

    /**
     * Putting an agent on this machine.
     *
     * Running what that agent itself says installs it, which is a real
     * install of a real command line tool and takes as long as it takes.
     * Nothing is chosen for you afterwards: who works in a building is a
     * press, and this only makes the press possible.
     */
    const bring = async (hand: string): Promise<void> => {
      say('bringing them here…', 600000);
      /* An install is a real command on a real machine and it can fall over in
         ways nothing here modelled. Whatever happens, the line that said it
         was happening has to stop saying it. */
      const came = await client.agents
        .fetch({ hand }, { timeoutMs: 0 })
        .catch((error: unknown) => ({
          success: false as const,
          error: { kind: 'refused' as const, because: String(error) },
        }));
      if (!came.success) {
        say(whyNot(came.error), 8000);
        return;
      }
      say(
        came.data.here
          ? 'they are here now.'
          : `it ran and they are still not here. ${came.data.because ?? ''}`.trim(),
        10000
      );
    };

    /** Who last touched each run of lines in the file that is open. */
    const blamed = async (): Promise<void> => {
      const file = opened;
      const place = onPlace();
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!file || !parsed?.success) return;
      const said = await client.git.checkout.blame({
        checkout: parsed.data,
        path: file.path as GitFilePath,
      });
      if (opened !== file) return;
      if (!said.success) {
        say(trouble(said.error), 6000);
        return;
      }
      file.blame = said.data.hunks;
      wood(read(file));
    };

    /** And throwing one away, which takes the second press. */
    const binned = async (sure: boolean): Promise<void> => {
      const file = opened;
      if (!file) return;
      if (!sure) {
        file.asked = true;
        rewrite(read(file));
        return;
      }
      const whole = onDisk(file.path);
      if (!whole) return;
      const done = await client.files.fs.delete({ path: whole });
      if (!done.success) {
        say(unwritten(done.error), 6000);
        return;
      }
      closeFile();
      if (walking) wood(walking.rows());
      say('thrown away.', 3000);
    };

    /**
     * Looking for something in the checkout rather than walking to it.
     *
     * Same board, same line, two questions: where is the file called this, and
     * where is this written. One line switches between them and takes what you
     * have typed with it, because you rarely know which question you had until
     * the first one has failed.
     */
    const hunted = (inside: boolean): void => {
      const place = onPlace();
      if (!place) return;
      closeFile();
      hunt = {
        checkout: place.path,
        name: 'title' in place ? place.title : place.name,
        written: hunt?.written ?? '',
        inside,
        found: [],
        asking: false,
        unread: false,
        asked: 0,
      };
      wood(hunting(hunt));
      if (hunt.written) void lookFor();
    };

    /** What is on the line, asked of the index, with stale answers dropped. */
    const lookFor = async (): Promise<void> => {
      const mine = hunt;
      if (!mine) return;
      const like = mine.written;
      if (!like) {
        mine.found = [];
        mine.asking = false;
        mine.unread = false;
        rewrite(hunting(mine));
        return;
      }
      const when = ++mine.asked;
      mine.asking = true;
      rewrite(hunting(mine));
      const got = mine.inside
        ? await client.finding.written({ checkout: mine.checkout, like })
        : await client.finding.named({ checkout: mine.checkout, like });
      // A letter typed since is a different question, and this is its answer.
      if (hunt !== mine || mine.asked !== when) return;
      mine.asking = false;
      mine.found = got.success ? got.data.found : [];
      mine.unread = !got.success && got.error.kind === 'still-reading';
      rewrite(hunting(mine));
      if (!got.success && got.error.kind === 'no-way-to-look') say(got.error.because, 5000);
    };

    /** Where the board is standing, whether that is a session or a project. */
    const onPlace = (): Task | Project | null =>
      inside ?? (open ? (projectOn(open.district) ?? null) : null);

    /**
     * A real shell in this checkout, on the board.
     *
     * The grid is a real terminal (`board/terminal.ts`), mounted beside the
     * title rather than drawn as rows of its own: full-screen programs are
     * usable, not just legible, because the keyboard goes straight to it
     * while it is what is open. `ctrl+]` is the one chord this board keeps
     * for itself, and it steps back out to wherever you were.
     */
    const talk = async (): Promise<void> => {
      const place = onPlace();
      if (!place || !open) return;
      const aim = open;
      stopTalking();
      stopWalking();
      const name = 'title' in place ? place.title : place.name;
      talking = { shell: null, name };
      const mine = talking;
      wood(shell({ name, running: false }));
      const running = await openShell(
        client,
        place.path,
        () => {
          if (talking === mine && open === aim) {
            stopTalking();
            /* `ctrl+]` steps back to the board behind the shell, which is the
               checkout board it was opened from when there is one — not all
               the way home past it. */
            if (live) wood(live.rows());
            else home();
          }
        },
        (url) => noteServer(place.path, url)
      );
      if (talking !== mine || open !== aim) {
        await running?.close();
        return;
      }
      if (!running) {
        wood(shell({ name, running: true, stopped: 'no shell would start here.' }));
        return;
      }
      mine.shell = running;
      wood(shell({ name, running: true }), running.el);
      running.focus();
    };

    const stopTalking = (): void => {
      const was = talking;
      talking = null;
      void was?.shell?.close();
      closeBrowser();
    };

    /**
     * Something is listening on a port, noticed in a checkout's own shell.
     *
     * Kept per checkout rather than per session, since a dev server belongs to
     * the working tree it was started in and not to any one conversation
     * about it. If the checkout board for this one is on the wood right now,
     * it says so without you touching anything.
     */
    const noteServer = (checkout: string, url: string): void => {
      const had = servers.get(checkout) ?? [];
      if (had[0] === url) {
        startProbing(checkout, url);
        return;
      }
      servers.set(checkout, [url, ...had.filter((one) => one !== url)].slice(0, 5));
      if (live && plainCheckout() && onPlace()?.path === checkout) rewrite(live.rows());
      watching?.noticed(servingCheckouts());
      startProbing(checkout, url);
    };

    /** Every checkout (by path) with something currently noticed listening. */
    const servingCheckouts = (): ReadonlySet<string> =>
      new Set([...servers.entries()].filter(([, urls]) => urls.length > 0).map(([path]) => path));

    /* Once a server is noticed, this is the only thing that ever takes it
       back off the list: nothing here asks the shell whether it is still
       running, so the board asks the port itself, the same way a browser
       tab would find out. Fast while it might just be starting, steady once
       it has answered, and two misses in a row before it is called gone —
       one dropped probe is not a server stopping. */
    const stopProbe = new Map<string, () => void>();
    const PROBE_FAST_MS = 1_000;
    const PROBE_STEADY_MS = 15_000;
    const PROBE_MISSES_TO_DROP = 2;

    const startProbing = (checkout: string, url: string): void => {
      const key = `${checkout}\u0000${url}`;
      if (stopProbe.has(key)) return;
      let stopped = false;
      let misses = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const tick = async (): Promise<void> => {
        if (stopped) return;
        const open = await pingsOpen(url);
        if (stopped) return;
        if (open) {
          misses = 0;
        } else {
          misses += 1;
          if (misses >= PROBE_MISSES_TO_DROP) {
            stopped = true;
            stopProbe.delete(key);
            dropServer(checkout, url);
            return;
          }
        }
        timer = setTimeout(() => void tick(), open ? PROBE_STEADY_MS : PROBE_FAST_MS);
      };
      stopProbe.set(key, () => {
        stopped = true;
        if (timer) clearTimeout(timer);
      });
      timer = setTimeout(() => void tick(), PROBE_FAST_MS);
    };

    const pingsOpen = async (url: string): Promise<boolean> => {
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        return true;
      } catch {
        return false;
      }
    };

    const dropServer = (checkout: string, url: string): void => {
      const had = servers.get(checkout) ?? [];
      const next = had.filter((one) => one !== url);
      if (next.length === had.length) return;
      servers.set(checkout, next);
      if (live && plainCheckout() && onPlace()?.path === checkout) rewrite(live.rows());
      watching?.noticed(servingCheckouts());
    };

    /** A browser, laid over the yard, showing one page. */
    const openBrowserBoard = (url: string): void => {
      stopWalking();
      stopTalking();
      hunt = null;
      browsingAt = { url, written: url, el: openPage(url) };
      wood(browsing(browsingAt), browsingAt.el);
    };

    const closeBrowser = (): void => {
      const was = browsingAt;
      browsingAt = null;
      was?.el.remove();
    };

    /** What is being typed on the browser's own address line, sent. */
    const navigated = (): void => {
      if (!browsingAt) return;
      const to = browsingAt.written.trim();
      if (!safeAddress(to)) return;
      browsingAt.el.setAttribute('src', to);
      browsingAt = { ...browsingAt, url: to };
      wood(browsing(browsingAt), browsingAt.el);
    };

    /**
     * What is open against the other end for this branch, and what to do.
     *
     * A pull request is the end of a piece of work, and the village is where
     * the work happened, so it ends here rather than in a browser. What is on
     * the wood is the four things that decide whether it lands: what it is,
     * who has looked, what the machines think, and the way in.
     */
    const openSent = async (): Promise<void> => {
      const place = onPlace();
      if (!place || !open) return;
      const aim = open;
      const parsed = parseNativeAbsolute(place.path);
      if (!parsed.success) return;
      const checkout = parsed.data;
      stopWalking();
      stopTalking();
      const name = 'title' in place ? place.title : place.name;

      wood(sent({ name, branch: '', waiting: 'asking the other end…' }));

      const head = await client.git.checkout.model.state({ checkout }, 'head').snapshot();
      const on = head.data;
      if (!on || on.kind === 'detached' || on.kind === 'unborn') {
        say('this checkout is not on a branch.', 5000);
        home();
        return;
      }
      const branch = shortName(on.ref);

      const remotes = await client.git.repository.model
        .state({ repository: checkout }, 'remotes')
        .snapshot();
      const named = remotes.data.remotes;
      const remote = named.find((each) => each.name === 'origin') ?? named[0];
      if (!remote) {
        say('this checkout has nowhere to send anything.', 5000);
        home();
        return;
      }
      const repository = remote.url;

      /* The cache has to be told which repository it is looking after before
         it will say anything about it, and then told to go and look. */
      await client.pulls.registerRepository({ repositoryUrl: repository });
      await client.pulls.sync({ repositoryUrl: repository });
      const found = await client.pulls.getPullRequestsForHead({
        repositoryUrl: repository,
        headRepositoryUrl: repository,
        headRefName: branch,
      });
      if (open !== aim) return;

      const pull = found.success ? found.data.prs[0] : undefined;
      sending = {
        name,
        branch,
        repository,
        ...(pull ? { pull, number: numberOf(pull.url) } : { written: undefined }),
      };
      wood(sent(sending));

      /* What was actually said about it, fetched after the PR itself so the
         board shows something the moment it can rather than waiting on both. */
      if (pull) {
        const number = numberOf(pull.url);
        if (number) {
          const got = await client.pulls.getPullRequestComments({ repositoryUrl: repository, number });
          if (open !== aim || sending?.pull?.url !== pull.url) return;
          sending = { ...sending, comments: got.success ? got.data.comments : [] };
          wood(sent(sending));
        }
      }
    };

    /** The number at the end of a pull request's url, which is its name to git. */
    const numberOf = (url: string): number | undefined => {
      const at = /\/(\d+)(?:$|[?#])/.exec(url);
      return at?.[1] ? Number(at[1]) : undefined;
    };

    /** Opening one, once it has been said what it is for. */
    const openIt = async (): Promise<void> => {
      const mine = sending;
      if (!mine) return;
      const title = (mine.written ?? '').trim();
      if (!title) {
        say('a pull request with nothing written on it is not one.', 4000);
        return;
      }
      const place = onPlace();
      const parsed = place ? parseNativeAbsolute(place.path) : undefined;
      if (!parsed?.success) return;
      /* Where it is going. The repository knows what its remote calls its
         default branch, which is a different question from what this checkout
         happens to be on. */
      const named = await client.git.repository.getDefaultBranch({
        repository: parsed.data,
        remote: 'origin',
      });
      const onto = (named.success ? named.data.branch : null) ?? 'main';

      sending = { ...mine, waiting: 'opening it…' };
      rewrite(sent(sending));
      const made = await client.pulls.createPullRequest({
        repositoryUrl: mine.repository,
        head: mine.branch,
        base: onto,
        title,
        draft: false,
      });
      if (!made.success) {
        say(refused(made.error), 6000);
        sending = { ...mine, written: title };
        rewrite(sent(sending));
        return;
      }
      say('opened.', 3000);
      await openSent();
    };

    /** And the two things you can do to one that is already open. */
    const doneWith = async (what: 'ready' | 'squash' | 'merge' | 'rebase'): Promise<void> => {
      const mine = sending;
      if (!mine?.number) return;
      sending = { ...mine, waiting: what === 'ready' ? 'saying so…' : 'putting it in…' };
      rewrite(sent(sending));
      const at = { repositoryUrl: mine.repository, number: mine.number };
      const done =
        what === 'ready'
          ? await client.pulls.markReadyForReview(at)
          : await client.pulls.mergePullRequest({ ...at, options: { strategy: what } });
      if (!done.success) {
        say(refused(done.error), 6000);
        sending = mine;
        rewrite(sent(sending));
        return;
      }
      say(what === 'ready' ? 'said.' : 'it went in.', 3000);
      await openSent();
    };

    /**
     * Forgetting a project, which also takes two presses.
     *
     * The village forgets it; the folder stays exactly where it is. What does
     * go is every session cut from it, because a project forgotten with its
     * worktrees still on the disk leaves them somewhere nothing here can reach.
     */
    const forget = async (id: string): Promise<{ said: string } | { wrong: string }> => {
      const project = projects.find((one) => one.id === id);
      if (!project) return { wrong: 'there is nothing open to forget' };
      await client.projects.abandon({ id: project.id }, { timeoutMs: 0 });
      /* Its district goes back to sea and its slot comes off the rack, the
         same way founding one draws it: the island is composed again from
         what is standing now, rather than left showing a place nobody has. */
      await shut();
      drawn = await draw(world, client);
      projects = await client.projects.list({});
      tasks = tasks.filter((task) => task.project !== project.id);
      people();
      paintRail();
      frame(camera, drawn.island);
      arrived();
      return { said: 'forgotten. the folder is still where it was.' };
    };

    /**
     * The end of a session, which takes two presses like everything that
     * cannot be pressed again.
     *
     * The branch outlives the building. What goes is the worktree the work was
     * done in, along with whatever in it was never committed, and the card
     * says how much that is before it asks rather than afterwards.
     */
    const ending = async (sure: boolean): Promise<void> => {
      const task = inside;
      const shown = card;
      if (!task || !shown) return;
      if (!sure) {
        shown.ask(true);
        rewrite(shown.rows());
        return;
      }
      const aim = open;
      shown.ask(false);
      say('sending everybody home…', 30000);
      await client.tasks.abandon({ id: task.id }, { timeoutMs: 0 });
      say('taken down.', 3000);
      if (aim) void openDistrict({ kind: 'district', district: aim.district });
    };

    /**
     * Sending whoever is working home, and nothing else.
     *
     * The one thing here that undoes itself: opening this session again, or
     * saying anything to it, wakes the very same one back up, so this is a
     * single press like everything else in the village that can be pressed
     * again.
     */
    const resting = async (): Promise<void> => {
      const task = inside;
      const aim = open;
      if (!task || !aim) return;
      say('sending them home…', 30000);
      await client.agents.rest({ task: task.id }, { timeoutMs: 0 });
      say('gone home. opening this wakes them again.', 4000);
      /* The card's own subscription was watching the building that just went
         home, not the empty one that replaced it, so it is reopened rather
         than left to show a villager who is no longer there. */
      if (open === aim && inside === task) void showCard(aim, task);
    };

    /** Closing whatever of the checkout you had walked into. */
    /* Stepping out of the folder you were in.
     *
     * It does not close the tree. The file-tree model is keyed on the checkout
     * and watches it, so walking in, out and in again used to subscribe to the
     * very session the last visit was still tearing down: the close landed
     * after the new subscribe, took the shared session with it, and the folder
     * sat on "reading it…" for good. The tree is kept open for as long as you
     * are in the project it belongs to and let go of when you leave, which
     * also makes walking back in instant.
     */
    const stopWalking = (): void => {
      walking = null;
      closeFile();
      hunt = null;
    };

    /** And actually letting the watcher go, which is leaving the project. */
    const letGoOfTree = (): void => {
      const was = kept;
      kept = null;
      walking = null;
      closeFile();
      hunt = null;
      if (!was) return;
      /* Held on to so that whoever opens a tree next waits for this one to be
         gone. The model is keyed on the checkout and a subscribe that lands
         mid-release gets the session the release is about to take away. */
      releasing = was.tree.close().catch(() => undefined);
    };
    let releasing: Promise<unknown> | null = null;

    /** Step back from a file inside a commit onto the commit it was in. */
    const showMade = (): void => {
      if (!looked?.commit) return;
      wood(rowsForMade());
    };

    /**
     * Writing a commit, on the board the checkout was on.
     *
     * Everything that changed goes in to begin with, because that is what
     * somebody about to commit almost always means, and holding one back is a
     * press rather than a mode.
     */
    const openCommit = (): void => {
      const aim = open;
      const place = inside ?? (aim ? projectOn(aim.district) : undefined);
      if (!aim || !place || !live) return;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      writing = {
        aim,
        checkout: place.path,
        name: 'title' in place ? place.title : place.name,
        held: new Set(),
        written: '',
      };
      wood(rowsForCommit());
    };

    const rowsForCommit = (): Row[] =>
      writing
        ? committing({
            name: writing.name,
            files: live?.changed() ?? [],
            held: writing.held,
            written: writing.written,
          })
        : [];

    /** Hold one file back out of the commit, or put it back in. */
    const holding = (path: string, back: boolean): void => {
      if (!writing) return;
      if (back) writing.held.add(path);
      else writing.held.delete(path);
      rewrite(rowsForCommit());
    };

    /** Say it. Everything not held back is staged, and then it is a commit. */
    const commit = async (): Promise<void> => {
      const said = writing;
      if (!said) return;
      const message = said.written.trim();
      if (!message) {
        say('a commit with nothing written on it is not a commit.', 4000);
        return;
      }
      const files = live?.changed() ?? [];
      const going = files.filter((file) => !said.held.has(file.path)).map((file) => file.path);
      if (!going.length) {
        say('nothing is going in.', 4000);
        return;
      }
      const parsed = parseNativeAbsolute(said.checkout);
      if (!parsed.success) return;
      const checkout = parsed.data;
      const model = client.git.checkout.model;
      const paths = (list: string[]) => list.map((path) => path as GitFilePath);

      const held = files.filter((file) => said.held.has(file.path)).map((file) => file.path);
      // What is held back has to leave the index as well: git commits what is
      // in there, not what is on the board.
      if (held.length) {
        await model.mutate('unstage', { key: { checkout }, input: { paths: paths(held) } });
      }
      const staged = await model.mutate('stage', {
        key: { checkout },
        input: { paths: paths(going) },
      });
      if (!staged.success) {
        say(trouble(staged.error), 6000);
        return;
      }
      const made = await model.mutate('commit', { key: { checkout }, input: { message } });
      if (!made.success) {
        say(trouble(made.error), 6000);
        return;
      }
      writing = null;
      home();
      say('committed.', 3000);
    };

    /**
     * Sending what is here somewhere else, or bringing down what is there.
     *
     * All three are the same shape: say what is happening, wait for the other
     * end, and then say what came of it in git's own terms.
     */
    const errand = async (what: 'push' | 'pull' | 'publish'): Promise<void> => {
      const place = inside ?? (open ? projectOn(open.district) : undefined);
      if (!place) return;
      const parsed = parseNativeAbsolute(place.path);
      if (!parsed.success) return;
      const checkout = parsed.data;
      const checkouts = client.git.checkout;

      if (what === 'pull') {
        say('bringing it down…', 60000);
        const came = await ran(gitContract.checkout.pull, checkouts.pull, { checkout });
        say(came.success ? 'brought down.' : trouble(came.error ?? {}), 6000);
        return;
      }
      if (what === 'push') {
        say('sending it up…', 60000);
        const sent = await ran(gitContract.checkout.push, checkouts.push, { checkout });
        say(sent.success ? 'sent up.' : trouble(sent.error ?? {}), 6000);
        return;
      }

      /* Publishing needs somewhere to publish to, and a checkout does not know
         its own remotes: the repository it belongs to does. */
      const remotes = await client.git.repository.model
        .state({ repository: checkout }, 'remotes')
        .snapshot();
      const named = remotes.data.remotes;
      const remote = named.find((each) => each.name === 'origin') ?? named[0];
      if (!remote) {
        say('this checkout has nowhere to push to.', 6000);
        return;
      }
      say(`sending it up to ${remote.name}…`, 60000);
      const put = await ran(gitContract.checkout.publish, checkouts.publish, {
        checkout,
        remote: remote.name,
      });
      say(put.success ? 'sent up.' : trouble(put.error ?? {}), 6000);
    };

    /** Back out of a change, onto the board it was opened from. */
    const stopReading = (): void => {
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      if (!live) return;
      /* Back at the top, which is where the file was pressed: a session's
         board is pinned to now, but you did not come from now. */
      wood(live.rows());
    };

    /**
     * A building with a task in it is that task's own checkout, and whoever is
     * working in it. The board opens at the bottom, because the bottom is now.
     */
    const openTask = async (aim: Aim, task: Task): Promise<void> => {
      const project = projects.find((one) => one.id === task.project);
      if (!project) return;
      if (task.kind === 'terminal') {
        await openTuiTask(aim, task);
        return;
      }
      flyToYard(camera, aim.district);
      lastIn.set(project.id, task.id);
      await showYard(aim, project, task);
      arrived();
    };

    /**
     * A session whose board is its own terminal, not a chat: the same door as
     * `openTask`, but what stands up behind it is the agent's own CLI, in a
     * real terminal, mounted through the same `talking` slot `talk()` opens a
     * plain shell into.
     *
     * `showYard` is still what stands the session up — the fire, the
     * gatepost's column, the rail with every lantern in the project on it —
     * because none of that is particular to a chat transcript. Only the
     * middle of the board, where the transcript would draw, is taken over,
     * the same way a plain shell already takes it over from a checkout board.
     */
    const openTuiTask = async (aim: Aim, task: Task): Promise<void> => {
      const project = projects.find((one) => one.id === task.project);
      if (!project) return;
      flyToYard(camera, aim.district);
      lastIn.set(project.id, task.id);
      await showYard(aim, project, task);
      if (open !== aim) return;
      stopTalking();
      const name = task.title;
      talking = { shell: null, name };
      const mine = talking;
      const hand = task.agent ?? 'the agent';
      wood(tuiSession({ name, hand, running: false }));
      const started = await client.agents.wakeTerminal({ task: task.id }, { timeoutMs: 0 });
      if (talking !== mine || open !== aim) return;
      if (!started.success) {
        wood(tuiSession({ name, hand, running: true, stopped: whyNot(started.error) }));
        return;
      }
      const term = await openTuiTerminal(client, task.id, () => {
        if (talking === mine && open === aim) {
          stopTalking();
          /* `ctrl+]` steps back to the yard behind the terminal — the same
             fire, gatepost and rail `showYard` already stood up. There is no
             checkout board of its own the way a plain shell sometimes has
             one, so this is always the yard itself. */
          home();
        }
      });
      if (talking !== mine || open !== aim) {
        await term.close();
        return;
      }
      mine.shell = term;
      wood(tuiSession({ name, hand, running: true }), term.el);
      term.focus();
      arrived();
    };

    /** A new session is a question: what is going to happen in there. */
    const askName = (aim: Aim, slot: number | null): void => {
      const project = projectOn(aim.district);
      if (!project) return;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      open = aim;
      titling = null;
      naming = {
        district: aim.district,
        project,
        slot,
        written: '',
        revivable: null,
        terminal: false,
        issues: null,
        pickingIssue: false,
        allowAll: false,
      };
      paintRail();
      /* Asking what is going to happen in a new session is laid over the yard
         you are standing in, like everything else you open, rather than
         replacing it: the sessions already running are still on the rail while
         you decide what the next one is for. */
      if (!yard.showing) flyToYard(camera, aim.district);
      yard.asks('start');
      yard.line.write('');
      wood(asking(naming));
      yard.line.take();
      // Whether the last one taken down in this project is still on offer —
      // asked after the board is already up, since it never blocks a fresh
      // name from being typed straight away.
      void client.tasks.revivable({ project: project.id }, { timeoutMs: 5000 }).then((held) => {
        if (naming?.district !== aim.district || naming.written) return;
        naming = { ...naming, revivable: held };
        rewrite(asking(naming));
      });
    };

    /**
     * Turning the naming board over to the project's own open issues,
     * read-only against GitHub — asked fresh every time, never cached, since
     * an issue closed a minute ago has no business still being offered.
     */
    const openIssuePicker = async (): Promise<void> => {
      if (!naming) return;
      naming = { ...naming, pickingIssue: true, issues: naming.issues ?? null };
      yard.line.blur();
      rewrite(asking(naming));
      const mine = naming;
      const found = await client.github.issues({ repository: mine.project.path });
      if (naming !== mine) return;
      naming = { ...naming, issues: found.success ? found.data.issues : [] };
      rewrite(asking(naming));
    };

    /** Naming the session for the issue just picked, and saying what it is
        for — the same as typing its title straight onto the line. */
    const pickIssue = (number: number): void => {
      if (!naming) return;
      const found = naming.issues?.find((issue) => issue.number === number);
      const written = found ? `#${found.number} ${found.title}` : `#${number}`;
      naming = { ...naming, pickingIssue: false, written };
      yard.line.write(written);
      yard.line.take();
      rewrite(asking(naming));
    };

    /** Putting the last session taken down here back up, worktree and all. */
    const reviveSession = async (): Promise<void> => {
      const asked = naming;
      const aim = open;
      if (!asked?.revivable || !aim) return;
      naming = null;
      rewrite([
        { kind: 'title', text: asked.revivable.title },
        { kind: 'gap' },
        { kind: 'line', text: 'putting it back up…', tone: 'faded' },
      ]);
      const made = await client.tasks.revive({ project: asked.project.id }, { timeoutMs: 0 });
      if (!made.success) {
        say(whyNot(made.error), 6000);
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      await openTask(aim, made.data);
    };

    /** Calling a session something else. His name for it outranks the agent's. */
    const askTitle = (task: Task): void => {
      naming = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      titling = { task, written: task.title };
      yard.asks('name');
      yard.line.write(task.title);
      wood(retitling(titling));
      yard.line.take();
    };

    /** Naming a custom server, the same line and the same keys a session's
        own name is called on: a name, then the command it starts with. */
    const askMcpAdd = (task: Task): void => {
      naming = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      titling = { task, written: '', mode: 'mcp' };
      yard.asks('server');
      yard.line.write('');
      wood(addingServer(titling));
      yard.line.take();
    };

    /** Naming a skill of your own, the same one line and the same keys. */
    const askKnackAdd = (task: Task): void => {
      naming = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      titling = { task, written: '', mode: 'skill' };
      yard.asks('skill');
      yard.line.write('');
      wood(addingSkill(titling));
      yard.line.take();
    };

    const wrote = (written: string): void => {
      if (reading?.noting) {
        reading = { ...reading, noting: { ...reading.noting, text: written } };
        rewrite(rowsForChange());
        return;
      }
      if (writing) {
        writing = { ...writing, written };
        rewrite(rowsForCommit());
        return;
      }
      if (looking) {
        looking = { ...looking, written };
        rewrite(finding(written, { projects, tasks, moods: seen, where: standing() }));
        // The finder always has something under the keyboard, so return means
        // the obvious thing without you having to aim first.
        if (!yard.walk.on) yard.walk.step(1);
        return;
      }
      if (titling) {
        titling = { ...titling, written };
        rewrite(
          titling.mode === 'mcp'
            ? addingServer(titling)
            : titling.mode === 'skill'
              ? addingSkill(titling)
              : retitling(titling)
        );
        return;
      }
      if (!naming) return;
      naming = { ...naming, written };
      rewrite(asking(naming));
    };

    /** Whatever is watching the project a worktree is being cut in hears about
        it at once, so its lantern hangs dark and says so rather than staying
        unasked-for until the cutting finishes. */
    const syncCutting = (projectId: string): void => {
      const inside = open ? projectOn(open.district) : undefined;
      if (!watching || !inside || inside.id !== projectId) return;
      watching.moved({
        project: inside,
        tasks: tasksFor(projectId),
        moods: seen,
        cutting: new Set(cutting.keys()),
      });
    };

    /** Which name on a freshly awake kit's own modes is its most permissive —
        whatever that agent's protocol calls bypassing or allowing everything,
        never assumed to be the same word twice. */
    const ALLOW_ALL_HINTS = ['bypass', 'yolo', 'danger', 'accepts all', 'full access'];
    const mostPermissiveMode = (
      modes: { id: string; name: string; about?: string }[]
    ): string | undefined =>
      modes.find((mode) =>
        ALLOW_ALL_HINTS.some(
          (hint) =>
            mode.name.toLowerCase().includes(hint) || (mode.about ?? '').toLowerCase().includes(hint)
        )
      )?.id;

    /** Set once, the moment a fresh session is awake enough to hear it: its
        own most permissive mode, applied without being asked twice. */
    const applyAllowAll = (task: string): void => {
      const replica = new ReplicaState(client.agents.kit.state({ task }, 'state'), {
        onChange: (value) => {
          if (!value.awake) return;
          const id = mostPermissiveMode(value.modes);
          if (id && value.mode !== id) {
            void client.agents.choose({ task, what: 'mode', id }, { timeoutMs: 0 });
          }
          void replica.dispose();
        },
      });
      void replica.ready.then(() => {
        const now = replica.current();
        if (!now.awake) return;
        const id = mostPermissiveMode(now.modes);
        if (id && now.mode !== id) void client.agents.choose({ task, what: 'mode', id }, { timeoutMs: 0 });
        void replica.dispose();
      });
    };

    const begin = async (): Promise<void> => {
      if (!naming) return;
      const { project, slot, written, terminal, allowAll } = naming;
      const aim = open;
      naming = null;
      rewrite([
        { kind: 'title', text: written },
        { kind: 'gap' },
        { kind: 'line', text: 'cutting a worktree…', tone: 'faded' },
      ]);
      const draftId = `cutting:${crypto.randomUUID()}`;
      cutting.set(draftId, {
        id: draftId,
        project: project.id,
        name: written,
        title: written,
        branch: written,
        slot,
        path: '',
        startedAt: new Date().toISOString(),
      });
      syncCutting(project.id);
      // No deadline: a worktree on a big repository is minutes of copying, plus
      // whatever that project runs to make a checkout usable.
      let made: Awaited<ReturnType<typeof client.tasks.begin>>;
      try {
        made = await client.tasks.begin(
          { project: project.id, name: written, slot, kind: terminal ? 'terminal' : undefined },
          { timeoutMs: 0 }
        );
      } finally {
        cutting.delete(draftId);
        syncCutting(project.id);
      }
      if (!made.success) {
        say(whyNot(made.error), 6000);
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      // The first thing written in a new session is the first thing said in
      // it. There is no separate step where you name it and then start it —
      // except in its own terminal, where what you wrote was only ever this
      // session's name: the agent's own CLI has no ACP prompt to hand it.
      if (!terminal) {
        void client.agents.tell({ task: made.data.id, text: written }, { timeoutMs: 0 });
        if (allowAll) applyAllowAll(made.data.id);
      }
      if (aim) await openTask(aim, made.data);
    };

    /** Writing a new name on a session that already has one. */
    const retitle = async (): Promise<void> => {
      const asked = titling;
      if (!asked) return;
      titling = null;
      if (asked.mode === 'mcp') {
        const [name, ...rest] = asked.written.trim().split(/\s+/);
        const aim = open;
        if (name && rest.length) {
          const done = await client.agents.addCustomTool({
            task: asked.task.id,
            name,
            command: rest.join(' '),
          });
          if (!done.success && done.error.kind === 'refused') say(done.error.because, 6000);
        }
        if (aim) await showCard(aim, asked.task);
        return;
      }
      if (asked.mode === 'skill') {
        const name = asked.written.trim();
        const aim = open;
        if (name) {
          const done = await client.agents.addCustomKnack({
            task: asked.task.id,
            name,
            about: '',
          });
          if (!done.success && done.error.kind === 'refused') say(done.error.because, 6000);
        }
        if (aim) await showCard(aim, asked.task);
        return;
      }
      const written = asked.written.trim();
      if (written && written !== asked.task.title) {
        await client.tasks.rename({ id: asked.task.id, title: written });
      }
      const aim = open;
      const again = tasks.find((task) => task.id === asked.task.id) ?? asked.task;
      if (aim) await openTask(aim, again);
    };

    const picked = async (aim: Aim | null): Promise<void> => {
      if (!aim) {
        await shut();
        flyOut(camera, drawn.island);
        arrived();
        return;
      }
      // The camp is where the island grows from: its fire is the only thing on
      // an empty island, and founding a project is what it is for.
      if (aim.district.id === CAMP) {
        await settle();
        return;
      }
      if (open && sameAim(aim, open)) {
        await shut();
        flyOut(camera, drawn.island);
        arrived();
        return;
      }
      /* A BUILDING IS NOT A SESSION.
       *
       * Houses light up so the island still says something from out on the
       * water, and a villager stands at the door of one somebody is working
       * in, but which house that is means nothing: a project has as many
       * sessions as it has work and a district has as many houses as the
       * artist drew. Picking one used to open the session standing in that
       * slot, or ask for a new session when the slot was empty, which made
       * the number of sessions a project could have a property of its
       * architecture. The rail is the sessions. A house is the way in. */
      await openDistrict({ kind: 'district', district: aim.district });
    };

    /**
     * Whatever is written on a task's board is said to whoever is in there —
     * and nothing written, while they are working, calls them off.
     */
    /**
     * The whole conversation, written out as a markdown file.
     *
     * Never into the checkout: a file dropped into a working tree unasked is
     * exactly the kind of thing that quietly rides along into a commit. It
     * goes to the real Downloads folder instead, the same place anything else
     * on this machine lands when you save it, and the line itself becomes the
     * way to it — pressable to show it in Finder, the same as a checkout
     * already offers for itself.
     */
    const exportTranscript = async (task: Task): Promise<void> => {
      const mine = card;
      if (!mine) return;
      const state = await client.agents.work.state({ task: task.id }, 'state').snapshot();
      const name = `transcript-${stamp()}.md`;
      let path: string | undefined;
      try {
        path = await window.mender.saveExport(name, transcriptMarkdown(task, state.data.told));
      } catch {
        path = undefined;
      }
      if (card !== mine) return;
      mine.setExported(path ? { text: `saved to ${name}`, path } : { text: 'it would not.' });
      rewrite(mine.rows());
    };

    const tell = async (said: string): Promise<void> => {
      const task = inside;
      const saying = watching;
      if (!task || !saying) return;
      const carrying = [...saying.carrying()];
      const notes = [...saying.notes()];
      /* Every pinned note rides in with what is actually said, file and line
         first, the same way Emdash folds a diff-line comment into the prompt. */
      const text = [said.trim(), ...notes.map((one) => one.text)].filter(Boolean).join('\n\n');
      /* An empty line while somebody is working calls them off. It is the only
         thing in this app that means something by being nothing. */
      if (!text && !carrying.length) {
        if (saying.working()) await client.agents.hush({ task: task.id });
        return;
      }
      saying.handed();
      if (said.trim()) yard.fly(said.trim());
      /* Said, not half-written any more. */
      const pending = draftTimers.get(task.id);
      if (pending) clearTimeout(pending);
      draftTimers.delete(task.id);
      void client.agents.setDraft({ task: task.id, text: '' });
      const heard = await client.agents.tell(
        { task: task.id, text, ...(carrying.length ? { carrying } : {}) },
        { timeoutMs: 0 }
      );
      if (!heard.success) {
        say(heard.error.kind === 'refused' ? heard.error.because : 'nobody heard that.', 6000);
      }
    };

    const answered = async (optionId: string, requestId?: string): Promise<void> => {
      const task = inside;
      const asked = watching?.asked();
      if (!task || !asked) return;
      /* Not an answer at all: sends every mark a multi-select question has
         picked up so far. */
      if (optionId === SEND_ALL) {
        const sent = await client.agents.finishAsking({ task: task.id });
        if (!sent.success && sent.error.kind === 'refused') say(sent.error.because, 6000);
        return;
      }
      const given = await client.agents.answer({
        task: task.id,
        requestId: requestId ?? asked.requestId,
        optionId,
      });
      if (!given.success && given.error.kind === 'refused') say(given.error.because, 6000);
    };

    /** What one of the fire-banked lines under a typed failure means. */
    const failed = async (task: string, action: string): Promise<void> => {
      const done =
        action === 'retry'
          ? await client.agents.retryFailure({ task })
          : action === 'carryon'
            ? await client.agents.waitOutFailure({ task })
            : action === 'cancel'
              ? await client.agents.stopWaiting({ task })
              : action === 'new'
                ? await client.agents.startOver({ task })
                : undefined;
      if (done && !done.success && done.error.kind === 'refused') say(done.error.because, 6000);
    };

    /** The same door, opened with a number key instead of a hand. */
    const answer = async (key: string): Promise<void> => {
      const asked = watching?.asked();
      const picked = asked ? answerFor(asked, key) : undefined;
      if (picked) await answered(picked.optionId, picked.requestId);
    };

    /**
     * What a slash meant.
     *
     * The village's own commands never reach the agent as words: picking a
     * model is a setting on a running session, not a sentence, so it is done
     * to the session and the line it was written on is wiped.
     */
    const obey = async (meant: Meant): Promise<void> => {
      const task = inside;
      const saying = watching;
      const aim = open;
      if (!task || !saying) return;
      if (meant.does === 'write') {
        said(meant.text);
        return;
      }
      if (meant.does === 'send') {
        said('');
        await tell(meant.text);
        return;
      }
      if (meant.does === 'keep') {
        said('');
        const one = await client.prompts.keep({ prompt: meant.text });
        say(`kept as “${one.title}”. a slash brings it back.`, 4000);
        return;
      }
      if (meant.does === 'forget') {
        said('');
        await client.prompts.forget({ id: meant.id });
        say(`“${meant.title}” is forgotten.`, 3000);
        return;
      }
      if (meant.does === 'card') {
        said('');
        if (aim) await showCard(aim, task);
        return;
      }
      if (meant.does !== 'set') return;
      said('');
      const done = await client.agents.choose(
        { task: task.id, what: meant.what, id: meant.id },
        { timeoutMs: 0 }
      );
      if (!done.success) {
        say(done.error.kind === 'refused' ? done.error.because : 'that would not take.', 6000);
      } else say(`${meant.name}.`, 3000);
    };

    /* Pressing something on the wood, whether by hand or by key. One way in,
       because a line you can press and cannot reach with the keyboard is a
       line that is only half there. */
    const press = (pick: string): void => {
      if (pick.startsWith('failure:')) {
        const task = inside;
        if (task) void failed(task.id, pick.slice(8));
        return;
      }
      if (pick === 'tend') {
        const project = open ? projectOn(open.district) : undefined;
        if (project) configure(project);
        return;
      }
      if (pick === 'commit') {
        openCommit();
        return;
      }
      if (pick === 'push' || pick === 'pull' || pick === 'publish') {
        void errand(pick);
        return;
      }
      if (pick === 'bring-base') {
        void merging('bring');
        return;
      }
      if (pick === 'land-here') {
        void merging('land');
        return;
      }
      if (pick === 'hand-conflict') {
        handConflict();
        return;
      }
      if (pick === 'abort-merge' || pick === 'abort-merge!') {
        void abortMerge(pick === 'abort-merge!');
        return;
      }
      if (pick.startsWith('hold:')) {
        holding(pick.slice(5), true);
        return;
      }
      if (pick.startsWith('putin:')) {
        holding(pick.slice(6), false);
        return;
      }
      if (pick.startsWith('change:')) {
        void openChange(pick.slice(7));
        return;
      }
      if (pick === 'open' || pick === 'show') {
        const where = inside?.path ?? (open ? projectOn(open.district)?.path : undefined);
        if (!where) return;
        if (pick === 'open') window.mender.openIt(where);
        else window.mender.showIt(where);
        return;
      }
      if (pick === 'checkout') {
        void openCheckoutBoard();
        return;
      }
      if (pick === 'inside') {
        void walkIn();
        return;
      }
      if (pick === 'hunt') {
        hunted(false);
        return;
      }
      if (pick === 'shell') {
        void talk();
        return;
      }
      if (pick.startsWith('page:')) {
        openBrowserBoard(pick.slice(5));
        return;
      }
      if (pick === 'end' || pick === 'end!') {
        void ending(pick === 'end!');
        return;
      }
      if (pick === 'revive') {
        void reviveSession();
        return;
      }
      if (pick === 'allow-all-toggle') {
        if (!naming) return;
        naming = { ...naming, allowAll: !naming.allowAll };
        rewrite(asking(naming));
        return;
      }
      if (pick === 'terminal-toggle') {
        if (!naming) return;
        naming = { ...naming, terminal: !naming.terminal };
        rewrite(asking(naming));
        return;
      }
      if (pick === 'issue-toggle') {
        void openIssuePicker();
        return;
      }
      if (pick.startsWith('issue:')) {
        pickIssue(Number(pick.slice(6)));
        return;
      }
      if (pick === 'rest') {
        void resting();
        return;
      }
      if (pick === 'sent') {
        void openSent();
        return;
      }
      if (pick === 'open-pull') {
        if (sending) {
          sending = { ...sending, written: '' };
          rewrite(sent(sending));
        }
        return;
      }
      if (pick === 'ready-pull') {
        void doneWith('ready');
        return;
      }
      if (pick.startsWith('merge-pull:')) {
        void doneWith(pick.slice(11) as 'squash' | 'merge' | 'rebase');
        return;
      }
      if (pick.startsWith('hand-comment:')) {
        const id = pick.slice(13);
        const comment = sending?.comments?.find((one) => one.id === id);
        if (comment) {
          yard.line.write(toHand(comment));
          yard.line.take();
        }
        return;
      }
      if (pick.startsWith('hand-check:')) {
        const id = pick.slice(11);
        const check = sending?.pull?.checks.find((one) => one.id === id);
        if (check) {
          yard.line.write(toHandCheck(check));
          yard.line.take();
        }
        return;
      }
      if (pick === 'flip') {
        hunted(!hunt?.inside);
        return;
      }
      if (pick.startsWith('into:')) {
        void walking?.walk(pick.slice(5));
        return;
      }
      if (pick.startsWith('open:')) {
        void openFile(pick.slice(5));
        return;
      }
      if (pick.startsWith('line:')) {
        fixLine(Number(pick.slice(5)));
        return;
      }
      if (pick === 'make') {
        walking?.name('');
        return;
      }
      if (pick === 'rename') {
        if (opened) {
          const cut = opened.path.lastIndexOf('/');
          opened.renaming = cut === -1 ? opened.path : opened.path.slice(cut + 1);
          rewrite(read(opened));
        }
        return;
      }
      if (pick === 'elsewhere') {
        card?.show(true);
        if (card) rewrite(card.rows());
        return;
      }
      if (pick.startsWith('bring:')) {
        void bring(pick.slice(6));
        return;
      }
      if (pick === 'blame') {
        void blamed();
        return;
      }
      if (pick === 'raw') {
        if (opened) {
          opened.raw = !opened.raw;
          rewrite(read(opened));
        }
        return;
      }
      if (pick === 'open-it') {
        const whole = opened ? onDisk(opened.path) : null;
        if (whole) window.mender.openIt(formatAbsolute(whole));
        return;
      }
      if (pick === 'open-editor') {
        const whole = opened ? onDisk(opened.path) : null;
        if (whole) window.mender.openInEditor(formatAbsolute(whole));
        return;
      }
      if (pick === 'bin' || pick === 'bin!') {
        void binned(pick === 'bin!');
        return;
      }
      if (pick === 'undo' || pick === 'undo!') {
        void undo(pick === 'undo!');
        return;
      }
      if (pick.startsWith('note:')) {
        if (!reading) return;
        reading = { ...reading, noting: { at: Number(pick.slice(5)), text: '' } };
        yard.line.write('');
        rewrite(rowsForChange());
        return;
      }
      if (pick.startsWith('note-off:') || pick.startsWith('unnote:')) {
        watching?.unnote(pick.slice(pick.indexOf(':') + 1));
        if (watching) yard.show(watching.yard());
        if (reading?.change) rewrite(rowsForChange());
        return;
      }
      if (pick.startsWith('made:')) {
        void openMade(pick.slice(5));
        return;
      }
      if (pick === 'amend') {
        askAmend();
        return;
      }
      if (pick === 'uncommit') {
        void uncommit();
        return;
      }
      if (pick === 'revert-made' || pick === 'revert-made!') {
        void revertMade(pick === 'revert-made!');
        return;
      }
      if (pick.startsWith('in:')) {
        const commit = looked?.commit;
        if (commit) {
          void openChange(pick.slice(3), { sha: commit.hash, from: commit.parents[0] ?? null });
        }
        return;
      }
      if (pick === 'branch-changed') {
        void openBranchMade();
        return;
      }
      if (pick.startsWith('branch-file:')) {
        const on = branchLooked;
        if (on) void openChange(pick.slice(12), { sha: 'HEAD', from: on.mergeBase });
        return;
      }
      if (pick.startsWith('keep:')) {
        window.mender.keep(pick.slice(5));
        say('copied.', 2000);
        return;
      }
      if (pick.startsWith('link:')) {
        window.mender.openLink(pick.slice(5));
        return;
      }
      if (pick.startsWith('putdown:')) {
        watching?.putDown(pick.slice(8));
        return;
      }
      if (pick.startsWith('name:')) {
        const line = watching?.names.named(yard.line.written(), pick);
        if (line !== null && line !== undefined) said(line);
        return;
      }
      if (pick.startsWith('slash:')) {
        const meant = watching?.slash.meant(pick);
        if (meant) void obey(meant);
        else yard.narrowing(...narrowing());
        return;
      }
      if (pick === 'card' || pick === 'new' || pick.startsWith('do:')) {
        go(pick);
        return;
      }
      if (
        pick.startsWith('project:') ||
        pick.startsWith('task:') ||
        pick.startsWith('rail:') ||
        pick.startsWith('fold:') ||
        pick.startsWith('unsay:')
      ) {
        go(pick);
        return;
      }
      const task = inside;
      const meant = card?.meant(pick);
      if (!task || !meant) return;
      if (meant.does === 'export') {
        void exportTranscript(task);
        return;
      }
      if (meant.does === 'show-export') {
        window.mender.showIt(meant.path);
        return;
      }
      if (meant.does === 'signin') {
        /* The same real shell, with the agent's own sign-in line waiting on
           the input rather than a blank prompt. Not sent: they still press
           return themselves. */
        void talk().then(() => {
          if (talking?.shell && 'key' in talking.shell)
            void client.terminals.sendInput({
              key: talking.shell.key,
              data: meant.command,
            });
        });
        return;
      }
      if (meant.does === 'browse') {
        rewrite(card?.rows() ?? []);
        return;
      }
      if (meant.does === 'addcustom') {
        askMcpAdd(task);
        return;
      }
      if (meant.does === 'rmtool' && !meant.asked) {
        rewrite(card?.rows() ?? []);
        return;
      }
      if (meant.does === 'browseknacks' || meant.does === 'knack') {
        rewrite(card?.rows() ?? []);
        return;
      }
      if (meant.does === 'addcustomknack') {
        askKnackAdd(task);
        return;
      }
      if (meant.does === 'rmknack' && !meant.asked) {
        rewrite(card?.rows() ?? []);
        return;
      }
      void (async () => {
        const done =
          meant.does === 'choose'
            ? await client.agents.choose(
                { task: task.id, what: meant.what, id: meant.id },
                { timeoutMs: 0 }
              )
            : meant.does === 'addcat'
              ? await client.agents.addTool({ task: task.id, key: meant.key })
              : meant.does === 'rmtool'
                ? await client.agents.removeTool({ task: task.id, name: meant.name })
                : meant.does === 'addknack'
                  ? await client.agents.addKnack({ task: task.id, id: meant.id })
                  : meant.does === 'rmknack'
                    ? await client.agents.removeKnack({
                        task: task.id,
                        name: meant.name,
                        from: meant.from,
                      })
                    : await client.agents.tool({ task: task.id, name: meant.name, on: meant.on });
        if (!done.success && done.error.kind === 'refused') say(done.error.because, 6000);
        else rewrite(card?.rows() ?? []);
      })();
    };

    /* A file dropped on the wood, or pasted onto it.
       There is one place for it to go: whoever is working in the building you
       have open. Dropped anywhere else it does nothing, because nothing else
       in the village has hands.

       A picture is carried, because an agent can be shown one. Anything else
       is written on the line as where it is, which is what you would have said
       about it anyway and the one thing the agent can act on. */
    const carry = async (files: readonly File[]): Promise<void> => {
      const saying = watching;
      if (!files.length) return;
      if (!saying) {
        say('open a building first, and somebody can take it.', 4000);
        return;
      }
      const pictures = files.filter((file) => CARRIED.includes(file.type));
      const elsewhere = files
        .filter((file) => !CARRIED.includes(file.type))
        .map((file) => window.mender.pathOf(file))
        .filter((path) => path.length > 0);
      if (elsewhere.length) said(alongside(yard.line.written(), elsewhere));
      if (!pictures.length && !elsewhere.length) {
        // Pasted bytes with no file behind them: a picture would have been
        // carried, and there is nothing to say about the rest.
        say('that is not a picture and it is nowhere.', 4000);
        return;
      }
      for (const picture of pictures) {
        const trouble = await saying.pickUp(picture);
        if (trouble) say(trouble, 6000);
      }
    };

    // Without this the window navigates to the file and the village vanishes.
    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => {
      event.preventDefault();
      void carry([...(event.dataTransfer?.files ?? [])]);
    });
    window.addEventListener('paste', (event) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      void carry(files);
    });

    const hand: Pointing = {
      at: (x, y) => drawn.ground.at(x, y),
      aside: () => {
        if (yard.open) dismiss();
      },
      held: (event) => {
        const up = founding ?? windmill ?? (settings ? settings.ui : null);
        if (!up) return false;
        if (event.key === 'Escape') {
          event.preventDefault();
          up.escaped();
          return true;
        }
        /* Keys meant for the window go to it as a browser would send them;
           anything else is kept off the session behind it. */
        if (!up.holds(event) && event.key !== 'Tab') event.preventDefault();
        return true;
      },
      hover: (aim) => drawn.ground.hover(aim),
      picked: (aim) => void picked(aim),
      /* Escape lets go of one thing at a time: what you are writing first,
         then the board. Every half-written thing counts, not just a message to
         an agent — a name you were giving a session is work too, and throwing
         it away to close a board nobody asked to close is the app taking
         something from you. */
      escaped: () => {
        if (looking) {
          if (looking.written) {
            wrote('');
            return;
          }
          void unlook();
          return;
        }
        if (writing) {
          if (writing.written) {
            wrote('');
            return;
          }
          writing = null;
          home();
          return;
        }
        /* A continue ticking down for a typed failure is the one wait in this
           app Escape reaches for directly, the same as pressing its own line
           again — it's the thing Claude Code's own "esc to interrupt" means,
           and nothing else on the board is more worth backing out of first. */
        if (inside && watching?.yard().session?.failure?.carryOnAt !== undefined) {
          void failed(inside.id, 'cancel');
          return;
        }
        if (card?.ending()?.asked) {
          card.ask(false);
          rewrite(card.rows());
          return;
        }
        if (card?.showing()) {
          card.show(false);
          rewrite(card.rows());
          return;
        }
        /* The card is the board turned over, so backing out of it turns it
           back to the transcript rather than leaving the session entirely.
           Without this rung Escape from the card fell all the way to the
           island, past the very session the card belongs to. */
        if (card) {
          const task = inside;
          const aim = open;
          if (task && aim) void openTask(aim, task);
          return;
        }
        if (sending) {
          if (sending.written) {
            sending = { ...sending, written: '' };
            rewrite(sent(sending));
            return;
          }
          sending = null;
          home();
          return;
        }
        if (amending) {
          amending = null;
          showMade();
          return;
        }
        /* Reached only when the terminal does not itself have the keyboard —
           Escape is that terminal's own key otherwise, passed straight
           through to whatever is running, and `ctrl+]` is what steps out. */
        if (talking) {
          stopTalking();
          /* Steps back to the checkout board it was opened from, when there
             is one, rather than all the way home past it. */
          if (live) wood(live.rows());
          else home();
          return;
        }
        if (browsingAt) {
          if (browsingAt.written !== browsingAt.url) {
            browsingAt.written = browsingAt.url;
            rewrite(browsing(browsingAt), browsingAt.el);
            return;
          }
          closeBrowser();
          if (live) wood(live.rows());
          else home();
          return;
        }
        if (hunt && !opened) {
          if (hunt.written) {
            hunt.written = '';
            void lookFor();
            return;
          }
          hunt = null;
          if (walking) wood(walking.rows());
          else home();
          return;
        }
        if (walking && !opened && walking.naming() !== undefined) {
          walking.name(undefined);
          return;
        }
        if (opened?.blame) {
          // Back to reading the file rather than out of it.
          opened.blame = undefined;
          wood(read(opened));
          return;
        }
        if (opened?.renaming !== undefined) {
          opened.renaming = undefined;
          rewrite(read(opened));
          return;
        }
        if (opened?.asked) {
          opened.asked = false;
          rewrite(read(opened));
          return;
        }
        if (opened) {
          // A line half rewritten is work: let go of that before the file.
          if (opened.fixing) {
            opened.fixing = undefined;
            rewrite(read(opened));
            yard.line.take();
            return;
          }
          lastLeft = { kind: 'file', path: opened.path };
          closeFile();
          if (hunt) wood(hunting(hunt));
          else if (walking) wood(walking.rows());
          else home();
          return;
        }
        if (walking) {
          /* Up a folder if there is one above, and out of the checkout
             altogether from the top of it. */
          void (async () => {
            const went = await walking?.up();
            if (went) return;
            lastLeft = { kind: 'folder' };
            stopWalking();
            home();
          })();
          return;
        }
        if (reading) {
          // Asked whether to throw it away, escape is the answer no.
          if (reading.asked) {
            reading.asked = false;
            rewrite(rowsForChange());
            return;
          }
          // A file read inside a commit steps back onto that commit, not past it.
          if (reading.at && looked?.commit) {
            reading = null;
            showMade();
            return;
          }
          // Same, stepping back onto everything the branch changed rather
          // than all the way past it.
          if (reading.at && branchLooked) {
            reading = null;
            showBranchMade();
            return;
          }
          stopReading();
          return;
        }
        if (looked) {
          // Asked whether to undo the commit with a new one, escape is the
          // answer no — it disarms the offer rather than leaving the commit
          // board entirely.
          if (looked.asked) {
            looked = { ...looked, asked: false };
            rewrite(rowsForMade());
            return;
          }
          looked = null;
          branchLooked = null;
          home();
          return;
        }
        if (branchLooked) {
          branchLooked = null;
          home();
          return;
        }
        if (conflicted) {
          if (conflicted.asked) {
            conflicted = { ...conflicted, asked: false };
            rewrite(conflict(conflicted.base, conflicted.files, false));
            return;
          }
          conflicted = null;
          home();
          return;
        }
        if (titling) {
          if (titling.written) {
            wrote('');
            return;
          }
          const mode = titling.mode;
          const asked = titling.task;
          titling = null;
          if ((mode === 'mcp' || mode === 'skill') && open) void showCard(open, asked);
          else {
            const task = inside;
            if (task && open) void openTask(open, task);
          }
          return;
        }
        if (naming) {
          if (naming.written) {
            wrote('');
            return;
          }
          naming = null;
          if (open) void openDistrict({ kind: 'district', district: open.district });
          return;
        }
        if (yard.line.written()) {
          said('');
          return;
        }
        /* The checkout board is laid over the yard it belongs to, so backing
           out of it drops it and reveals that yard rather than flying all the
           way to the island. Without this rung a file's Escape ladder ran
           checkout → open water in one step, past the project it was in. */
        if (live) {
          home();
          return;
        }
        /* And then out.
         *
         * The ladder used to have a rung between the session and the island:
         * the district, with no session picked. There is no such screen. The
         * yard IS the district, and walking into one lands you in the work,
         * so stepping back onto it put you straight back in the session you
         * had just left, over and over, with no way out at all once the land
         * behind stopped taking clicks. */
        void picked(null);
      },
      /** A key held with command. One table says what it means. */
      ordered: (event) => {
        const hanging = open ? tasksOn(open.district).length : projects.length;
        const meant = chordFor(event.key, standing(), hanging);
        if (!meant) return false;
        go(meant);
        return true;
      },
      /* Three things the keyboard can be doing, and never more than one at a
         time: naming a building nobody has moved into, answering the villager
         standing at a door, or saying something to whoever is in there. */
      scrolled: (key) => yard.scrolled(key),
      strayed: (event) => void yard.line.catches(event),
      typed: (event) => {
        /* The finder is a board you type into and walk at the same time, which
           is the whole point of it: the letters narrow it and the arrows pick
           out of what is left. */
        if (looking) {
          if (event.key === 'Enter') {
            const chose = yard.walk.on;
            if (chose) go(chose);
            else void unlook();
            return true;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
            return true;
          }
          if (event.key === 'Backspace') wrote(looking.written.slice(0, -1));
          else if (event.key.length === 1) wrote(looking.written + event.key);
          else return yard.scrolled(event.key);
          return true;
        }
        /* Saying what a pull request is for, before opening it. */
        if (sending?.written !== undefined) {
          const mine = sending;
          if (event.key === 'Enter') void openIt();
          else if (event.key === 'Backspace') {
            sending = { ...mine, written: (mine.written ?? '').slice(0, -1) };
          } else if (event.key.length === 1) {
            sending = { ...mine, written: (mine.written ?? '') + event.key };
          } else return yard.scrolled(event.key);
          if (sending) rewrite(sent(sending));
          return true;
        }
        /* Saying the last commit differently. */
        if (amending) {
          const mine = amending;
          if (event.key === 'Enter') void amended();
          else if (event.key === 'Backspace')
            amending = { ...mine, written: mine.written.slice(0, -1) };
          else if (event.key.length === 1)
            amending = { ...mine, written: mine.written + event.key };
          else return yard.scrolled(event.key);
          if (amending) rewrite(amendBoard(amending.written));
          return true;
        }
        /* A real terminal is open and has its own keyboard handling, from
           its own container down to the window — this whole listener never
           sees a key while it is what is open. Reaching here with `talking`
           set means the keyboard is back on the foot line instead, which is
           this terminal's to take back, not this listener's to act on. */
        if (talking) {
          talking.shell?.focus();
          return true;
        }
        /* Looking for something in the checkout: letters narrow it, arrows
           walk what is left, the same as the finder. */
        if (hunt && !opened) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
            return true;
          }
          if (event.key === 'Enter') {
            const chose = yard.walk.on;
            if (chose) press(chose);
            return true;
          }
          if (event.key === 'Backspace') hunt.written = hunt.written.slice(0, -1);
          else if (event.key.length === 1) hunt.written += event.key;
          else return yard.scrolled(event.key);
          void lookFor();
          return true;
        }
        /* The browser's own address line. */
        if (browsingAt) {
          if (event.key === 'Enter') {
            navigated();
            return true;
          }
          if (event.key === 'Backspace') browsingAt.written = browsingAt.written.slice(0, -1);
          else if (event.key.length === 1) browsingAt.written += event.key;
          else return false;
          rewrite(browsing(browsingAt), browsingAt.el);
          return true;
        }
        /* Naming something new in the folder you are standing in. */
        if (walking && !opened && walking.naming() !== undefined) {
          const written = walking.naming() ?? '';
          if (event.key === 'Enter') void makeIt();
          else if (event.key === 'Backspace') walking.name(written.slice(0, -1));
          else if (event.key.length === 1) walking.name(written + event.key);
          else return yard.scrolled(event.key);
          return true;
        }
        /* Calling a file something else. */
        if (opened?.renaming !== undefined) {
          const file = opened;
          if (event.key === 'Enter') void renamed();
          else if (event.key === 'Backspace') file.renaming = (file.renaming ?? '').slice(0, -1);
          else if (event.key.length === 1) file.renaming = (file.renaming ?? '') + event.key;
          else return yard.scrolled(event.key);
          if (opened) rewrite(read(opened));
          return true;
        }
        /* A line of a file taken down to the bottom of the board. The only
           place in the village where what you write lands on the disk. */
        if (opened?.fixing) {
          const fixing = opened.fixing;
          if (event.key === 'Enter') void wroteLine();
          else if (event.key === 'Backspace') fixing.written = fixing.written.slice(0, -1);
          else if (event.key.length === 1) fixing.written += event.key;
          else return yard.scrolled(event.key);
          if (opened) rewrite(read(opened));
          return true;
        }
        if (writing) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
            return true;
          }
          return false;
        }
        /* Naming a session, calling one something else and writing a commit
           message all happen on the one line at the foot of the screen, which
           hears its own keys. Nothing is read off the keyboard twice. */
        if (titling || naming) return false;
        const saying = watching;
        /* A board still drawn on wood is a list of things you can press, so
           the arrows walk it and return goes where you are standing. The yard
           is not: the keyboard belongs to the line you write on, and the lines
           the arrows walk are the ones the yard itself marks. */
        if (!saying || !yard.showing) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            return yard.walk.step(event.key === 'ArrowDown' ? 1 : -1) || yard.scrolled(event.key);
          }
          if (event.key === 'Enter') {
            const chose = yard.walk.on;
            if (!chose) return false;
            press(chose);
            return true;
          }
          return yard.scrolled(event.key);
        }
        /* A question at the gate takes the number keys and nothing else, so
           that answering it cannot be done by accident while typing. */
        if (saying.asked()) {
          if (!/^[1-9]$/.test(event.key)) return false;
          void answer(event.key);
          return true;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
          return true;
        }
        if (event.key === 'Enter' && yard.walk.on) return yard.walk.press();
        /* Everything else is writing, and the line takes that itself. */
        return false;
      },
    };

    backOut = () => {
      /* Writing a note goes first: it is half-said, and the board underneath
         is still the thing Escape would otherwise walk out of. */
      if (reading?.noting) {
        reading = { ...reading, noting: undefined };
        rewrite(rowsForChange());
        return;
      }
      hand.escaped();
    };
    watchPointer((x, y) => yard.covers(x, y), pixi, camera, hand);

    /* A clicked notification names a session the same way pressing it on the
       rail or in the finder does: one path in, `go` decides the rest. */
    window.mender?.attend?.((task) => go(`task:${task}`));
    window.mender?.quitCost?.((n) => showQuitCost(n));
    /* The native menu can only ask for things the page can do; "settings" is
       the one item it carries, so it lands on the same doing the chord does. */
    window.mender?.menu?.((command) => {
      if (command === 'settings') go('do:windmill');
    });
    window.mender?.missed?.((lines) => showMissed(lines));

    /* Who is standing outside which building, kept true by the main process
       rather than by whatever board happens to be open: a villager is still
       working while you are looking at another district. */
    const people = (): void => {
      const standing: Standing[] = [];
      for (const task of tasks) {
        const mood = seen[task.id];
        if (!mood || mood === 'empty') continue;
        const where = projects.find((project) => project.id === task.project)?.district;
        const district = where ? drawn.districts.get(where) : undefined;
        const building =
          district && task.slot !== null && drawn.ground.buildingAt(district, task.slot);
        if (building) standing.push({ id: task.id, building, mood });
      }
      drawn.folk.set(standing);
      paintRail();
      /* The yard you are standing in was handed who was awake when it opened,
         and moods move after that: a session that has just been cut is still
         arriving when its board comes up, and its lantern stayed dark for the
         whole life of the session because nothing ever told the rail. */
      const inside = open ? projectOn(open.district) : undefined;
      if (watching && inside) {
        watching.moved({
          project: inside,
          tasks: tasksFor(inside.id),
          moods: seen,
        });
      }
      // The roster is a live thing: a session that starts working changes its
      // mark on the board you are looking at, without you touching anything.
      if (writing) rewrite(rowsForCommit());
      else if (plainCheckout()) rewrite(live?.rows() ?? []);
    };
    /* What you have kept to say again, which every slash in every session
       offers. It changes from any of them, so it is watched rather than read. */
    const keeping = new ReplicaState<Prompt[]>(client.prompts.all.state(undefined, 'list'), {
      onChange: (value) => {
        keptNow(value);
        if (watching) yard.narrowing(...narrowing());
      },
    });
    await keeping.ready;
    keptNow(keeping.current() ?? []);

    const running = new ReplicaState<Task[]>(client.tasks.all.state(undefined, 'list'), {
      onChange: (value) => {
        tasks = value;
        people();
      },
    });
    await running.ready;
    tasks = running.current() ?? [];

    const moods = new ReplicaState<Record<string, Mood>>(
      client.agents.island.state(undefined, 'moods'),
      {
        onChange: (value) => {
          seen = value;
          people();
        },
      }
    );
    await moods.ready;
    seen = moods.current() ?? {};
    people();

    /* And open on whatever you were looking at. Closing the app is not the
       same as being done with the session that was on the board, and coming
       back to a view of the whole island every time makes it feel like the app
       forgot you were in the middle of something. */
    const was = lastly();
    if (was && was.kind !== 'island') {
      retracing = true;
      try {
        await visit(was);
      } finally {
        retracing = false;
      }
      // The island stays underneath whatever you came back to, so going back
      // from a restored session is the same move it was before you closed it.
      trail = [{ kind: 'island' }, was];
      step = 1;
    }
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Where a dropped file is, written onto the end of what is already being said.
 * A path with a space in it is a path and half a word to anybody reading the
 * line, so it is quoted; nothing else is touched.
 */
function alongside(written: string, paths: readonly string[]): string {
  const said = paths.map((path) => (path.includes(' ') ? `"${path}"` : path)).join(' ');
  const before = written.trimEnd();
  return before ? `${before} ${said} ` : `${said} `;
}

function sameAim(a: Aim, b: Aim): boolean {
  return a.district === b.district;
}

/** An empty board with a cursor on it, which is all a new session is. */
function asking(naming: {
  district: District;
  written: string;
  revivable: { title: string } | null;
  terminal: boolean;
  issues?: { number: number; title: string }[] | null;
  pickingIssue?: boolean;
  allowAll: boolean;
}): Row[] {
  if (naming.pickingIssue) return pickingIssue(naming.issues ?? null);

  const offer: Row[] =
    naming.revivable && !naming.written
      ? [
          { kind: 'line', text: `put ${naming.revivable.title} back up?`, pick: 'revive' },
          { kind: 'gap' },
        ]
      : [];
  return [
    { kind: 'title', text: 'a new session' },
    { kind: 'line', text: `on the ${naming.district.name.toLowerCase()}`, tone: 'faded' },
    { kind: 'gap' },
    ...offer,
    {
      kind: 'prose',
      text: naming.terminal
        ? 'say what to call it. it gets its own branch, and opens in its own terminal — the agent’s own CLI, raw.'
        : 'say what you want doing. it gets its own branch, and it will name itself.',
      tone: 'faded',
    },
    { kind: 'gap' },
    { kind: 'typed', text: naming.written },
    { kind: 'gap' },
    {
      kind: 'line',
      text: naming.terminal ? 'in its own terminal — on' : 'in its own terminal',
      pick: 'terminal-toggle',
    },
    { kind: 'line', text: 'start from an open issue', tone: 'faded', pick: 'issue-toggle' },
    ...(naming.terminal
      ? []
      : [
          {
            kind: 'line' as const,
            text: naming.allowAll ? 'allowing everything — on' : 'allow everything, from the start',
            pick: 'allow-all-toggle',
          },
        ]),
  ];
}

/** The naming board turned over to the project's own open issues. */
function pickingIssue(issues: { number: number; title: string }[] | null): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: 'an open issue' },
    { kind: 'line', text: 'picking one names the session and says what it is for.', tone: 'faded' },
    { kind: 'gap' },
  ];
  if (issues === null) {
    rows.push({ kind: 'line', text: 'asking github…', tone: 'faded' });
    return rows;
  }
  if (!issues.length) {
    rows.push({ kind: 'line', text: 'nothing open, or nothing to ask.', tone: 'faded' });
    return rows;
  }
  for (const issue of issues) {
    rows.push({
      kind: 'entry',
      mark: '→',
      text: `#${issue.number} ${issue.title}`,
      keep: 'tail',
      pick: `issue:${issue.number}`,
    });
  }
  return rows;
}

/** The board, asking what to call this instead. */
function retitling(titling: { task: Task; written: string }): Row[] {
  return [
    { kind: 'title', text: titling.task.title },
    { kind: 'line', text: titling.task.branch, tone: 'faded', keep: 'tail' },
    { kind: 'gap' },
    { kind: 'line', text: 'call it what?' },
    { kind: 'typed', text: titling.written },
    { kind: 'gap' },
    {
      kind: 'line',
      text: 'return to keep it. escape clears it, again to leave it alone.',
      tone: 'faded',
    },
  ];
}

/** Naming a custom server: a name, then the command it starts with, on the
    one line every board writes on. */
function addingServer(titling: { task: Task; written: string }): Row[] {
  return [
    { kind: 'title', text: 'add a server' },
    { kind: 'gap' },
    { kind: 'line', text: 'its name, then the command that starts it.' },
    { kind: 'typed', text: titling.written },
    { kind: 'gap' },
    {
      kind: 'line',
      text: 'return adds it. escape clears it, again to leave it alone.',
      tone: 'faded',
    },
  ];
}

/** Naming a skill of your own, the one line every board writes on. */
function addingSkill(titling: { task: Task; written: string }): Row[] {
  return [
    { kind: 'title', text: 'teach it a skill' },
    { kind: 'gap' },
    { kind: 'line', text: 'its name.' },
    { kind: 'typed', text: titling.written },
    { kind: 'gap' },
    {
      kind: 'line',
      text: 'return teaches it. escape clears it, again to leave it alone.',
      tone: 'faded',
    },
  ];
}

function whyNot(error: { kind: string; because?: string; name?: string }): string {
  if (error.kind === 'refused') return error.because ?? 'the worktree was refused.';
  if (error.kind === 'taken') return 'something is already standing in that building.';
  if (error.kind === 'already-here') return `${error.name} is already standing here.`;
  if (error.kind === 'nameless') return 'a task needs a name.';
  return 'that district has no project on it.';
}

interface Drawn {
  ground: Ground;
  folk: Folk;
  /** The districts by plot, which is how a project finds its own land. */
  districts: Map<string, District>;
  island: Extent;
}

/** Compose the island for the state the app is in, and put it on screen. */
async function draw(world: Container, client: MenderClient): Promise<Drawn> {
  say('drawing the island…');
  const map = await client.village.map({});
  const scene = buildScene(new Document(map.layout).items(), map.layout);
  if (scene.missing.length) {
    console.warn(`${scene.missing.length} sprites are not in the kit`, scene.missing.slice(0, 8));
  }
  const ground = new Ground(map.districts, map.layout, scene.buildings);
  scene.root.addChildAt(ground.overlay, scene.groundTop);

  for (const old of world.removeChildren()) old.destroy({ children: true });
  world.addChild(scene.root);
  say(null);
  return {
    ground,
    folk: new Folk(ground.windows),
    districts: new Map(map.districts.map((district) => [district.id, district])),
    island: extentOf(map.layout),
  };
}

async function found(
  client: MenderClient,
  grown: () => Promise<void>,
  from?: FoundFrom
): Promise<Project | null> {
  // No deadline on this one. A folder pick waits on someone looking through
  // their own folders; a clone or a fresh repository waits on the network,
  // and neither has a length that is fair to guess at.
  const result = await client.projects.found({ from }, { timeoutMs: 0 });
  if (result.success) {
    await grown();
    say(`${result.data.name} has moved in.`, 4000);
    return result.data;
  }
  const error = result.error;
  if (error.kind === 'cancelled') return null;
  say(
    error.kind === 'not-a-repository'
      ? 'That folder is not a checkout, so nothing can be built on it.'
      : error.kind === 'already-founded'
        ? 'There is already a district on that checkout.'
        : error.kind === 'clone-failed'
          ? `That would not clone: ${error.said}`
          : error.kind === 'create-failed'
            ? `That would not start: ${error.said}`
            : 'Every plot on the island is taken.',
    5000
  );
  return null;
}

interface Pointing {
  at(worldX: number, worldY: number): Aim | null;
  /** A click on the world where something written covers it: a way out. */
  aside(): void;
  /** Whether a window over everything has the keyboard. */
  held(event: KeyboardEvent): boolean;
  hover(aim: Aim | null): void;
  picked(aim: Aim | null): void;
  escaped(): void;
  /** An arrow or a page key nothing nearer wanted. */
  scrolled(key: string): boolean;
  /** A key held with command. True if it meant something. */
  ordered(event: KeyboardEvent): boolean;
  /** A key that is not escape and not a chord. True if the board took it. */
  typed(event: KeyboardEvent): boolean;
  /** A letter nothing took, which is writing that lost its way to the line. */
  strayed(event: KeyboardEvent): void;
}

/** Somewhere you have been, small enough to write down and come back to. */
type Spot =
  | { kind: 'island' }
  | { kind: 'project'; id: string }
  | { kind: 'task'; id: string; card: boolean };

function same(a: Spot | undefined, b: Spot): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'island') return true;
  if (a.kind === 'project') return a.id === (b as { id: string }).id;
  const other = b as { id: string; card: boolean };
  return a.id === other.id && a.card === other.card;
}

/** Where the app was when it was last closed, if it wrote it down. */
function lastly(): Spot | null {
  try {
    const kept = localStorage.getItem('mender.where');
    if (!kept) return null;
    const read = JSON.parse(kept) as Spot;
    return read.kind === 'island' || read.kind === 'project' || read.kind === 'task' ? read : null;
  } catch {
    return null;
  }
}

/**
 * Pointing, going, and writing.
 *
 * A district lights when the pointer is over it and something happens when you
 * pick it, and that is true out on the island and nowhere else: once you are
 * standing in a yard the land behind the writing is scenery, and escape is the
 * way out. The camera is dragged with the same button, so a press that moved is
 * a pan and not a pick — without that, every drag that ends over land takes you
 * somewhere.
 *
 * There is no text field anywhere in this app, so while the board is asking for
 * a name the keyboard simply belongs to the board.
 */
function watchPointer(
  over: (x: number, y: number) => boolean,
  pixi: Application,
  camera: ReturnType<typeof createCamera>,
  pointing: Pointing
): void {
  pixi.stage.eventMode = 'static';
  pixi.stage.hitArea = pixi.screen;

  let pressedAt: { x: number; y: number } | null = null;

  const under = (event: FederatedPointerEvent): Aim | null => {
    const point = camera.toWorld(event.global);
    return pointing.at(point.x, point.y);
  };
  /* Land behind something written on is not land you can point at. The writing
     is DOM over the canvas now, so the browser already answers this: anything
     pressable takes the pointer itself and the island never hears about it.
     What is left is the wash, which covers land without being pressable. */
  const behind = (event: FederatedPointerEvent): boolean => over(event.global.x, event.global.y);

  pixi.stage.on('pointermove', (event: FederatedPointerEvent) => {
    const aim = behind(event) ? null : under(event);
    pointing.hover(aim);
    pixi.canvas.style.cursor = aim ? 'pointer' : 'default';
  });

  let pressedBehind = false;
  pixi.stage.on('pointerdown', (event: FederatedPointerEvent) => {
    pressedAt = { x: event.global.x, y: event.global.y };
    pressedBehind = behind(event);
  });

  pixi.stage.on('pointerup', (event: FederatedPointerEvent) => {
    const from = pressedAt;
    pressedAt = null;
    if (!from) return;
    if (Math.hypot(event.global.x - from.x, event.global.y - from.y) > 4) return;
    /* A click that lands on the world behind the writing, rather than on
       anything written, is a click away from whatever is open. */
    if (pressedBehind || behind(event)) {
      if (pressedBehind && behind(event)) pointing.aside();
      return;
    }
    pointing.picked(under(event));
  });

  /* One listener, and it is the only one in the app.
     Everything that reads a key reads it from here, in an order, and the first
     thing with a claim on it takes it. Two listeners on the same key is how an
     arrow ends up both walking a list and scrolling the board under it. */
  window.addEventListener('keydown', (event) => {
    if (pointing.held(event)) return;
    if (event.key === 'Escape') {
      pointing.escaped();
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      if (pointing.ordered(event)) event.preventDefault();
      return;
    }
    if (event.altKey) return;
    if (pointing.typed(event) || pointing.scrolled(event.key)) {
      event.preventDefault();
      return;
    }
    /* Not prevented: the line takes the keyboard back during this key, and
       the letter itself then lands on it rather than being lost. */
    pointing.strayed(event);
  });
}

void boot();
