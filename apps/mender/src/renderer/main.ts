import type { HostDependencyView } from '@emdash/core/primitives/host-dependencies/api';
import {
  formatAbsolute,
  joinAbsolute,
  parseNativeAbsolute,
  type PortableRelativePath,
} from '@emdash/core/primitives/path/api';
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
import { CAMP, campfireOf, Document, extentOf, groundCells, type District } from '@mender/village';
import type { Viewport } from 'pixi-viewport';
import { Application, Container, type FederatedPointerEvent, type Renderer } from 'pixi.js';
import type { Glance, Mood } from '@shared/agents';
import type {
  CheckoutSettings,
  Hand,
  NotificationSettings,
  ProviderConfig,
  SessionUsage,
  TerminalSettings,
} from '@shared/app-settings';
import type { FiveHours } from '@shared/five-hours';
import type { UpdateState } from '@shared/updates';
import type { Hungry } from '@shared/hungry';
import type { At, Change } from '@shared/changes';
import { parseEnvLines } from '@shared/env-lines';
import type { FoundFrom, Project } from '@shared/projects';
import type { Prompt } from '@shared/prompts';
import type { Bustle } from '@shared/sky';
import type { Task, Workspace } from '@shared/tasks';
import { branchMade, branchUnmade, unbranchMade } from './board/branch';
import { browsing, openPage, safe as safeAddress } from './board/browsing';
import { counted, openCard, transcriptMarkdown, turnsOf, type LiveCard } from './board/card';
import { lineNumberOf, opening, readOut, unreadable, type Noting } from './board/changed';
import { committing } from './board/committing';
import { conflict, conflictMessage } from './board/conflict';
import {
  guideLines,
  landingLines,
  openCheckout,
  type Landing,
  type LiveBoard,
} from './board/district';
import {
  chordFor,
  chordOf,
  FIND,
  finding,
  type Keybindings,
  type Standing as Where,
} from './board/finder';
import { helper, type Walked } from './board/helper';
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
import { watchBuild, type WatchingBuild } from './board/watch-build';
import { answerFor, SEND_ALL } from './board/work';
import { watchGrip } from './grip';
import { ran } from './job';
import { pageZoom } from './page-zoom';
import { drawingNow, nudge, setPace, setScenery, watched } from './pace';
import { Atmosphere, loadEmitters, type Lit } from './village/atmosphere';
import {
  createCamera,
  flyOut,
  flyToDistrict,
  flyToYard,
  frame,
  holdStill,
  holdToIsland,
  holdToMap,
  smartZoom,
  type Extent,
} from './village/camera';
import { Crowd, type Life } from './village/crowd';
import { Editing } from './village/editing';
import { Folk, loadFolk, type Look, type Standing } from './village/folk';
import { districtBounds, Ground, type Aim } from './village/ground';
import { loadKit } from './village/kit';
import './yard/tokens.css';
import { rackMenuPane, waterMenu } from './glass/island-menus';
import { say } from './village/notice';
import { loadFeet, Pennants, plantFlag } from './village/pennants';
import { buildScene } from './village/scene';
import { Sky } from './village/sky';
import { keepOnScreen, skyPicture, skySlab } from './village/sky-slab';
import { Paths, Walkers, type Walking } from './village/walkers';
import { Water } from './village/water';
import { wire, type MenderClient } from './wire';
import { openFounding, type Founding } from './yard/founding';
import { dim, makeLayer } from './yard/frame';
import { stateOf, stepsFromTrail } from './yard/from';
import { openYard, type Watching } from './yard/live';
import { showMissed } from './yard/missed';
import { openNewSession, type NewSessionSign } from './yard/new-session';
import { seedLocalPictures } from './yard/pictures';
import { openHungry, type HungryBoard } from './yard/hungry';
import { showHead } from './yard/head';
import { showQuitCost } from './yard/quit';
import { FACES, openSettings, type Settings, type SettingsState } from './yard/settings';
import { makeShelf, type Want } from './yard/shelf';
import { loadCuts } from './yard/sprite';
import {
  keepsBranch,
  openWindmill,
  windmillOnClaude,
  windmillOnJira,
  type MachineSample,
  type WorktreeRow,
  type Windmill,
} from './yard/windmill';
import type { Signboard } from './yard/what';
import { stand } from './yard/standing';
import { inBeamOrder, makeYard } from './yard/yard';
import type { JiraError } from '@shared/jira';
import { JiraFailed } from './jira/data';
import { briefOf, makeJiraSurface, type JiraSurface, type Lit as OnTicket } from './jira/surface';

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
    width: Math.round(window.innerWidth * pageZoom()),
    height: Math.round(window.innerHeight * pageZoom()),
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
  /* The canvas fills the page but is counted in the screen's pixels, so ⌘+
     makes the writing bigger and leaves the art at the scale it was drawn. */
  const fitCanvas = (): void => {
    const zoom = pageZoom();
    pixi.renderer.resize(
      Math.round(window.innerWidth * zoom),
      Math.round(window.innerHeight * zoom)
    );
    pixi.canvas.style.width = `${window.innerWidth}px`;
    pixi.canvas.style.height = `${window.innerHeight}px`;
  };
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  const camera = createCamera(pixi);
  /* The camera stands in a frame that sits exactly on the screen and never
     moves: the sky's grade goes on it, so the grade's working area is the
     screen to the pixel. Put on anything the camera moves, it lands a hair off
     the pixel grid and opens a seam between tiles. */
  const skyFrame = new Container();
  pixi.stage.addChildAt(skyFrame, 0);
  skyFrame.addChild(camera);
  const world = new Container();
  camera.addChild(world);
  /* The flags fly over the world rather than in it, so the night only half
     darkens them: a project's face has to be readable from the water at any
     hour. */
  const flagLayer = new Container();
  camera.addChild(flagLayer);
  /* Rain and snow fall in front of the camera rather than in the world, so
     they are whole screen pixels at any zoom and cost the same at every one. */
  const weatherLayer = new Container();
  weatherLayer.eventMode = 'none';
  pixi.stage.addChild(weatherLayer);
  const sky = new Sky();

  try {
    say('waking the village…');
    const [client] = await Promise.all([wire(), loadKit(), loadFolk(), loadEmitters()]);
    seedLocalPictures(
      async (path, width) => (await client.board.picture({ path, width })).picture?.src ?? null
    );
    /* The plank along the bottom used to carry the projects. It carries the
       sessions of whatever project you are in now, so the projects moved to a
       rack in the corner and the old plank is not drawn at all. */
    await loadCuts();
    const layer = makeLayer();
    let openTheSky = (): void => undefined;
    let openTheBoard = (): void => undefined;
    let rackMenu = (_id: string, _x: number, _y: number): void => undefined;
    const shelf = makeShelf(
      layer.root,
      (id) => void go(`project:${id}`),
      () => void picked(null),
      (ids) => {
        projects = ids
          .map((id) => projects.find((project) => project.id === id))
          .filter((project): project is Project => !!project);
        paintRail();
        void client.projects.reorder({ ids }).then((now) => {
          projects = now;
          paintRail();
        });
      },
      () => openTheWindmill(),
      () => openTheSky(),
      (id, x, y) => rackMenu(id, x, y),
      {
        /* Only out on the island, where there is somewhere to let it go. */
        start: (id) => {
          const project = projects.find((one) => one.id === id);
          if (!project || open || yard.showing || !editing) return;
          unslabIsland();
          drawn.ground.hover(null);
          drawn.pennants.show(null);
          editing.arrive(project);
        },
        over: (x, y) => editing?.arriveOver({ x: x * pageZoom(), y: y * pageZoom() }),
        drop: (x, y) => void editing?.arriveAt({ x: x * pageZoom(), y: y * pageZoom() }),
      },
      () => openTheBoard()
    );
    /* The rack's sky slot wears what the sky is doing, kept up to date. */
    const paintSkySlot = (): void => shelf.setSky(skyPicture(sky));
    window.setTimeout(paintSkySlot, 1500);
    window.setInterval(paintSkySlot, 30_000);
    sky.onChange(() => window.setTimeout(paintSkySlot, 2500));

    /* What was half-written on a session's line, kept against that session so
       it is still there after the app itself restarts. Written a moment
       after the keys stop, not on every one of them, so what was written
       last is also held here at once, for stepping straight back in. */
    const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const drafts = new Map<string, string>();
    /** Sessions a slash is already waking, so a burst of typing asks once. */
    const rousing = new Set<string>();
    const saveDraft = (task: string, text: string): void => {
      drafts.set(task, text);
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
      dropCost: (id) => dropCost(id),
      closeCost: (ids) => closeCost(ids),
      closeMany: (ids, keep) => void closeMany(ids, keep),
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
        if (
          naming ||
          titling ||
          writing ||
          looking ||
          hunt ||
          reading?.noting
        ) {
          wrote(text);
          return;
        }
        watching?.typed(text, yard.line.caret());
        yard.narrowing(...narrowing());
        /* A session left at the gate long enough goes home, and what a sleeping
           one lists is only what it last said it had. A slash is asking what it
           can do now, so it wakes it, the same as walking in does. */
        if (
          text.startsWith('/') &&
          inside &&
          watching &&
          !watching.slash.awake &&
          inside.kind !== 'terminal' &&
          inside.kind !== 'shell' &&
          !rousing.has(inside.id)
        ) {
          const task = inside.id;
          rousing.add(task);
          const wake = client.agents.wake({ task }, { timeoutMs: 0 });
          watching.woke(wake);
          void wake.finally(() => rousing.delete(task));
        }
        /* Half-written and said to nobody yet: kept against the session it
           was written in, so it is still there after the app restarts. */
        if (inside) saveDraft(inside.id, text);
      },
      say: (text) => {
        /* Return on an empty line, with a question up that has something to
           send, sends it: picks on a question that takes several, or the
           whole form from the check before it goes. */
        const asked = watching?.asked();
        if (!text.trim() && asked?.submit) {
          void answered(asked.submit);
          return;
        }
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
        /* A project nobody has worked in yet says "say what you want built,
           or hang a lantern on the rail" — two ways to the same place. This
           is the first: no session is open to hear it, so what was typed
           becomes the name and the first thing said, in one move, exactly as
           if the hook had been pressed first and this had been written on
           the board it opened. */
        if (!inside && open && !looking) {
          const project = projectOn(open.district);
          if (!project) return;
          naming = blankNaming(open.district, project, freeSlot(open.district), text);
          void begin();
          return;
        }
        /* Standing in front of somebody it sent out, what is written is for
           them, and the session is what carries it there. */
        if (walkedUp) {
          void tellHelper(text);
          return;
        }
        void tell(text);
      },
      leave: () => void backOut(),
      takeBack: async () => {
        const task = inside;
        return task && watching?.working() ? hush(task, true) : false;
      },
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
    const said = (text: string, caret?: number): void => {
      yard.line.write(text, caret);
      watching?.typed(text, caret);
      if (watching) yard.show(watching.yard());
      yard.narrowing(...narrowing());
      if (caret === undefined) yard.line.take();
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
    const wood = (rows: Row[], terminal?: HTMLElement, board?: HTMLElement): void => {
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
        ...(board ? { board } : {}),
      });
    };

    /**
     * The same surface again, for a board that has changed under you.
     *
     * Every board in this app is live: a file changes on disk, a commit lands,
     * an agent says another sentence. Nothing here decides what the board says
     * — it is handed the rows again and writes them where they already were.
     */
    const rewrite = (rows: Row[], terminal?: HTMLElement, board?: HTMLElement): void => {
      if (!yard.open) return;
      const asks = prompting();
      yard.reading({
        trail: wayHome(),
        rows,
        ...(asks ? { asks } : {}),
        ...(terminal ? { terminal } : {}),
        ...(board ? { board } : {}),
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
      setupFailure = null;
      await was?.close();
      wood([{ kind: 'line', text: 'reading the checkout…', tone: 'faded' }]);
      const opened = await openCheckout(
        client,
        {
          name: 'name' in where ? where.name : project.name,
          path: where.path,
          ...(session ? { since: session.base ?? null } : {}),
          ...(session
            ? {
                tail: () => [
                  ...landingLines(landing),
                  ...guideLines(guideMissing),
                  ...setupFailureLines(setupFailure),
                ],
              }
            : {}),
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
      if (session) void refreshSetupFailure(aim, session);
      if (session) void refreshGuide(aim, session);
    };

    /** Whether the checkout has nothing yet telling an agent what it is, read fresh
        every time its board opens. */
    const refreshGuide = async (aim: Aim, session: Task): Promise<void> => {
      const has = await client.appSettings
        .hasGuide({ dir: session.path }, { timeoutMs: 5000 })
        .catch(() => true);
      if (open !== aim || inside !== session) return;
      guideMissing = !has;
      if (live && plainCheckout()) rewrite(live.rows());
    };

    /** Reads whether the session's own worktree setup ever failed, fresh
        every time the checkout board opens — never cached across sessions. */
    const refreshSetupFailure = async (aim: Aim, session: Task): Promise<void> => {
      const found = await client.tasks.setupFailure({ id: session.id }, { timeoutMs: 5000 });
      if (open !== aim || inside !== session) return;
      setupFailure = found;
      if (live && plainCheckout()) rewrite(live.rows());
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
      closeBuild();
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
          said:
            titling.mode === 'mcp' ? 'a server' : titling.mode === 'skill' ? 'a skill' : 'its name',
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
      if (walkedUp) steps.push({ said: walkedUp.hand.errand, go: back });
      if (card) steps.push({ said: 'who works here', go: back });
      if (reading) steps.push({ said: shortly(reading.path), go: back });
      if (opened) steps.push({ said: shortly(opened.path), go: back });
      if (buildWatch) steps.push({ said: 'watching it build', go: back });
      const last = steps.at(-1);
      if (last) delete last.go;
      return steps;
    };

    /** The last thing in a path, which is the only part worth a breadcrumb. */
    const shortly = (path: string): string => path.split('/').at(-1) ?? path;

    /** What the line asks for while a particular thing is open. */
    const prompting = (): 'file' | 'changes' | undefined =>
      reading ? 'changes' : opened ? 'file' : undefined;
    let drawn = await draw(
      world,
      client,
      pixi.renderer,
      camera,
      null,
      sky,
      weatherLayer,
      skyFrame,
      flagLayer
    );
    let projects = await client.projects.list({});
    let tasks: Task[] = [];
    /* A session that has been asked for but whose worktree is still being cut
       has no row in the registry yet, so it is not in `tasks` at all. It still
       hangs a lantern, dark and saying so, rather than the rail pretending
       nothing was asked until the cutting finishes. */
    const cutting = new Map<string, Task>();
    /* Every isolated workspace, and which one of each project's you are
       standing in: empty is the project's own folder. The rail carries the
       sessions of that one workspace and nobody else's. */
    let workspaces: Workspace[] = [];
    const workspaceIn = new Map<string, string>();
    const workspaceOf = (projectId: string): string => {
      const at = workspaceIn.get(projectId) ?? '';
      return workspaces.some((each) => each.id === at) ? at : '';
    };
    const tasksFor = (projectId: string): Task[] => [
      ...tasks.filter(
        (task) => task.project === projectId && (task.workspace ?? '') === workspaceOf(projectId)
      ),
      ...[...cutting.values()].filter((task) => task.project === projectId),
    ];
    /** What hangs from the beam: nothing until the project has a workspace
        besides its own folder, then its own folder first and every one of
        them after it. */
    const boardsFor = (project: Project): Signboard[] => {
      const cut = workspaces.filter((each) => each.project === project.id);
      if (!cut.length) return [];
      const here = workspaceOf(project.id);
      const folder = project.path.replace(/\/+$/, '').split('/').at(-1) ?? project.name;
      return [
        {
          id: '',
          name: folder,
          here: here === '',
          ...lightIn(project.id, ''),
          sessions: whoIsIn(project.id, ''),
        },
        ...cut.map((each) => ({
          id: each.id,
          name: each.name,
          here: here === each.id,
          ...lightIn(project.id, each.id),
          branch: each.branch,
          sessions: whoIsIn(project.id, each.id),
        })),
      ];
    };
    /** Everybody in a workspace and what each is up to, in the words their
        lanterns would use, for when its board is pointed at. */
    const whoIsIn = (projectId: string, workspace: string): Signboard['sessions'] =>
      tasks
        .filter((task) => task.project === projectId && (task.workspace ?? '') === workspace)
        .map((task) => ({
          id: task.id,
          name: task.title,
          /* The branch is said once at the head of the card, not on every line. */
          ...stateOf(
            { ...task, shared: true },
            seen[task.id],
            glances[task.id],
            unseen.get(task.id)
          ),
        }));
    /** The light under a board is its loudest session, said the way its
        lantern would say it: asking over broken over working over done over
        waiting out a limit, and nothing at all when they are all idle. */
    const LOUDEST = ['wants-you', 'broken', 'working', 'done', 'waiting'] as const;
    const lightIn = (
      projectId: string,
      workspace: string
    ): Pick<Signboard, 'light' | 'ember'> => {
      let light: (typeof LOUDEST)[number] | undefined;
      let ember: number | undefined;
      for (const task of tasks) {
        if (task.project !== projectId || (task.workspace ?? '') !== workspace) continue;
        const glance = glances[task.id];
        const mood = seen[task.id];
        const says =
          mood === 'asking'
            ? 'wants-you'
            : mood === 'hurt'
              ? 'broken'
              : mood === 'working' || mood === 'arriving' || glance?.background || glance?.helpers
                ? 'working'
                : unseen.has(task.id)
                  ? 'done'
                  : glance?.waiting
                    ? 'waiting'
                    : undefined;
        if (!says) continue;
        if (says === 'waiting') {
          const wait = glance?.waiting;
          const end = wait?.carryOn ?? wait?.resetAt;
          const behind =
            wait?.since !== undefined && end !== undefined && end > wait.since
              ? Math.max(0.08, Math.min(1, (Date.now() - wait.since) / (end - wait.since)))
              : 0.15;
          ember = Math.max(ember ?? 0, behind);
        }
        if (!light || LOUDEST.indexOf(says) < LOUDEST.indexOf(light)) light = says;
      }
      return light ? { light, ...(light === 'waiting' ? { ember } : {}) } : {};
    };
    frame(camera, drawn.island);
    /* The window is not its real size when the renderer starts — it is
       restored to whatever it was last time a moment later — so the opening
       shot has to be taken again once it settles, or the island sits small in
       a corner of a window it was never measured against. Only while nothing
       is open: once you are looking at something, the camera is yours. */
    window.addEventListener('resize', () => {
      holdToIsland(camera, drawn.island);
      if (!open) frame(camera, drawn.island);
    });
    /* The Mac's smart zoom, a two-finger double tap, reaches the page as a
       ctrl-wheel that moves nothing: in close where the fingers are, or back
       out to the island. Only out on the island; in a yard the camera is
       scenery. */
    let tappedAt = 0;
    window.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey || event.deltaX !== 0 || event.deltaY !== 0) return;
        if (open || yard.showing || yard.open || founding || windmill || settings) return;
        if (editing?.active) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const now = performance.now();
        if (now - tappedAt < 400) return;
        tappedAt = now;
        smartZoom(camera, drawn.island, {
          x: event.clientX * pageZoom(),
          y: event.clientY * pageZoom(),
        });
      },
      { capture: true, passive: false }
    );
    pixi.ticker.add((ticker) => {
      drawn.ground.tick(ticker);
      drawn.folk.tick(ticker);
      drawn.water.tick(ticker);
      drawn.pennants.tick();
      /* The air and the people only move on frames that are actually drawn:
         working them out between photographs is the battery spent on nothing. */
      if (!drawingNow()) return;
      const now = performance.now();
      const seconds = Math.min(0.5, (now - walkedAt) / 1000);
      walkedAt = now;
      const dimmed = !!pixi.canvas.style.filter && pixi.canvas.style.filter !== 'none';
      drawn.atmosphere.setQuiet(dimmed);
      setScenery(dimmed);
      /* The sea is told first, from the last frame's sky: the picture the
         grade is about to take has to have the sea already marked in it. */
      const was = drawn.atmosphere.sky.current;
      drawn.water.weather(
        dimmed ? 0 : was.rain,
        was.stars,
        was.ice,
        was.ambient,
        drawn.atmosphere.graded
      );
      drawn.crowd.fleet.frozen = was.ice;
      drawn.atmosphere.tick(pixi.screen);
      const look = drawn.atmosphere.sky.current;
      drawn.walkers.tick(now, seconds, look.dark > 0.6);
      // Behind a board the village is scenery: the crowd holds still.
      if (!dimmed)
        drawn.crowd.tick(now, seconds, look.dark > 0.6, {
          x: camera.left,
          y: camera.top,
          width: camera.worldScreenWidth,
          height: camera.worldScreenHeight,
        });
    });
    let walkedAt = performance.now();
    /* A handle for driving the sky and the people from a debug port, in a
       development build only. */
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__village = {
        sky,
        drawn: () => drawn,
        camera,
        watched,
      };
    }

    /* His weather, asked for now and then; the main process keeps it and
       answers from memory almost every time. */
    const askWeather = (): void => {
      void client.sky.weather({}, { timeoutMs: 20_000 }).then(
        (real) => sky.told(real),
        () => undefined
      );
    };
    askWeather();
    window.setInterval(askWeather, 10 * 60_000);
    /* How long since each project was committed to, which is how overgrown
       its district is. */
    /* How busy each project has been, read off git every minute or so: the
       moss grows from how long since the last commit, the crowd in each
       district from how much work is going on, and a commit or a push since
       the last look sends a cart or a boat. */
    let bustled: Record<string, Bustle> | null = null;
    let lives = new Map<string, Life>();
    const livesNow = (all: Record<string, Bustle>): Map<string, Life> => {
      const out = new Map<string, Life>();
      const now = Date.now();
      for (const project of projects) {
        const read = all[project.id];
        if (!read) continue;
        const open = tasks.filter((task) => task.project === project.id);
        const working = open.filter((task) => seen[task.id] === 'working').length;
        const days = (now - read.last) / 86_400_000;
        out.set(project.district, {
          busy:
            open.length * 0.8 +
            working * 1.5 +
            read.today * 0.8 +
            read.week * 0.15 +
            read.talked * 1.2,
          age: Math.sqrt(Math.max(0, Math.min(1, (days - 3) / 25))),
        });
      }
      return out;
    };
    const askBustle = (): void => {
      void client.sky.bustle({}, { timeoutMs: 30_000 }).then(
        (all) => {
          const byDistrict = new Map<string, number>();
          for (const project of projects) {
            const read = all[project.id];
            if (read) byDistrict.set(project.district, read.last);
            const was = bustled?.[project.id];
            if (!read || !was) continue;
            const home = tasks.find((task) => task.project === project.id && task.slot !== null);
            const district = drawn.districts.get(project.district);
            const building =
              (district && home && drawn.ground.buildingAt(district, home.slot ?? 0)) || null;
            if (read.committed > was.committed) drawn.crowd.cart(project.district, building);
            if (was.ahead > 0 && read.ahead === 0) drawn.crowd.boat(project.district);
          }
          bustled = all;
          drawn.atmosphere.setAges(byDistrict);
          lives = livesNow(all);
          drawn.crowd.setLife(lives);
        },
        () => undefined
      );
    };
    // Once the sessions and moods it reads are in.
    window.setTimeout(askBustle, 3000);
    window.setInterval(askBustle, 60_000);
    /* A session's agent starting on something sends a runner out of its
       door with it. */
    const doingNow = new Map<string, string>();
    const sendRunnersNow = (): void => {
      if (bustled) drawn.crowd.setLife(livesNow(bustled));
      for (const task of tasks) {
        const tool = glances[task.id]?.tool;
        const was = doingNow.get(task.id);
        if (tool) doingNow.set(task.id, tool);
        else doingNow.delete(task.id);
        if (!tool || tool === was) continue;
        const where = projects.find((project) => project.id === task.project)?.district;
        const district = where ? drawn.districts.get(where) : undefined;
        if (!where || !district) continue;
        const building =
          (task.slot !== null && drawn.ground.buildingAt(district, task.slot)) || null;
        drawn.crowd.errand(where, building, tool);
      }
    };
    window.setTimeout(() => {
      sendRunners = sendRunnersNow;
    }, 3000);

    /** The place the board is standing in front of, while it is in. */
    let open: Aim | null = null;
    let live: LiveBoard | null = null;
    /** The task that board belongs to. */
    let inside: Task | null = null;
    /** How this session's branch stands against the base it was cut from. */
    let landing: Landing | null = null;
    /** The script that failed setting this session's worktree up, if the
        board hasn't been told to stop saying so. */
    let setupFailure: { script: string; message: string } | null = null;
    let guideMissing = false;
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
    /** How a shell looks and what it starts as, read once at the start so a
        shell opened before the windmill ever is still gets it. */
    let terminalSettings: TerminalSettings | null = null;
    void client.appSettings.terminalSettings({}, { timeoutMs: 0 }).then((read) => {
      terminalSettings = read;
    });
    /** Who a fresh conversation starts with, for the new-session sign to say. */
    let defaultHand = 'claude';
    void client.appSettings.defaultHand({}, { timeoutMs: 0 }).then((read) => {
      defaultHand = read;
    });
    /** Every chord this session has rebound away from the table's own
        default, read once at the start the same way the terminal settings
        are — a rebind made on the windmill updates this in place, so a
        chord pressed anywhere else sees it immediately. */
    let keybindings: Keybindings = {};
    void client.appSettings.keybindings({}, { timeoutMs: 0 }).then((read) => {
      keybindings = read;
    });
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
    let talking: {
      shell: LiveShell | LiveTuiTerminal | null;
      name: string;
      /** Which of a checkout's shells this is — unset for the agent's own
          terminal, which only ever has the one. */
      shellId?: string;
      /** Set when this slot is a session's own terminal rather than a plain
          shell — its own process to end, not a shell's. */
      tuiTask?: string;
      /** Armed for the second press, and what that press would end. */
      ending?: { armed: boolean; what: string | null } | null;
    } | null = null;
    /* A browser laid over the yard, showing one page. `url` is what is
       actually loaded; `written` is what the foot-of-board line currently
       says, which differs from it while an address is being typed. */
    let browsingAt: { url: string; written: string; el: HTMLElement } | null = null;
    /* The page the session is building, opened big over the yard. */
    let buildWatch: WatchingBuild | null = null;
    let buildWash: { sheet: HTMLElement; was: string } | null = null;
    /* What each checkout's own shell has noticed listening, most recent
       first. Never asked for; only ever noticed in what the shell printed. */
    const servers = new Map<string, string[]>();
    /* What is open against the other end for this checkout's branch. */
    let sending: (Sent & { repository: string; number?: number }) | null = null;
    /** The project whose Jira is up over the village. */
    let quest: { project: Project } | null = null;
    /** Somebody the session sent out, walked up to in the yard. */
    let walkedUp: Walked | null = null;
    /** The next read of a background command's output, while its board is open. */
    let tailing: number | undefined;
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
      /** A plain login shell in the checkout rather than a conversation. */
      terminal: boolean;
      /** The past session picked to pick up, if any — `begin` sends nothing
          of its own when this is set: resuming *is* the first thing said. */
      resume?: { id: string; title: string } | null;
      /** What was written on the sign, said to it (or run in it) first. */
      said?: string;
      /** Its own worktree on its own branch, rather than the project's own
          folder beside everybody else. */
      isolated: boolean;
      /** The workspace it would go into, when you are standing in one. */
      among?: string;
      /** Said to it first even in its own workspace: a Jira ticket's brief. */
      brief?: string;
      /** The ticket it was started for, and where to move it once it has. */
      jira?: { site: string; key: string; to: string[] };
    } | null = null;
    /** Set while an existing session is being called something else, or —
        the same one line, the same keys — while a custom server is being
        named for the card. */
    let titling: {
      task: Task;
      written: string;
      mode?: 'title' | 'mcp' | 'skill';
    } | null = null;
    /** Set while the board is the finder, and what has been typed into it. */
    let looking: { written: string; from: Spot } | null = null;
    /** What everybody is doing, as the main process sees it. */
    let seen: Record<string, Mood> = {};
    /* What each lantern says beyond its mood, and which sessions finished
       something while you were somewhere else. Done is a reason to look, so it
       stays lit until you have stood in that session; after that it is idle. */
    let glances: Record<string, Glance> = {};
    const unseen = new Map<string, number>();
    /* Lights the houses again; set once everything it reads exists, and called
       the moment you walk into a finished session so its house goes dark too. */
    let lightHouses = (): void => {};
    let sendRunners = (): void => {};

    /* Where you have been, so you can go back. One list, one finger on it:
       arriving somewhere new cuts off whatever you had gone back from, which
       is the only behaviour anybody has ever expected of this. */
    let trail: Spot[] = [{ kind: 'island' }];
    let step = 0;
    /** Set while the trail is walking itself, so it does not record its own
        footsteps as new places. */
    let retracing = false;
    /** The last place you were in rather than out on the water, however you
        left it, so Escape on the island always has somewhere to go back to. */
    let wasIn: Spot | null = lastly('mender.lastIn');

    /** Where you are standing, which decides what there is to do. */
    const standing = (): Where =>
      card ? 'card' : inside ? 'session' : open ? 'district' : 'island';

    const spot = (): Spot =>
      inside
        ? { kind: 'task', id: inside.id, card: Boolean(card), project: inside.project }
        : open
          ? { kind: 'project', id: projectOn(open.district)?.id ?? '' }
          : { kind: 'island' };

    const arrived = (): void => {
      if (looking) return;
      const now = spot();
      /* A spot remembered before sessions carried their project is the same
         spot, but once that session is gone it has nowhere to fall back to,
         so it is written again the moment it is stood in. */
      const stale = wasIn?.kind === 'task' && now.kind === 'task' && wasIn.project !== now.project;
      if (now.kind !== 'island' && (stale || !same(wasIn ?? undefined, now))) {
        wasIn = now;
        try {
          localStorage.setItem('mender.lastIn', JSON.stringify(now));
        } catch {
          // Then it is only remembered until the window closes.
        }
      }
      if (retracing) return;
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
    /* A project put away has no land of its own, so its yard is stood in
       over the camp, the one place on the island that is nobody's. Kept, so
       the same project is always the same place. */
    const awayPlaces = new Map<string, District>();
    const districtFor = (id: string): District | undefined => {
      const standing = drawn.districts.get(id);
      if (standing || !id.startsWith('away:')) return standing;
      if (!projects.some((one) => one.district === id)) return undefined;
      const camp = drawn.districts.get(CAMP);
      const kept = awayPlaces.get(id);
      if (kept && kept.cells === camp?.cells) return kept;
      const made: District = {
        id,
        name: 'Campground',
        core: camp?.core ?? [0, 0],
        cells: camp?.cells ?? [],
        kind: 'project',
      };
      awayPlaces.set(id, made);
      return made;
    };
    const isAway = (project: Project): boolean => project.district.startsWith('away:');
    const tasksOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasksFor(project.id).filter((task) => !cutting.has(task.id)) : [];
    };
    /** Every session in the project, whichever workspace it is in. */
    const allOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasks.filter((task) => task.project === project.id) : [];
    };
    /* Which house a session stands in, which is scenery and nothing else:
       it decides where a villager is drawn and never what anything opens. */
    /** The first building on a district nobody is in, if there is one. */
    const freeSlot = (district: District): number | null => {
      const taken = new Set(allOn(district).map((task) => task.slot));
      for (let slot = 0; slot < drawn.ground.room(district); slot += 1) {
        if (!taken.has(slot)) return slot;
      }
      return null;
    };

    /* Which stand-in prop a project wears goes by when it came in, not where
       it hangs on the rack, so dragging it along the rack never swaps its
       face for somebody else's. */
    const foundedRank = (project: Project): number =>
      projects.filter((one) => one.foundedAt < project.foundedAt).length;

    /* The rail carries one peg per project and nothing else. Where the work
       is happening is the project's own board to say; this is only how you
       walk from one village to the next. */
    const paintRail = (): void => {
      const here = open ? projectOn(open.district) : undefined;
      drawn.pennants.set(
        projects
          .filter((project) => !isAway(project))
          .map((project) => ({
            district: project.district,
            name: project.name,
            ...(project.icon ? { icon: project.icon } : {}),
          }))
      );
      shelf.show(
        projects.map((project) => ({
          id: project.id,
          name: project.name,
          at: foundedRank(project),
          here: project.id === here?.id,
          away: isAway(project),
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
     * The loudest thing happening in a project, for the stud on its board.
     *
     * The same mood map that lights every lantern and every house window,
     * folded down to one project, worst first: hurt, asking, a limit being
     * waited out, something finished you have not seen, somebody working.
     * Idle is nothing, because a light is a reason to look.
     */
    const wantsOf = (project: string): Want => {
      const rank: Record<Exclude<Want, undefined>, number> = {
        hurt: 5,
        asking: 4,
        limited: 3,
        done: 2,
        working: 1,
      };
      let worst: Want;
      const raise = (to: Exclude<Want, undefined>): void => {
        if (!worst || rank[to] > rank[worst]) worst = to;
      };
      for (const task of tasks) {
        if (task.project !== project) continue;
        const mood = seen[task.id];
        if (mood === 'hurt') return 'hurt';
        if (mood === 'asking') raise('asking');
        else if (mood === 'working' || mood === 'arriving') raise('working');
        else if (mood === 'resting') {
          /* Out of usage only glows low: nothing to do but wait, yet a project
             whose work has stopped should not look like one at rest. */
          if (glances[task.id]?.waiting?.kind === 'limit') raise('limited');
          else if (unseen.has(task.id)) raise('done');
        }
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
    /** The session Cmd+W has already warned about, and when: a second press
        inside the window takes it down regardless of what goes with it. */
    let closing: { task: string; at: number } | null = null;
    /** When option-delete last warned about closing the done ones. */
    let closingDone: number | null = null;
    /** The project a session was last taken down in, for command-shift-T
        pressed from out on the island. */
    let closedIn: string | null = null;
    /** What in a session's own worktree nobody has committed, said as words,
        or nothing when it is clean. */
    const uncommittedIn = async (task: { path: string }): Promise<string | null> => {
      const parsed = parseNativeAbsolute(task.path);
      if (!parsed.success) return null;
      const status = new ReplicaState<{ kind: string; entries?: Record<string, unknown> }>(
        client.git.checkout.model.state({ checkout: parsed.data }, 'status')
      );
      try {
        await status.ready;
        const now = status.current();
        if (now?.kind === 'too-many-files') return 'more files than git will count';
        const many = Object.keys(now?.entries ?? {}).length;
        return many ? counted(many, 'file') : null;
      } catch {
        return null;
      } finally {
        void status.dispose();
      }
    };
    /* The one beside it, the way a browser closes a tab: the next along, or
       the one before it when it was the last. Wrapping round to the first
       threw you clear across the rail. */
    const nextOf = (list: Task[], id: string): Task | undefined => {
      const from = list.findIndex((one) => one.id === id);
      if (from < 0) return list[0];
      return list[from + 1] ?? list[from - 1];
    };
    /* Which session you were last in, per workspace, so walking back onto a
       signboard puts you where you were in there. */
    const lastInWorkspace = new Map<string, string>();

    /**
     * Walk into a workspace: whichever session you were last in there, or
     * its first, or, with nobody in it yet, a fresh one started on the spot,
     * the same as walking into a project nobody has worked in.
     */
    const enterWorkspace = async (aim: Aim, workspace: string): Promise<void> => {
      const project = projectOn(aim.district);
      if (!project) return;
      workspaceIn.set(project.id, workspace);
      const here = tasksOn(aim.district);
      const last = lastInWorkspace.get(`${project.id}|${workspace}`);
      const task = here.find((one) => one.id === last) ?? here[0];
      if (task) await openTask(aim, task);
      else await startNow(aim);
    };

    /** Deletes a workspace outright. The slab it is offered from has already
        said what goes with it and been pressed twice. */
    const dropWorkspace = async (id: string): Promise<void> => {
      const workspace = workspaces.find((each) => each.id === id);
      const aim = open;
      if (!workspace || !aim) return;
      const project = projectOn(aim.district);
      const standingIn = project && workspaceOf(project.id) === id;
      say(`deleting ${workspace.name}…`);
      await client.tasks.dropWorkspace({ id }, { timeoutMs: 0 });
      workspaces = workspaces.filter((each) => each.id !== id);
      say(`${workspace.name} is gone, and ${workspace.branch} with it.`, 4000);
      if (open !== aim || !project) return;
      if (standingIn) await enterWorkspace(aim, '');
      else redrawBoards();
    };

    /** What deleting a workspace would throw away, in words. */
    const dropCost = async (id: string): Promise<string> => {
      const cost = await client.tasks.dropCost({ id }, { timeoutMs: 0 });
      const busy = tasks.filter(
        (task) =>
          task.workspace === id && (seen[task.id] === 'working' || seen[task.id] === 'asking')
      ).length;
      const going = [
        busy ? `${counted(busy, 'agent')} in there still working, stopped mid-way` : null,
        cost.uncommitted ? `${counted(cost.uncommitted, 'file')} nobody committed` : null,
        cost.unshared ? `${counted(cost.unshared, 'commit')} never pushed anywhere` : null,
        cost.sessions ? counted(cost.sessions, 'session') : null,
      ].filter(Boolean);
      return going.length
        ? `this throws away ${going.join(', ')}, and ${cost.branch}.`
        : `nothing unsaved in it; ${cost.branch || 'its branch'} is pushed or merged.`;
    };

    /** What closing these sessions would throw away, in words, or nothing. */
    const closeCost = async (ids: string[]): Promise<string> => {
      const going = tasks.filter((task) => ids.includes(task.id));
      const busy = going.filter(
        (task) => seen[task.id] === 'working' || seen[task.id] === 'asking'
      ).length;
      const left = (
        await Promise.all(going.filter((task) => !task.shared).map((task) => uncommittedIn(task)))
      ).filter(Boolean);
      const lost = [
        busy ? `${counted(busy, 'session')} still working, stopped mid-way` : null,
        left.length ? `${left.join(' and ')} in their own copies nobody has committed` : null,
      ].filter(Boolean);
      return lost.length ? `that stops ${lost.join(', and ')}.` : '';
    };

    /** Closing several sessions off the rail at once, the way a browser
        closes the tabs round one. If the one you are in goes, you step over
        to the one that was right-clicked first. */
    const closeMany = async (ids: string[], keep: string): Promise<void> => {
      const aim = open;
      const going = tasks.filter((task) => ids.includes(task.id));
      if (!aim || !going.length) return;
      const stay = tasks.find((task) => task.id === keep);
      const moving = inside && ids.includes(inside.id) && stay ? openTask(aim, stay) : null;
      const was = inside;
      await Promise.all(
        going.map((task) => client.tasks.abandon({ id: task.id }, { timeoutMs: 0 }))
      );
      closedIn = going[0]!.project;
      say(`closed ${counted(going.length, 'session')}.`, 3000);
      await moving;
      /* Nobody left to step over to: the same landing taking the last one
         down from its card gives. */
      if (moving || !was || !ids.includes(was.id) || open !== aim) return;
      if (was.workspace && workspaces.some((each) => each.id === was.workspace))
        await enterWorkspace(aim, was.workspace);
      else await openDistrict({ kind: 'district', district: aim.district });
    };

    /** The signboards moved under the yard you are standing in. */
    const redrawBoards = (): void => {
      const here = open ? projectOn(open.district) : undefined;
      if (!watching || !here) return;
      watching.moved({
        project: here,
        tasks: tasksFor(here.id),
        moods: seen,
        workspaces: boardsFor(here),
      });
    };

    const go = (id: string): void => {
      // The finder is a board like any other, so picking something on it is
      // picking that thing: it steps out of the way first and then answers.
      if (looking && id !== FIND) looking = null;
      /* A new session is a real one, straight away: the hook cuts it and you
         are standing in it, agent waking, with the line ready. The agent names
         it once it knows what it is about. Every press does that; the other
         ways of starting one are the hook's right-click and command-N. */
      if (id === 'new') {
        const district = open?.district;
        const project = district ? projectOn(district) : undefined;
        if (!district || !project) return;
        const aim: Aim = { kind: 'district', district };
        if (naming) return;
        void startNow(aim);
        return;
      }
      if (id === 'new:ways') {
        const district = open?.district;
        if (!district || !projectOn(district) || naming) return;
        askName(
          { kind: 'district', district },
          freeSlot(district),
          '',
          false,
          false,
          inside && untouched() ? inside.id : null
        );
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
      if (id === 'do:workspace') {
        const district = open?.district;
        if (!district || !projectOn(district) || naming) return;
        askName({ kind: 'district', district }, freeSlot(district), '', false, true);
        return;
      }
      if (id.startsWith('workspace:')) {
        if (open) void enterWorkspace({ kind: 'district', district: open.district }, id.slice(10));
        return;
      }
      if (id.startsWith('workspace-name:')) {
        const [which = '', name = ''] = id.slice(15).split('\t');
        workspaces = workspaces.map((each) => (each.id === which ? { ...each, name } : each));
        redrawBoards();
        void client.tasks.renameWorkspace({ id: which, name });
        return;
      }
      if (id.startsWith('workspace-drop:')) {
        void dropWorkspace(id.slice(15));
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
      if (id === 'do:watch' || id === 'watch:build') {
        if (buildWatch) {
          closeBuild();
          home();
        } else openBuild();
        return;
      }
      if (id === 'do:reopen') {
        if (lastLeft?.kind === 'file') void openFile(lastLeft.path);
        else if (lastLeft?.kind === 'folder') void walkIn();
        return;
      }
      if (id === 'do:out') {
        void (async () => {
          /* Closing a tab. The session you are standing in comes off the rail
             altogether, the same as taking it down from its card, and you
             land in the next one along; once nobody is left the project lets
             go too. It is one press, because the branch outlives it and the
             empty hook offers it straight back. The one thing that would not
             come back is work in its own worktree nobody committed, so only
             then does the first press say so and the second do it. */
          const task = inside;
          const aim = open;
          if (task && aim) {
            const armed = closing?.task === task.id && Date.now() - closing.at < 4000;
            closing = null;
            if (!armed && !task.shared) {
              const left = await uncommittedIn(task);
              if (left) {
                closing = { task: task.id, at: Date.now() };
                const again = (chordOf('do:out', keybindings) ?? 'w').toUpperCase();
                say(
                  `${left} in here nobody has committed. ⌘${again} again to close it anyway.`,
                  4000
                );
                /* Return is the same second press as the chord, for as long
                   as the offer stands. */
                const unask = stand(() => go('do:out'));
                window.setTimeout(unask, 4000);
                return;
              }
            }
            /* The next one along in the same workspace. Once an isolated
               workspace is empty you stay in it, on a fresh session, rather
               than being carried off somewhere else in the project; only the
               project's own folder falls through to the next anywhere. */
            const next =
              nextOf(tasksOn(aim.district), task.id) ??
              (task.workspace ? undefined : nextOf(allOn(aim.district), task.id));
            /* Over to the neighbour first, the same step pressing its lantern
               takes, and the one closed comes down behind you. Waiting on the
               take-down before moving left the board standing on a session
               whose lantern had already gone, then fading where it stood. */
            if (next) {
              const going = openTask(aim, next);
              await client.tasks.abandon({ id: task.id }, { timeoutMs: 0 });
              closedIn = task.project;
              say(null);
              await going;
              return;
            }
            await client.tasks.abandon({ id: task.id }, { timeoutMs: 0 });
            closedIn = task.project;
            say(null);
            if (open !== aim) return;
            if (task.workspace && workspaces.some((each) => each.id === task.workspace)) {
              await enterWorkspace(aim, task.workspace);
              return;
            }
          }
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
      if (id === 'do:revive') {
        const here = open && projectOn(open.district);
        void reopenClosed(here ? here.id : closedIn);
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
      if (id === 'rail:back' || id === 'rail:forward') {
        stepRail(id === 'rail:back' ? -1 : 1);
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
        const district = project && districtFor(project.district);
        // A peg always takes you to that project, never away from it: pressing
        // the one you are standing on is how you get back out of a session.
        if (district) void openDistrict({ kind: 'district', district });
        return;
      }
      if (!id.startsWith('task:')) return;
      const task = tasks.find((candidate) => candidate.id === id.slice(5));
      if (!task) return;
      const district = districtFor(
        projects.find((project) => project.id === task.project)?.district ?? ''
      );
      if (district) void openTask({ kind: 'district', district }, task);
    };

    /** Tab along the rail: the next lantern forward, the one before back,
        going round at either end, the way tab moves along a row of tabs. From
        the project's own yard, with nobody stood in, forward is the first
        lantern and back the last. Nothing happens out on the island. */
    const stepRail = (by: number): void => {
      if (!open) return;
      const here = tasksOn(open.district);
      if (!here.length) return;
      const at = inside ? here.findIndex((task) => task.id === inside?.id) : -1;
      const to = at < 0 ? (by > 0 ? 0 : here.length - 1) : (at + by + here.length) % here.length;
      const task = here[to];
      if (!task || task.id === inside?.id) return;
      go(`task:${task.id}`);
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
      closeJira();
      walkedUp = null;
      wood(finding('', { projects, tasks, moods: seen, where: standing() }, keybindings));
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
        const district = project && districtFor(project.district);
        if (district) await openDistrict({ kind: 'district', district });
        else {
          await shut();
          flyOut(camera, drawn.island);
        }
        return;
      }
      const task = tasks.find((each) => each.id === going.id);
      const district =
        task && districtFor(projects.find((p) => p.id === task.project)?.district ?? '');
      // A session that is not there any more goes back to the district it
      // stood in, and only somewhere wholly gone puts you back out on the water.
      if (!task && going.project) {
        await visit({ kind: 'project', id: going.project });
        return;
      }
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
          drawn = await draw(
            world,
            client,
            pixi.renderer,
            camera,
            drawn,
            sky,
            weatherLayer,
            skyFrame,
            flagLayer
          );
          projects = await client.projects.list({});
          people();
          frame(camera, drawn.island);
        },
        from
      );
      /* And the first thing a project that has just moved in is asked is what
         it looks like, standing in its own yard, with the pictures its checkout
         already has laid out to choose from. */
      const district = moved && districtFor(moved.district);
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
        sessions: null as SessionUsage[] | null,
        fiveHours: null as FiveHours | null,
        providers: {} as Record<string, ProviderConfig>,
        installs: {} as Record<string, HostDependencyView>,
        checkout: null as CheckoutSettings | null,
        terminal: null as TerminalSettings | null,
        notifications: null as NotificationSettings | null,
        keybindings: null as Keybindings | null,
        update: null as UpdateState | null,
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
          defaultHand = state.hand;
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
          const config = await client.appSettings.setExtraArgs(
            { agent, extraArgs },
            { timeoutMs: 0 }
          );
          state.providers = { ...state.providers, [agent]: config };
        },
        setEnvVar: async (agent, key, value) => {
          const config = await client.appSettings.setEnvVar(
            { agent, key, value },
            { timeoutMs: 0 }
          );
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
        setBranchPrefix: async (prefix) => {
          state.checkout = await client.appSettings.setBranchPrefix({ prefix }, { timeoutMs: 0 });
        },
        setRandomSuffix: async (on) => {
          state.checkout = await client.appSettings.setRandomSuffix({ on }, { timeoutMs: 0 });
        },
        setProjectsDir: async (dir) => {
          state.checkout = await client.appSettings.setProjectsDir({ dir }, { timeoutMs: 0 });
        },
        setWorktreeDir: async (dir) => {
          state.checkout = await client.appSettings.setWorktreeDir({ dir }, { timeoutMs: 0 });
        },
        setTerminalFontSize: async (fontSize) => {
          state.terminal = await client.appSettings.setTerminalFontSize(
            { fontSize },
            { timeoutMs: 0 }
          );
          terminalSettings = state.terminal;
        },
        setDefaultShell: async (shell) => {
          state.terminal = await client.appSettings.setDefaultShell({ shell }, { timeoutMs: 0 });
          terminalSettings = state.terminal;
        },
        setNotificationsEnabled: async (on) => {
          state.notifications = await client.appSettings.setNotificationsEnabled(
            { on },
            { timeoutMs: 0 }
          );
        },
        rebind: async (pick, chord) => {
          state.keybindings = await client.appSettings.setKeybinding(
            { pick, chord },
            { timeoutMs: 0 }
          );
          keybindings = state.keybindings;
        },
        unbind: async (pick) => {
          state.keybindings = await client.appSettings.clearKeybinding({ pick }, { timeoutMs: 0 });
          keybindings = state.keybindings;
        },
        checkUpdate: async () => {
          state.update = { ...(state.update ?? (await client.updates.state({}))), phase: 'checking' };
          ui.update(state);
          // It moves through fetching on its own; look in on it until it settles.
          const asked = client.updates.check({}, { timeoutMs: 0 });
          const peek = window.setInterval(() => {
            void client.updates.state({}).then((now) => {
              state.update = now;
              ui.update(state);
            });
          }, 1000);
          state.update = await asked.finally(() => window.clearInterval(peek));
          ui.update(state);
        },
        restartToUpdate: async () => {
          await client.updates.restart({});
        },
        claude: {
          config: (dir) => client.appSettings.claudeConfig({ dir }, { timeoutMs: 0 }),
          edit: (edit, dir) => client.appSettings.claudeEdit({ edit, dir }, { timeoutMs: 0 }),
          projects: () => projects.map((one) => ({ id: one.id, name: one.name, path: one.path })),
        },
        jira: {
          status: () => client.jira.status({}),
          connect: async (site, email, token) => {
            const done = await client.jira.connect({ site, email, token }, { timeoutMs: 30_000 });
            if (done.success) return null;
            return jiraSaid(done.error);
          },
          forget: async (site) => {
            await client.jira.forget({ site });
          },
          setRecipe: async (recipe) => {
            await client.jira.setRecipe({ recipe });
          },
          projects: () => projects.map((one) => ({ id: one.id, name: one.name })),
          links: () => client.jira.links({}),
          setBoard: async (project, url) => {
            const done = await client.jira
              .setBoard({ project, url }, { timeoutMs: 60_000 })
              .catch(() => null);
            if (!done) return 'Jira took too long to answer.';
            if (!done.success) return jiraSaid(done.error);
            if (quest?.project.id === project)
              void client.jira.linkOf({ project }).then((link) => jiraView().open({ project: quest?.project.name ?? '', link }));
            return null;
          },
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
        void client.appSettings.sessionUsage({}, { timeoutMs: 0 }).then((sessions) => {
          state.sessions = sessions;
          ui.update(state);
        });
        void client.appSettings.fiveHours({}, { timeoutMs: 0 }).then((five) => {
          state.fiveHours = five;
          ui.update(state);
        });
        void client.updates.state({}).then((up) => {
          if (state.update?.phase === 'checking' && up.phase !== 'checking') return;
          state.update = up;
          ui.update(state);
        });
      };
      sample();
      const sampling = setInterval(sample, 5000);
      void (async () => {
        const [hand, hands, checkout, terminal, notifications, bound] = await Promise.all([
          client.appSettings.defaultHand({}, { timeoutMs: 0 }),
          client.appSettings.hands({}, { timeoutMs: 0 }),
          client.appSettings.checkoutSettings({}, { timeoutMs: 0 }),
          client.appSettings.terminalSettings({}, { timeoutMs: 0 }),
          client.appSettings.notificationSettings({}, { timeoutMs: 0 }),
          client.appSettings.keybindings({}, { timeoutMs: 0 }),
        ]);
        state.hand = hand;
        state.hands = hands;
        state.checkout = checkout;
        state.terminal = terminal;
        terminalSettings = terminal;
        state.notifications = notifications;
        state.keybindings = bound;
        keybindings = bound;
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
            const paths = new Set([
              ...tasks.map((task) => task.path),
              ...workspaces.map((each) => each.path),
            ]);
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
      closeJira();
      walkedUp = null;
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
    const showYard = async (
      aim: Aim,
      project: Project,
      here?: Task,
      settingUp?: string
    ): Promise<void> => {
      const was = live;
      live = null;
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      /* A different checkout is a different tree, so the one being held goes. */
      if (kept && kept.path !== (here?.path || project.path)) letGoOfTree();
      else stopWalking();
      stopTalking();
      sending = null;
      closeJira();
      walkedUp = null;
      /* The line belongs to the session it was written in. Stepping to
         another leaves that one's half-written line with it, not on this. */
      if (inside?.id !== here?.id) yard.line.write('');
      inside = here ?? null;
      if (here && !settingUp) {
        workspaceIn.set(project.id, here.workspace ?? '');
        lastInWorkspace.set(`${project.id}|${here.workspace ?? ''}`, here.id);
      }
      if (here && unseen.delete(here.id)) lightHouses();
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
          glances,
          unread: new Map(unseen),
          workspaces: boardsFor(project),
          ...(here ? { here } : {}),
          servers: servingCheckouts(),
          ...(cutting.size ? { cutting: new Set(cutting.keys()) } : {}),
          waking: Boolean(here && !here.kind?.match(/terminal|shell/)),
          ...(settingUp ? { settingUp } : {}),
        },
        (now) => {
          buildWatch?.update(now);
          if (walkedUp) {
            const again = now.session?.agents.find((one) => one.id === walkedUp?.hand.id);
            if (again && open === aim) {
              const home = walkedUp.hand.where === 'out' && again.where !== 'out';
              walkedUp = { ...walkedUp, hand: again };
              if (walkedUp.told?.length) {
                const spoken = (now.session?.thoughts ?? []).filter((one) => !one.quiet);
                const from = walkedUp.since
                  ? spoken.findIndex((one) => one.id === walkedUp?.since) + 1
                  : 0;
                const last = spoken.slice(from).at(-1);
                const was = walkedUp.reply?.going;
                if (last)
                  walkedUp.reply = {
                    said: last.said,
                    going: Boolean(now.session?.live),
                  };
                /* Once the reply has landed, their own record has the new answer. */
                if (was !== false && walkedUp.reply && !walkedUp.reply.going)
                  void readTrail(again.id);
              }
              rewrite(helper(walkedUp));
              if (home) void readTrail(again.id);
            }
          }
          if (
            open === aim &&
            !reading &&
            !looked &&
            !walking &&
            !talking &&
            !sending &&
            !card &&
            !walkedUp
          ) {
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
      /* Whatever moved while it was opening, a session taken down on the way
         over above all, was handed to nobody, so it is handed on now. */
      people();
      yard.line.take();
      /* And wake whoever lives in there. A session keeps its checkout and its
         transcript across a restart but the agent is not running, and a
         sleeping agent cannot say what it can do — so walking into the yard is
         what starts it, not the first thing you say. */
      // A terminal-kind session wakes over the TUI runtime instead — see
      // `openTuiTask`, which calls `showYard` for the rail and gatepost and
      // then takes the board itself over.
      if (here && here.kind !== 'terminal' && here.kind !== 'shell') {
        opened.woke(client.agents.wake({ task: here.id }, { timeoutMs: 0 }));
        /* Whatever was half-written last time is still on the line. */
        const held = drafts.get(here.id);
        void (
          held !== undefined ? Promise.resolve(held) : client.agents.draft({ task: here.id })
        ).then((text) => {
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
      /* A piece of an already-drawn district nobody has founded yet still
         glows under the pointer like any other place a press does something
         — the ground itself cannot tell a claimed cell from a bare one, only
         the project registry can. Doing nothing here used to be the whole
         answer; now a press on bare land is the same door the campfire
         already opens; founding never targets a particular spot, so it opens
         onto the same three ways in as anywhere else. */
      if (!project) {
        openFound();
        return;
      }
      flyToYard(camera, aim.district);
      if (project.available === false) {
        showMissingFolder(aim, project);
        arrived();
        return;
      }
      /* You open a project to get at the work in it, so you land in the work:
         whichever session you were last in, or none if it has never had one. */
      const standing = allOn(aim.district);
      const last = lastIn.get(project.id);
      const here =
        standing.find((task) => task.id === last) ?? tasksOn(aim.district)[0] ?? standing[0];
      /* Nobody here yet: there is no work to land in, so a session is
         started and you land in that, the same as pressing the hook. */
      if (!here) {
        await startNow(aim);
        arrived();
        return;
      }
      /* A session that is a terminal is only ever its terminal. */
      if (here.kind === 'terminal' || here.kind === 'shell') {
        await openTask(aim, here);
        return;
      }
      await showYard(aim, project, here);
      arrived();
    };

    /** Nothing said yet in the session you are standing in, and nobody at work. */
    const untouched = (): boolean => {
      /* A terminal says nothing the yard can read, so it is never a
         placeholder to be swapped out. */
      if (inside?.kind === 'terminal' || inside?.kind === 'shell') return false;
      const session = watching?.yard().session;
      return Boolean(session && !session.notes.length && !session.live);
    };

    /** The untouched session the board of other ways was opened over, which
        whatever is started from that board replaces. */
    let replacing: string | null = null;

    /**
     * A session, now: cut in the project's own folder with nothing said, and
     * stood in, so the agent wakes and the line is where it starts.
     */
    const startNow = async (aim: Aim): Promise<void> => {
      const project = projectOn(aim.district);
      if (!project) return;
      /* Into whichever workspace you are standing in: a new session there
         works beside the others in its worktree. */
      const workspace = workspaceOf(project.id);
      const made = await client.tasks.begin(
        {
          project: project.id,
          name: 'claude',
          slot: freeSlot(aim.district),
          ...(workspace ? { workspace } : {}),
        },
        { timeoutMs: 0 }
      );
      if (!made.success) {
        say(whyNot(made.error), 6000);
        return;
      }
      await openTask(aim, made.data);
    };

    /* Backing off the board of other ways to start one lands back in the
       session it was opened over. */
    const unname = (): void => {
      naming = null;
      replacing = null;
      const task = inside;
      if (open && task) void openTask({ kind: 'district', district: open.district }, task);
      else if (open) void openDistrict({ kind: 'district', district: open.district });
    };

    /**
     * A project whose folder is gone — moved or deleted outside the village.
     * Said plainly, on the same wood any other doing opens from the island
     * on, with the one way out: pick the folder it is actually in now.
     */
    const showMissingFolder = (aim: Aim, project: Project): void => {
      open = aim;
      naming = null;
      titling = null;
      wood([
        { kind: 'title', text: project.name },
        { kind: 'line', text: `its folder is gone — it was at ${project.path}.`, tone: 'faded' },
        { kind: 'gap' },
        { kind: 'line', text: 'relink it', pick: 'relink' },
      ]);
    };

    const relinkProject = async (project: Project): Promise<void> => {
      const done = await client.projects.relink({ id: project.id }, { timeoutMs: 0 });
      if (!done.success) {
        if (done.error.kind === 'cancelled') return;
        say(
          done.error.kind === 'not-a-repository'
            ? `${done.error.path} is not a git repository.`
            : 'that project is gone.',
          6000
        );
        return;
      }
      projects = projects.map((each) => (each.id === project.id ? done.data : each));
      const aim = open;
      if (aim && projectOn(aim.district)?.id === project.id) await openDistrict(aim);
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
      closeJira();
      walkedUp = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      inside = task;
      if (unseen.delete(task.id)) lightHouses();
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
        at: foundedRank(project),
        pictures: null,
        more: 0,
        carrying: null,
        scripts: null,
        github: null,
        sessions: tasks.filter((task) => task.project === project.id).length,
        history: null,
        schedules: null,
        scheduleHands: [],
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
            workspaces: boardsFor(now),
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
        env: async (text) => {
          await client.projects.setEnv({ id: project.id, text }, { timeoutMs: 0 });
          await refreshed();
        },
        excludes: async (text) => {
          await client.projects.setExcludes({ id: project.id, text }, { timeoutMs: 0 });
          await refreshed();
        },
        keepTranscripts: async (keeps) => {
          await client.projects.setKeepsTranscripts({ id: project.id, keeps }, { timeoutMs: 0 });
          await refreshed();
        },
        script: async (which, value) => {
          state.scripts = await client.projects.script(
            { id: project.id, which, value },
            { timeoutMs: 0 }
          );
          redraw();
        },
        addSchedule: async (what, agent, terminal, when) => {
          state.schedules = await client.schedules.add(
            { project: project.id, what, agent, kind: terminal ? 'terminal' : undefined, when },
            { timeoutMs: 0 }
          );
          redraw();
        },
        removeSchedule: async (id) => {
          state.schedules = await client.schedules.remove({ id }, { timeoutMs: 0 });
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
        readHistory: async (id) => {
          const entry = state.history?.find((one) => one.id === id);
          if (!entry) return null;
          const read = await client.agents.work.state({ task: id }, 'state').snapshot();
          return { title: entry.title, branch: entry.branch, turns: turnsOf(read.data.told) };
        },
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
        state.history = await client.tasks.history({ project: project.id }, { timeoutMs: 0 });
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
      void (async () => {
        state.scheduleHands = await client.schedules.agents({}, { timeoutMs: 0 });
        state.schedules = await client.schedules.list({ project: project.id }, { timeoutMs: 0 });
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
        unname();
        return;
      }
      reading = null;
      writing = null;
      looked = null;
      branchLooked = null;
      stopWalking();
      stopTalking();
      sending = null;
      closeJira();
      walkedUp = null;
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

    /** Bringing an agent already here up to date, the plugin's own way. */
    const updateHand = async (hand: string): Promise<void> => {
      say('bringing them up to date…', 600000);
      const done = await client.agents
        .update({ hand }, { timeoutMs: 0 })
        .catch((error: unknown) => ({
          success: false as const,
          error: { kind: 'refused' as const, because: String(error) },
        }));
      if (!done.success) {
        say(whyNot(done.error), 8000);
        return;
      }
      say(done.data.here ? 'up to date.' : 'it ran, and they are still not here.', 6000);
      rewrite(card?.rows() ?? []);
    };

    /** Taking an agent's CLI back off this machine, the plugin's own way. */
    const removeHand = async (hand: string): Promise<void> => {
      say('taking them off this machine…', 600000);
      const done = await client.agents
        .remove({ hand }, { timeoutMs: 0 })
        .catch((error: unknown) => ({
          success: false as const,
          error: { kind: 'refused' as const, because: String(error) },
        }));
      if (!done.success) {
        say(whyNot(done.error), 8000);
        return;
      }
      say(done.data.here ? 'it ran, and they are still here.' : 'gone.', 6000);
      rewrite(card?.rows() ?? []);
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
    /** What a checkout's own project says every session here carries, plus
        the windmill's own default shell where one is set — the project wins
        when both name `SHELL`, since it is the more specific of the two. */
    const shellEnvOf = (project: Project | undefined): Record<string, string> => {
      const env: Record<string, string> = {};
      const shell = terminalSettings?.defaultShell.trim();
      if (shell) env.SHELL = shell;
      return { ...env, ...parseEnvLines(project?.env ?? '') };
    };

    const talk = async (id = 'village'): Promise<void> => {
      const place = onPlace();
      if (!place || !open) return;
      const aim = open;
      stopTalking();
      stopWalking();
      const name = 'title' in place ? place.title : place.name;
      const second = id !== 'village';
      talking = { shell: null, name, shellId: id, ending: null };
      const mine = talking;
      const redrawShell = (running: boolean, stopped?: string): void => {
        wood(
          shell({ name, running, stopped, second, ending: mine.ending }),
          running && mine.shell ? mine.shell.el : undefined
        );
      };
      redrawShell(false);
      const owner = 'title' in place ? projects.find((p) => p.id === place.project) : place;
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
        (url) => noteServer(place.path, url),
        id,
        shellEnvOf(owner),
        terminalSettings?.fontSize ?? 0
      );
      if (talking !== mine || open !== aim) {
        await running?.close();
        return;
      }
      if (!running) {
        redrawShell(true, 'no shell would start here.');
        return;
      }
      mine.shell = running;
      redrawShell(true);
      running.focus();
    };

    /**
     * Ending a shell from the board, in two presses: the first asks what is
     * running under it, the second actually ends it.
     *
     * The armed line names what it would lose, read off the machine itself
     * (`board.runningIn`) rather than guessed — a shell with nothing but its
     * own prompt running says so plainly instead of pretending there is
     * something to weigh.
     */
    const endShell = async (): Promise<void> => {
      const mine = talking;
      if (!mine?.shell) return;
      const key = 'key' in mine.shell ? mine.shell.key : null;
      const task = mine.tuiTask;
      if (!key && !task) return;

      const redraw = (): void => {
        if (key) {
          wood(
            shell({
              name: mine.name,
              running: true,
              second: mine.shellId !== 'village',
              ending: mine.ending,
            }),
            mine.shell?.el
          );
        } else {
          wood(
            tuiSession({
              name: mine.name,
              hand: tasks.find((one) => one.id === task)?.agent ?? 'the agent',
              running: true,
              ending: Boolean(mine.ending?.armed),
            }),
            mine.shell?.el
          );
        }
      };

      if (!mine.ending?.armed) {
        mine.ending = { armed: false, what: null };
        redraw();
        const found = key ? await client.board.runningIn({ key }, { timeoutMs: 0 }) : null;
        if (talking !== mine) return;
        mine.ending = { armed: true, what: found?.name ?? null };
        redraw();
        return;
      }
      if (key) {
        await client.terminals.kill({ key }, { timeoutMs: 0 });
        if (talking !== mine) return;
        stopTalking();
        if (live) wood(live.rows());
        else home();
        return;
      }
      if (task) await client.tuiAgents.stop({ conversationId: task }, { timeoutMs: 0 });
      if (talking !== mine) return;
      stopTalking();
      home();
    };

    const stopTalking = (): void => {
      const was = talking;
      talking = null;
      void was?.shell?.close();
      closeBrowser();
    };

    /**
     * Putting the line that fetches something this machine is missing onto
     * the board's real shell, ready to run.
     *
     * Written there rather than sent: this only ever gets as far as arming
     * the command, on the same real prompt anything else typed there runs
     * on, and pressing return there — his own key, in his own shell — is the
     * approval that actually runs a real command on the real machine.
     */
    const runInstall = async (command: string): Promise<void> => {
      if (!talking?.shell) await talk();
      if (talking?.shell && 'key' in talking.shell) {
        void client.terminals.sendInput({ key: talking.shell.key, data: command });
      }
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

    /** What it is building, laid over the yard, running, with every look under it. */
    const openBuild = (): void => {
      const session = watching?.yard().session;
      if (!inside || !session?.building) return;
      const opened = watchBuild(inside.id, session);
      if (!opened) return;
      stopWalking();
      stopTalking();
      hunt = null;
      closeBuild();
      buildWatch = opened;
      wood([], opened.el);
      /* The page is lit, so it is watched in the dark rather than on the wash. */
      const sheet = opened.el.closest<HTMLElement>('[data-sheet]');
      if (sheet) {
        buildWash = { sheet, was: sheet.style.background };
        sheet.style.background = 'rgba(9,8,6,.94)';
      }
    };

    const closeBuild = (): void => {
      const was = buildWatch;
      buildWatch = null;
      was?.close();
      if (buildWash) buildWash.sheet.style.background = buildWash.was;
      buildWash = null;
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

    /** What Jira said, in words. */
    const jiraSaid = (error: JiraError): string =>
      error.kind === 'not-connected'
        ? 'this Mac is not connected to that Jira site any more.'
        : error.kind === 'unreachable'
          ? `Jira could not be reached: ${error.said}`
          : error.said;

    /** Which session here is on which ticket, and what its lantern says. */
    const litTickets = async (): Promise<Record<string, OnTicket>> => {
      const taken = await client.jira.taken({});
      const out: Record<string, OnTicket> = {};
      for (const one of taken) {
        const task = tasks.find((each) => each.id === one.task);
        if (!task) continue;
        out[one.key] = { task: task.id, name: task.title || task.name, mood: seen[task.id] ?? 'empty' };
      }
      return out;
    };

    /**
     * The project's Jira, off the blue token on the rack: Jira's own site in a
     * window over the whole village. Made the first time it is asked for and
     * kept after that, so it opens again where it was left.
     */
    let jiraSurface: JiraSurface | null = null;
    const jiraView = (): JiraSurface =>
      (jiraSurface ??= makeJiraSurface({
        wire: {
          api: async (site, method, path, body) => {
            const got = await client.jira.api(
              { site, method, path, ...(body === undefined ? {} : { body }) },
              { timeoutMs: 45_000 }
            );
            if (!got.success) throw new JiraFailed(jiraSaid(got.error));
            return got.data;
          },
        },
        close: () => closeJira(),
        take: (site, key) => void takeOn(site, key),
        takeMany: (site, keys, progress) => takeMany(site, keys, progress),
        go: (task) => {
          closeJira();
          go(`task:${task}`);
        },
        connect: () => {
          closeJira();
          windmillOnJira();
          openTheWindmill();
        },
        sites: async () => (await client.jira.status({})).sites,
        link: async (to) => {
          const project = quest?.project;
          if (project) await client.jira.link({ project: project.id, to });
        },
        /* Jira is written into the yard at night rather than over a sheet:
           the village dims to the yard's own dark, and the board stands
           between the yard's heading and its rail. */
        backdrop: (on) => {
          /* The yard's heading and its rail stay where they are; only
             what the session itself says steps aside for the board. */
          layer.root.classList.toggle('under-jira', on);
          if (on) {
            underJira = pixi.canvas.style.filter;
            /* Lighter than the yard's own dark: Jira's window is frosted
               glass, and the island glowing through it is the point. */
            pixi.canvas.style.transition = 'filter 520ms cubic-bezier(.2,.8,.2,1)';
            pixi.canvas.style.filter = 'brightness(.62) saturate(1.1)';
          } else pixi.canvas.style.filter = underJira;
        },
      }));
    let underJira = '';
    const closeJira = (): void => {
      if (!quest) return;
      quest = null;
      jiraSurface?.close();
    };

    const openQuest = async (): Promise<void> => {
      const project = open ? projectOn(open.district) : undefined;
      if (!open || !project) return;
      stopWalking();
      stopTalking();
      quest = { project };
      const link = await client.jira.linkOf({ project: project.id });
      if (quest?.project !== project) return;
      jiraView().open({ project: project.name, link });
      jiraView().lit(await litTickets());
    };
    openTheBoard = () => {
      if (quest) closeJira();
      else void openQuest();
    };

    /* Which cards carry a session's light follows the lanterns. */
    window.setInterval(() => {
      if (quest) void litTickets().then((lit) => jiraView().lit(lit));
    }, 2000);

    /** A ticket taken on: its own copy, its own branch, the ticket said first. */
    const takeOn = async (site: string, key: string): Promise<void> => {
      const project = quest?.project;
      const view = jiraView();
      if (!project || !open) return;
      const [status, ticket] = await Promise.all([client.jira.status({}), view.ticket(site, key)]);
      if (!ticket) {
        say(`Jira would not hand ${key} over.`, 6000);
        return;
      }
      if (ticket.category === 'new') void view.start(site, key);
      closeJira();
      home();
      naming = {
        district: open.district,
        project,
        slot: null,
        written: `${key} ${ticket.summary}`.slice(0, 60),
        revivable: null,
        terminal: false,
        isolated: true,
        said: '',
        brief: briefOf(status.recipe, {
          key,
          summary: ticket.summary,
          url: `https://${site}/browse/${key}`,
          description: ticket.description,
        }),
        jira: { site, key, to: [] },
      };
      void begin();
    };

    /**
     * Several tickets at once: each its own workspace named after it, told
     * its ticket first, and moved out of to-do, one after another so no two
     * worktrees are cut on top of each other. Nobody is walked anywhere; their
     * lanterns come up on the board's cards as each one starts.
     */
    const takeMany = async (site: string, keys: string[], progress: (said: string) => void): Promise<void> => {
      const project = quest?.project;
      if (!project) return;
      const view = jiraView();
      const status = await client.jira.status({});
      let n = 0;
      for (const key of keys) {
        progress(`launching ${key}, ${++n} of ${keys.length}…`);
        const ticket = await view.ticket(site, key);
        if (!ticket) {
          progress(`Jira would not hand ${key} over`);
          continue;
        }
        if (ticket.category === 'new') void view.start(site, key);
        const made = await client.tasks.begin(
          { project: project.id, name: `${key} ${ticket.summary}`.slice(0, 60), slot: null, isolated: true },
          { timeoutMs: 0 }
        );
        if (!made.success) {
          progress(`${key}: ${whyNot(made.error)}`);
          continue;
        }
        void client.jira.take({ task: made.data.id, site, key });
        void client.agents.tell(
          {
            task: made.data.id,
            text: briefOf(status.recipe, {
              key,
              summary: ticket.summary,
              url: `https://${site}/browse/${key}`,
              description: ticket.description,
            }),
          },
          { timeoutMs: 0 }
        );
        void litTickets().then((lit) => view.lit(lit));
      }
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

      /* No PR whose head matches this branch — the one picked by hand for
         this session, if any, is the next thing to try before giving up
         and offering to open one. */
      const linked = inside?.pull;
      const byHand =
        !found.success || !found.data.prs.length
          ? linked
            ? await client.pulls.getPullRequestByUrl({ repositoryUrl: repository, url: linked })
            : null
          : null;
      if (open !== aim) return;

      const pull =
        (found.success ? found.data.prs[0] : undefined) ??
        (byHand?.success ? (byHand.data.pr ?? undefined) : undefined);
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
          const got = await client.pulls.getPullRequestComments({
            repositoryUrl: repository,
            number,
          });
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

    /** Turning the board over to the repository's own open pull requests,
        read-only against GitHub, for linking one to this session by hand. */
    const openLinkPicker = async (): Promise<void> => {
      const mine = sending;
      if (!mine) return;
      sending = { ...mine, linking: true, linkable: mine.linkable ?? null };
      rewrite(sent(sending));
      const found = await client.pulls.listPullRequests({
        repositoryUrls: [mine.repository],
        cursor: null,
        limit: 30,
        filters: { status: 'open' },
      });
      if (sending !== mine && sending?.repository !== mine.repository) return;
      sending = { ...sending!, linkable: found.success ? found.data.prs : [] };
      rewrite(sent(sending));
    };

    /** Picking one — the session's own to remember, so the board finds it
        again without matching a branch. */
    const pickLinkPull = async (url: string): Promise<void> => {
      const session = inside;
      if (!session) return;
      const now = await client.tasks.linkPull({ id: session.id, url }, { timeoutMs: 0 });
      tasks = now;
      inside = now.find((each) => each.id === session.id) ?? inside;
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
      drawn = await draw(
        world,
        client,
        pixi.renderer,
        camera,
        drawn,
        sky,
        weatherLayer,
        skyFrame,
        flagLayer
      );
      projects = await client.projects.list({});
      tasks = tasks.filter((task) => task.project !== project.id);
      people();
      paintRail();
      frame(camera, drawn.island);
      arrived();
      return { said: 'forgotten. the folder is still where it was.' };
    };

    /**
     * Putting a project away, or back. Away it is still on the rack with
     * every session in it, and only its district goes back to sea, so the
     * island can be the few that are worked in and nothing else. Back, it
     * takes the next free place, the way founding hands them out. Standing
     * in it while it goes keeps you standing in it.
     */
    const reseat = async (id: string, change: () => Promise<string | null>): Promise<void> => {
      const inIt = open !== null && projectOn(open.district)?.id === id;
      const wrong = await change();
      if (wrong) {
        say(`${wrong}.`, 4000);
        return;
      }
      drawn = await draw(
        world,
        client,
        pixi.renderer,
        camera,
        drawn,
        sky,
        weatherLayer,
        skyFrame,
        flagLayer
      );
      projects = await client.projects.list({});
      people();
      paintRail();
      nudge();
      const now = projects.find((one) => one.id === id);
      const district = now && districtFor(now.district);
      if (inIt && district) await openDistrict({ kind: 'district', district });
      else if (!open && !yard.showing) frame(camera, drawn.island);
    };
    const putAway = (id: string): Promise<void> =>
      reseat(id, async () => {
        await client.projects.putAway({ id });
        return null;
      });
    const putBack = (id: string): Promise<void> =>
      reseat(id, async () => {
        const done = await client.projects.putBack({ id });
        return done.success ? null : done.error;
      });

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
      closedIn = task.project;
      say('taken down.', 3000);
      if (!aim) return;
      if (task.workspace && workspaces.some((each) => each.id === task.workspace))
        void enterWorkspace(aim, task.workspace);
      else void openDistrict({ kind: 'district', district: aim.district });
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
      closeJira();
      walkedUp = null;
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
      closeJira();
      walkedUp = null;
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
      if (task.kind === 'shell') {
        await openShellTask(aim, task);
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
      talking = { shell: null, name, tuiTask: task.id, ending: null };
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

    /** What a plain-terminal session runs the first time it opens: what was
        written on the sign, or picking a past session back up. */
    const firstRun = new Map<string, string>();

    /**
     * A session that is only a terminal: a login shell in its checkout, the
     * same one Terminal.app would give you there, nobody's CLI in it and
     * nothing of the village drawn over it. It lives in its own tmux, keyed to
     * the session, so it is still running when you come back.
     */
    const openShellTask = async (aim: Aim, task: Task): Promise<void> => {
      const project = projects.find((one) => one.id === task.project);
      if (!project) return;
      flyToYard(camera, aim.district);
      lastIn.set(project.id, task.id);
      await showYard(aim, project, task);
      if (open !== aim) return;
      stopTalking();
      const name = task.title;
      talking = { shell: null, name, shellId: `session-${task.id}`, ending: null };
      const mine = talking;
      wood(shell({ name, running: false }));
      const running = await openShell(
        client,
        task.path,
        () => {
          if (talking === mine && open === aim) {
            stopTalking();
            home();
          }
        },
        (url) => noteServer(task.path, url),
        `session-${task.id}`,
        shellEnvOf(project),
        terminalSettings?.fontSize ?? 0,
        true
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
      const first = firstRun.get(task.id);
      if (first) {
        firstRun.delete(task.id);
        await running.settled();
        void client.terminals.sendInput({ key: running.key, data: `${first}\r` });
      }
      arrived();
    };

    /** A new session as plain as they come: in the project's own folder,
        on a conversation, started from nothing. */
    const blankNaming = (
      district: District,
      project: Project,
      slot: number | null,
      written: string
    ): NonNullable<typeof naming> => ({
      district,
      project,
      slot,
      written,
      revivable: null,
      terminal: false,
      resume: null,
      isolated: false,
      among: workspaces.find((each) => each.id === workspaceOf(project.id))?.name,
    });

    /** The sign a new session is asked for on, while it is up. */
    let sign: NewSessionSign | null = null;

    /** A new session is a question: what is going to happen in there. It is
        asked on a signboard hung over the village, not on the wood: where it
        works, whether it picks up a past session, and whether it is a plain
        terminal rather than somebody to talk to. */
    const askName = (
      aim: Aim,
      slot: number | null,
      written = '',
      past = false,
      isolated = false,
      replace: string | null = null
    ): void => {
      const project = projectOn(aim.district);
      if (!project) return;
      const inWorkspace = workspaceOf(project.id);
      const scoped = inWorkspace ? { workspace: inWorkspace } : {};
      sign?.close();
      /* Nothing here changes until go is pressed. The sign's question is
         kept to itself, and only taken up as the app's own once it is
         answered: the yard behind keeps listening to its session while it
         hangs there, and Escape leaves everything exactly as it was. */
      let asked = blankNaming(aim.district, project, slot, written);
      const takeUp = (): void => {
        /* The yard behind only listens to its session while `open` is the
           very aim it was opened with, so the one already open is kept. */
        if (open?.district !== aim.district) open = aim;
        titling = null;
        replacing = replace;
        naming = asked;
      };
      sign = openNewSession({
        where: `on the ${aim.district.name.toLowerCase()}`,
        hand: defaultHand,
        ...(asked.among ? { among: asked.among } : {}),
        past,
        isolated,
        history: () =>
          client.tasks
            .claudeHistory({ project: project.id, ...scoped }, { timeoutMs: 5000 })
            .then((found) => found),
        elsewhere: () =>
          client.tasks.claudeElsewhere({ project: project.id, ...scoped }, { timeoutMs: 10000 }),
        told: (session) =>
          client.tasks.claudeTold(
            {
              project: project.id,
              ...scoped,
              id: session.id,
              mtimeMs: session.mtimeMs,
              ...(session.elsewhere ? { dir: session.elsewhere.dir } : {}),
            },
            { timeoutMs: 0 }
          ),
        adopt: (session) =>
          session.elsewhere
            ? client.tasks.claudeAdopt(
                { project: project.id, ...scoped, dir: session.elsewhere.dir, id: session.id },
                { timeoutMs: 10000 }
              )
            : Promise.resolve(),
        submit: (ask) => {
          sign = null;
          takeUp();
          const hand = ask.past && !ask.terminal ? 'claude' : defaultHand;
          naming = {
            ...asked,
            written: ask.text || ask.past?.title || (ask.terminal ? 'terminal' : hand),
            terminal: ask.terminal,
            isolated: ask.isolated,
            resume: ask.past ? { id: ask.past.id, title: ask.past.title } : null,
            said: ask.text,
          };
          void begin();
        },
        cancel: () => {
          sign = null;
        },
        revive: () => {
          sign = null;
          takeUp();
          void reviveSession();
        },
      });
      // Whether the last one taken down in this project is still on offer —
      // asked after the sign is already up, since it never blocks a fresh
      // one from being written straight away.
      const hung = sign;
      void client.tasks.revivable({ project: project.id }, { timeoutMs: 5000 }).then((held) => {
        if (!held || sign !== hung) return;
        asked = { ...asked, revivable: held };
        hung.revivable(held.title);
      });
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
      await standRevived(aim, made.data);
    };

    /** Into a session just put back up, picking its conversation back up
        where it was rather than waking a blank one in its place. */
    const standRevived = async (aim: Aim, made: { task: Task; session: string | null }) => {
      if (made.session && (made.task.kind ?? 'chat') === 'chat') {
        void client.agents.resume(
          { task: made.task.id, providerSessionId: made.session },
          { timeoutMs: 0 }
        );
      }
      await openTask(aim, made.task);
    };

    /**
     * Command-shift-T, the way a browser brings back a closed tab: the last
     * session taken down in the project you are in, and pressed again the one
     * before it. Out on the island it is the project you last closed one in.
     */
    const reopenClosed = async (project: string | null): Promise<void> => {
      const found = projects.find((one) => one.id === project);
      const district = found && districtFor(found.district);
      if (!found || !district) {
        say('nothing closed to bring back.', 3000);
        return;
      }
      const made = await client.tasks.revive({ project: found.id }, { timeoutMs: 0 });
      if (!made.success) {
        say(
          made.error.kind === 'no-such-project'
            ? 'nothing closed here to bring back.'
            : whyNot(made.error),
          3000
        );
        return;
      }
      await standRevived(
        open?.district === district ? open : { kind: 'district', district },
        made.data
      );
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
      closeJira();
      walkedUp = null;
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
      closeJira();
      walkedUp = null;
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
      closeJira();
      walkedUp = null;
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
        rewrite(finding(written, { projects, tasks, moods: seen, where: standing() }, keybindings));
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
    };

    /** Whatever is watching the project a worktree is being cut in hears about
        it at once, so its lantern hangs dark and says so rather than staying
        unasked-for until the cutting finishes. */
    const syncCutting = (projectId: string): void => {
      const inside = open ? projectOn(open.district) : undefined;
      if (!watching || !inside || inside.id !== projectId) return;
      watching.moved({
        project: inside,
        workspaces: boardsFor(inside),
        tasks: tasksFor(projectId),
        moods: seen,
        cutting: new Set(cutting.keys()),
      });
    };

    const begin = async (): Promise<void> => {
      if (!naming) return;
      const { project, slot, written, terminal, resume, isolated, brief, jira } = naming;
      const said = naming.said ?? written;
      const aim = open;
      naming = null;
      const draftId = `cutting:${crypto.randomUUID()}`;
      const draft: Task = {
        id: draftId,
        project: project.id,
        name: written,
        title: written,
        branch: written,
        slot,
        path: '',
        startedAt: new Date().toISOString(),
      };
      cutting.set(draftId, draft);
      /* Standing in it at once, the fire saying what is being made, the way
         a session that is waking says so: a copy of a big project and its
         setup take long enough that a sign which just went away read as
         nothing having happened. */
      if (aim) {
        flyToYard(camera, aim.district);
        await showYard(
          aim,
          project,
          draft,
          isolated ? 'setting up workspace' : terminal ? 'opening a shell' : 'setting up'
        );
      } else syncCutting(project.id);
      // No deadline: a worktree on a big repository is minutes of copying, plus
      // whatever that project runs to make a checkout usable.
      let made: Awaited<ReturnType<typeof client.tasks.begin>>;
      try {
        made = await client.tasks.begin(
          {
            project: project.id,
            name: written,
            slot,
            kind: terminal ? 'shell' : undefined,
            ...(isolated ? { isolated: true } : {}),
            ...(!isolated && workspaceOf(project.id) ? { workspace: workspaceOf(project.id) } : {}),
          },
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
      // and in a plain terminal it is the first thing run, or picking a past
      // session back up there is.
      if (terminal) {
        /* In its own workspace what was written named the workspace, so it is
           not also run. */
        const first = resume ? `claude --resume ${resume.id}` : isolated ? '' : said;
        if (first) firstRun.set(made.data.id, first);
      } else {
        /* Same in a conversation: in its own workspace what was written names
           the workspace, and the session opens with nothing said. */
        const told = isolated ? (brief ?? '') : said;
        if (resume) {
          // A resumed conversation must actually run on Claude: the picked
          // session id is a Claude Code CLI session id, and only that
          // provider's own adapter knows what to do with it. A no-op if the
          // project's remembered hand was already Claude.
          await client.agents.choose({ task: made.data.id, what: 'hand', id: 'claude' });
          // Resuming *is* the first thing said, and whatever was written on
          // the sign goes after it, once it is back.
          const task = made.data.id;
          void client.agents
            .resume({ task, providerSessionId: resume.id }, { timeoutMs: 0 })
            .then(() => {
              if (told) void client.agents.tell({ task, text: told }, { timeoutMs: 0 });
            });
        } else if (told) {
          void client.agents.tell({ task: made.data.id, text: told }, { timeoutMs: 0 });
        }
      }
      if (jira) {
        void client.jira.take({ task: made.data.id, site: jira.site, key: jira.key });
        if (jira.to.length)
          void client.jira.move({ site: jira.site, key: jira.key, statuses: jira.to });
      }
      /* The untouched session this board was opened over was only ever a
         placeholder for this one. */
      const stale = replacing;
      replacing = null;
      if (stale && stale !== made.data.id)
        void client.tasks.abandon({ id: stale, unoffered: true }, { timeoutMs: 0 });
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
      drawn.pennants.show(null);
      if (!aim) {
        await shut();
        flyOut(camera, drawn.island);
        arrived();
        return;
      }
      // The camp is where the island grows from: its fire is the only thing on
      // an empty island, and founding a project is what it is for.
      if (aim.district.id === CAMP) {
        openFound();
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

    /* Calling it off before anything came of what it was asked hands that
       back, and it goes on the line to be said again, ahead of whatever was
       written there since. */
    const hush = async (task: Task, untouched = false, keep = false): Promise<boolean> => {
      const done = await client.agents.hush({
        task: task.id,
        ...(untouched ? { untouched } : {}),
        ...(keep ? { keep } : {}),
      });
      if (!done.success || done.data.going) return false;
      if (inside?.id !== task.id) return true;
      const { back, pictures } = done.data;
      if (pictures?.length) watching?.carryBack(pictures);
      if (!back) {
        if (pictures?.length && watching) yard.show(watching.yard());
        return true;
      }
      const now = yard.line.written().trim();
      said(now ? `${back} ${now}` : back);
      return true;
    };

    const tell = async (said: string): Promise<void> => {
      const task = inside;
      const saying = watching;
      if (!task || !saying || cutting.has(task.id)) return;
      const carrying = [...saying.carrying()];
      const notes = [...saying.notes()];
      /* Every pinned note rides in with what is actually said, file and line
         first, the same way Emdash folds a diff-line comment into the prompt. */
      const text = [said.trim(), ...notes.map((one) => one.text)].filter(Boolean).join('\n\n');
      /* An empty line says nothing, however busy they are; Escape is how
         somebody is called off. With things still waiting their turn it is
         "read these now": the turn is called off without handing anything
         back to the line, and everything waiting goes to the agent together
         as the next thing it reads. */
      if (!text && !carrying.length) {
        const waiting = (saying.yard().session?.waiting ?? []).some((one) => !one.handed);
        if (waiting && saying.working()) await hush(task, false, true);
        return;
      }
      saying.handed();
      /* Written as a question's own answer, it goes into the question, not up
         onto the gatepost as though it were something new said. */
      if (said.trim() && !saying.asked()?.writable) yard.fly(said.trim());
      /* Said, not half-written any more. */
      const pending = draftTimers.get(task.id);
      if (pending) clearTimeout(pending);
      draftTimers.delete(task.id);
      drafts.delete(task.id);
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
      /* "Something else" is answered on the line, so it only hands it the keyboard. */
      if (optionId === '__other__') {
        yard.line.take();
        return;
      }
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
        said(meant.text, meant.caret);
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
      if (meant.does === 'head') {
        said('');
        await openHead();
        return;
      }
      if (meant.does === 'windmill') {
        said('');
        windmillOnClaude(meant.page);
        openTheWindmill();
        return;
      }
      if (meant.does === 'resume') {
        said('');
        if (aim)
          askName({ kind: 'district', district: aim.district }, freeSlot(aim.district), '', true);
        return;
      }
      if (meant.does !== 'set') return;
      said(meant.keep?.text ?? '', meant.keep?.caret);
      const done = await client.agents.choose(
        { task: task.id, what: meant.what, id: meant.id },
        { timeoutMs: 0 }
      );
      if (!done.success) {
        say(done.error.kind === 'refused' ? done.error.because : 'that would not take.', 6000);
      } else if (meant.what === 'defaultModel' || meant.what === 'defaultEffort')
        say(`new sessions start on ${meant.name}. this one is as it was.`, 4000);
      else say(`${meant.name}, in this session.`, 3000);
    };

    /** How full its head is, with the one press that makes room. */
    const openHead = async (): Promise<void> => {
      const session = watching?.yard().session;
      if (!session || session.room === undefined) return;
      const config = await client.appSettings
        .claudeConfig({ dir: null }, { timeoutMs: 0 })
        .catch(() => null);
      showHead(
        {
          room: session.room,
          ...(session.model ? { model: session.model } : {}),
          auto: config ? { on: config.autoCompact, window: config.compactWindow } : null,
        },
        {
          make: (focus) => void tell(focus ? `/compact ${focus}` : '/compact'),
          settings: () => {
            windmillOnClaude('claude');
            openTheWindmill();
          },
        }
      );
    };

    /* Pressing something on the wood, whether by hand or by key. One way in,
       because a line you can press and cannot reach with the keyboard is a
       line that is only half there. */
    /**
     * Stop one helper where they stand. The session that sent them, and
     * anybody else it sent, carry on; what the session hears is that this one
     * came back without an answer.
     */
    const recall = async (walked: Walked): Promise<void> => {
      const task = inside;
      const call = walked.hand.call;
      if (!task || !call) return;
      const mine: Walked = {
        hand: walked.hand,
        recall: 'going',
        ...(walked.printed !== undefined ? { printed: walked.printed } : {}),
      };
      walkedUp = mine;
      rewrite(helper(mine));
      const done = await client.agents.recall({ task: task.id, call }, { timeoutMs: 15000 });
      if (walkedUp?.hand.id !== walked.hand.id) return;
      const printed = walkedUp.printed !== undefined ? { printed: walkedUp.printed } : {};
      walkedUp =
        done.success && done.data.stopped
          ? { hand: walkedUp.hand, recall: 'done', ...printed }
          : {
              ...printed,
              hand: walkedUp.hand,
              recall: 'refused',
              because: done.success
                ? walkedUp.hand.command !== undefined
                  ? 'it had already finished'
                  : 'they had already come back'
                : done.error.kind === 'refused'
                  ? done.error.because
                  : 'nobody is in there',
            };
      rewrite(helper(walkedUp));
    };

    /**
     * Something said to a helper rather than to the session.
     *
     * Nothing on this machine can reach a subagent directly: the session that
     * sent them is the only one that can, with Claude's own SendMessage. So it
     * goes to the session, with a note only the session sees saying who it is
     * for, and whatever comes back is the session's next answer.
     */
    const tellHelper = async (text: string): Promise<void> => {
      const task = inside;
      const walked = walkedUp;
      const said = text.trim();
      if (!task || !walked || !said) return;
      const who = walked.trail?.agentId ? ` (agent id ${walked.trail.agentId})` : '';
      const hidden =
        `\n\n[mender, for the agent only: that message is for the helper you sent to ` +
        `"${walked.hand.said}"${who}. Pass it to them with SendMessage, word for word, then ` +
        'tell me what they said back. If they cannot be reached any more, say so plainly.]';
      const visible = `to the helper sent to ${walked.hand.errand}: ${said}`;
      const spoken = watching?.yard().session?.thoughts.filter((one) => !one.quiet) ?? [];
      const since = spoken.at(-1)?.id;
      /* Said, not half-written any more. */
      const pending = draftTimers.get(task.id);
      if (pending) clearTimeout(pending);
      draftTimers.delete(task.id);
      drafts.delete(task.id);
      void client.agents.setDraft({ task: task.id, text: '' });
      walkedUp = {
        ...walked,
        told: [...(walked.told ?? []), said],
        ...(since ? { since } : {}),
      };
      delete walkedUp.reply;
      rewrite(helper(walkedUp));
      const heard = await client.agents.tell(
        { task: task.id, text: visible, hidden },
        { timeoutMs: 0 }
      );
      if (!heard.success) {
        say(heard.error.kind === 'refused' ? heard.error.because : 'nobody heard that.', 6000);
      }
    };

    /** Claude's own record of a helper, read once they are walked up to and
        again when they come back, since that is when the answer lands. */
    const readTrail = async (id: string): Promise<void> => {
      const task = inside;
      const call = walkedUp?.hand.call;
      if (task && call && walkedUp?.hand.command !== undefined) {
        window.clearTimeout(tailing);
        const got = await client.agents.commandTail({ task: task.id, call }, { timeoutMs: 10000 });
        if (walkedUp?.hand.id !== id) return;
        walkedUp = { ...walkedUp, printed: got.success ? got.data : null };
        rewrite(helper(walkedUp));
        /* What it prints keeps coming for as long as it is going and you are looking. */
        if (walkedUp.hand.where === 'out')
          tailing = window.setTimeout(() => void readTrail(id), 1500);
        return;
      }
      if (!task || !call) {
        if (walkedUp?.hand.id === id) walkedUp = { ...walkedUp, trail: null };
        return;
      }
      const got = await client.agents.helperTrail({ task: task.id, call }, { timeoutMs: 10000 });
      if (walkedUp?.hand.id !== id) return;
      walkedUp = {
        ...walkedUp,
        trail:
          got.success && got.data ? { ...got.data, steps: stepsFromTrail(got.data.steps) } : null,
      };
      rewrite(helper(walkedUp));
    };

    const press = (pick: string): void => {
      if (pick === 'watch:build') {
        go(pick);
        return;
      }
      if (pick === 'close') {
        dismiss();
        return;
      }
      if (pick.startsWith('helper:')) {
        const hand = watching?.yard().session?.agents.find((one) => one.id === pick.slice(7));
        if (!hand) return;
        walkedUp = { hand };
        wood(helper(walkedUp));
        void readTrail(hand.id);
        return;
      }
      if (pick.startsWith('away:')) {
        const task = inside;
        const hands = watching?.yard().session?.agents ?? [];
        const which = pick.slice(5);
        const going = hands.filter((one) =>
          which === 'finished' ? one.where !== 'out' : one.id === which
        );
        if (!task) return;
        void Promise.all(
          going
            .filter((one) => one.call)
            .map((one) =>
              client.agents.sendAway({ task: task.id, call: one.call! }, { timeoutMs: 15000 })
            )
        );
        return;
      }
      if (pick === 'away' && walkedUp) {
        walkedUp = { ...walkedUp, away: 'armed' };
        rewrite(helper(walkedUp));
        return;
      }
      if (pick === 'away!' && walkedUp) {
        const task = inside;
        const call = walkedUp.hand.call;
        if (!task || !call) return;
        walkedUp = { ...walkedUp, away: 'going' };
        rewrite(helper(walkedUp));
        void client.agents.sendAway({ task: task.id, call }, { timeoutMs: 15000 }).then((done) => {
          if (!done.success) {
            say(done.error.kind === 'refused' ? done.error.because : 'they would not go.', 6000);
            if (walkedUp) {
              walkedUp = { ...walkedUp };
              delete walkedUp.away;
              rewrite(helper(walkedUp));
            }
            return;
          }
          dismiss();
        });
        return;
      }
      if (pick === 'recall' && walkedUp) {
        walkedUp = { ...walkedUp, recall: 'armed' };
        rewrite(helper(walkedUp));
        return;
      }
      if (pick === 'recall!' && walkedUp) {
        void recall(walkedUp);
        return;
      }
      if (pick.startsWith('failure:')) {
        const task = inside;
        if (task) void failed(task.id, pick.slice(8));
        return;
      }
      if (pick.startsWith('session-name:')) {
        const task = inside;
        if (!task) return;
        void client.tasks.rename({ id: task.id, title: pick.slice(13) }).then((now) => {
          tasks = now;
          if (inside?.id === task.id) inside = now.find((each) => each.id === task.id) ?? inside;
          people();
        });
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
      if (pick === 'commit-now') {
        void commit();
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
      if (pick === 'init') {
        guideMissing = false;
        void tell('/init');
        say('asked it to look around and write one.', 4000);
        if (live && plainCheckout()) rewrite(live.rows());
        return;
      }
      if (pick === 'head') {
        void openHead();
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
      if (pick.startsWith('installdep:')) {
        const rest = pick.slice('installdep:'.length);
        const cut = rest.indexOf('\u0000');
        if (cut !== -1) void runInstall(rest.slice(cut + 1));
        return;
      }
      if (pick === 'shell2') {
        void talk('village-2');
        return;
      }
      if (pick === 'shell-end') {
        void endShell();
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
      if (pick === 'relink') {
        const aim = open;
        const project = aim && projectOn(aim.district);
        if (project) void relinkProject(project);
        return;
      }
      if (pick === 'setup-retry') {
        const aim = open;
        const session = inside;
        if (!aim || !session) return;
        void client.tasks.retrySetup({ id: session.id }, { timeoutMs: 0 }).then(() => {
          void refreshSetupFailure(aim, session);
        });
        return;
      }
      if (pick === 'link-pull-toggle') {
        void openLinkPicker();
        return;
      }
      if (pick.startsWith('link-pull:')) {
        void pickLinkPull(pick.slice('link-pull:'.length));
        return;
      }
      if (pick === 'setup-skip') {
        setupFailure = null;
        if (live && plainCheckout()) rewrite(live.rows());
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
      if (pick.startsWith('link:')) {
        window.mender.openLink(pick.slice(5));
        return;
      }
      /* Something a session made, opened in whatever this machine opens it
         with, or shown where it landed when it is a thing that was built. */
      if (pick.startsWith('openit:')) {
        window.mender.openIt(pick.slice(7));
        return;
      }
      if (pick.startsWith('showit:')) {
        window.mender.showIt(pick.slice(7));
        return;
      }
      if (pick.startsWith('putdown:')) {
        watching?.putDown(pick.slice(8));
        return;
      }
      if (pick.startsWith('pickback:')) {
        watching?.pickBack(pick.slice(9));
        return;
      }
      if (pick.startsWith('name:')) {
        const line = watching?.names.named(pick);
        if (line) said(line[0], line[1]);
        return;
      }
      if (pick === 'rail:back' || pick === 'rail:forward') {
        stepRail(pick === 'rail:back' ? -1 : 1);
        return;
      }
      if (pick.startsWith('slash:')) {
        const meant = watching?.slash.meant(pick);
        if (meant) void obey(meant);
        else yard.narrowing(...narrowing());
        return;
      }
      if (
        pick === 'card' ||
        pick === 'new' ||
        pick === 'new:ways' ||
        pick.startsWith('do:') ||
        pick.startsWith('workspace')
      ) {
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
      if (meant.does === 'terminal') {
        const aim = open;
        void (async () => {
          const now = await client.tasks.retool({ id: task.id }, { timeoutMs: 0 });
          const again = now.find((one) => one.id === task.id);
          if (again) tasks = now;
          if (aim && again) await openTask(aim, again);
        })();
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
      if (meant.does === 'updatehand') {
        void updateHand(meant.id);
        return;
      }
      if (meant.does === 'rmhand') {
        if (!meant.asked) {
          rewrite(card?.rows() ?? []);
          return;
        }
        void removeHand(meant.id);
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

    /* A folder dragged straight off the Finder, with nothing else open: the
       island itself is what caught it, so it is founded there rather than
       handed to whoever is working, which is what a drop means everywhere
       else in the village. Dropped somewhere a board is already open, or
       dropped as more than one item, it falls through to the ordinary
       carry — a folder is not a picture or a path an agent wants either. */
    const foundDropped = async (files: readonly File[]): Promise<boolean> => {
      if (watching || founding || windmill || settings || walking) return false;
      if (files.length !== 1) return false;
      const file = files[0] as File;
      // A folder carries no browser-guessed type; a picture or any other
      // ordinary file does. That is the one signal a drop hands over before
      // the main process has looked at the path at all.
      if (file.type) return false;
      const path = window.mender.pathOf(file);
      if (!path) return false;
      const moved = await found(
        client,
        async () => {
          drawn = await draw(
            world,
            client,
            pixi.renderer,
            camera,
            drawn,
            sky,
            weatherLayer,
            skyFrame,
            flagLayer
          );
          projects = await client.projects.list({});
          people();
          frame(camera, drawn.island);
        },
        { kind: 'path', path }
      );
      if (!moved) return true; // Not a checkout, or nowhere left to put it — said already.
      const district = districtFor(moved.district);
      if (district) {
        await openDistrict({ kind: 'district', district });
        const project = projects.find((one) => one.id === moved.id);
        if (project) configure(project, true);
      }
      return true;
    };

    /* A file dropped while the folder you are standing in is open: it lands
       here rather than being carried to whoever is working, or written on
       any line, because there is nowhere else on this board a real file with
       a real path would go. Copied in beside whatever is already there —
       the disk it landed on is the truth, not a listing this board is
       keeping of its own. */
    const importDropped = async (files: readonly File[]): Promise<boolean> => {
      const tree = walking;
      if (!tree || founding || windmill || settings) return false;
      const named = files.filter((file) => window.mender.pathOf(file));
      if (!named.length) return true;
      for (const file of named) {
        const source = window.mender.pathOf(file);
        const from = parseNativeAbsolute(source);
        const name = source.split('/').pop() || file.name;
        const where = tree.at() ? `${tree.at()}/${name}` : name;
        const to = onDisk(where);
        if (!from.success || !to) continue;
        const done = await client.files.fs.copy({ from: from.data, to });
        if (!done.success) {
          say(unwritten(done.error), 6000);
          continue;
        }
      }
      if (walking) wood(walking.rows());
      say(named.length === 1 ? 'brought in.' : `${named.length} brought in.`, 3000);
      return true;
    };

    /* Writing on the wood is taken by dragging across it: whatever is
       selected when the pointer comes up is on the clipboard, the way a
       terminal does it, with nothing to press after. The write line is left
       alone, since selecting there is how a word gets written over. */
    window.addEventListener('mouseup', () => {
      const picked = window.getSelection();
      const text = picked?.toString() ?? '';
      if (!text.trim()) return;
      const at = picked?.anchorNode;
      const held = at instanceof Element ? at : at?.parentElement;
      if (held?.closest('[contenteditable], input, textarea')) return;
      window.mender.keep(text);
    });
    // Without this the window navigates to the file and the village vanishes.
    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => {
      event.preventDefault();
      const files = [...(event.dataTransfer?.files ?? [])];
      void foundDropped(files).then((handled) => {
        if (handled) return;
        void importDropped(files).then((taken) => {
          if (!taken) void carry(files);
        });
      });
    });
    window.addEventListener('paste', (event) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      void carry(files);
    });

    /** Rearranging the island, while it is on. Built once the pointer is. */
    let editing: Editing | null = null;

    const hand: Pointing = {
      at: (x, y) => drawn.ground.at(x, y),
      aside: () => {
        if (yard.open) dismiss();
      },
      held: (event) => {
        if (editing?.active && event.key === 'Escape') {
          event.preventDefault();
          editing.escaped();
          return true;
        }
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
      hover: (aim) => {
        /* While a district is being carried, the place it would land on is
           lit by the carrying itself; the hover's own light would be a
           second, different answer to the same question. */
        if (editing?.holding) aim = null;
        drawn.ground.hover(aim);
        drawn.pennants.show(aim && !open ? aim.district.id : null);
      },
      picked: (aim) => {
        if (!editing?.active) void picked(aim);
      },
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
        const waits = watching?.yard().session?.failure;
        if (inside && (waits?.carryOnAt !== undefined || waits?.untilOnline)) {
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
        if (walkedUp) {
          if (walkedUp.away === 'armed') {
            walkedUp = { ...walkedUp };
            delete walkedUp.away;
            rewrite(helper(walkedUp));
            return;
          }
          if (walkedUp.recall === 'armed' || walkedUp.recall === 'refused') {
            walkedUp = { hand: walkedUp.hand };
            rewrite(helper(walkedUp));
            return;
          }
          walkedUp = null;
          home();
          return;
        }
        if (quest) {
          closeJira();
          return;
        }
        if (sending) {
          if (sending.written) {
            sending = { ...sending, written: '' };
            rewrite(sent(sending));
            return;
          }
          sending = null;
          closeJira();
          walkedUp = null;
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
        if (buildWatch) {
          closeBuild();
          home();
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
          unname();
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
        /* Standing in a yard where somebody is working, Escape calls them off
           rather than walking out on them: Claude Code's own "esc to
           interrupt". Stopped,
           the next Escape leaves as it always did. */
        if (inside && watching?.working()) {
          void hush(inside);
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
        /* Already out on the water, Escape goes back in to wherever you were
           last, however you came out of it, so it swings between the island
           and the work. */
        if (!open && !inside) {
          if (rearrangeSlab) unslabIsland();
          else if (wasIn) void visit(wasIn);
          return;
        }
        void picked(null);
      },
      /* Every rung of Escape at once, minus the one that calls somebody off:
         whatever is open closes, whoever is working keeps working, and the
         camera goes out to the island. */
      fled: () => {
        if (editing?.active) editing.stop();
        founding?.close();
        windmill?.close();
        settings?.ui.close();
        if (browsingAt) closeBrowser();
        closeBuild();
        void picked(null);
      },
      closeDone: () => {
        if (!open || !inside || !yard.showing || yard.line.written()) return false;
        if (looking || talking || hunt || browsingAt || buildWatch || amending) return false;
        if (sending?.written !== undefined) return false;
        const rail = watching?.yard().rail.filter((one) => one.ground !== 'cutting') ?? [];
        /* Every one in the project that has answered and gone quiet, in
           whichever workspace it hangs, not only the beam you are under. */
        const project = inside.project;
        const ids = tasks
          .filter((task) => task.project === project && !cutting.has(task.id))
          .filter((task) => {
            const glance = glances[task.id];
            const { posture } = stateOf(task, seen[task.id], glance, unseen.get(task.id));
            return posture === 'done' || (posture === 'resting' && !!glance?.rested);
          })
          .map((task) => task.id);
        if (!ids.length) {
          say('nothing done to close.', 2500);
          return true;
        }
        const armed = closingDone !== null && Date.now() - closingDone < 4000;
        closingDone = null;
        const left = rail.filter((one) => !ids.includes(one.id));
        const at = rail.findIndex((one) => one.here);
        const keep =
          left.find((one) => one.here) ??
          left.find((one) => rail.indexOf(one) >= at) ??
          left.at(-1);
        if (armed) {
          void closeMany(ids, keep?.id ?? '');
          return true;
        }
        void closeCost(ids).then((cost) => {
          if (!cost) {
            void closeMany(ids, keep?.id ?? '');
            return;
          }
          closingDone = Date.now();
          const stops = cost.replace(/^that /, '');
          say(`closing the done ones ${stops} ⌥⌫ again to close them anyway.`, 4000);
        });
        return true;
      },
      /** A key held with command. One table says what it means. */
      ordered: (event) => {
        /* Control and a number is the nth board along the beam, the way
           command and a number is the nth lantern along the rail. */
        if (event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)) {
          const project = open ? projectOn(open.district) : undefined;
          const board = project ? inBeamOrder(boardsFor(project))[Number(event.key) - 1] : null;
          if (!board) return false;
          if (!board.here) go(`workspace:${board.id}`);
          return true;
        }
        const hanging = open ? tasksOn(open.district).length : projects.length;
        /* Command-shift-comma reads as a comma on some keyboards rather than
           the < it is printed with, and command-comma alone is settings. */
        const shifted = { ',': '<', '.': '>' }[event.shiftKey ? event.key : ''];
        /* A shifted letter is its own chord, the way command-shift-T is not
           command-T; one nobody has bound still means the plain letter. */
        const pressed =
          shifted ??
          (event.shiftKey && /^[a-z]$/i.test(event.key) ? event.key.toUpperCase() : event.key);
        const meant = chordFor(pressed, standing(), hanging, keybindings);
        if (!meant) return false;
        /* The chord is always a fresh session, straight away. Turning the
           hook over to the other ways of starting one is the hook's second
           press, not the key's: those live on command-N and a right-click. */
        go(meant);
        return true;
      },
      /* Three things the keyboard can be doing, and never more than one at a
         time: naming a building nobody has moved into, answering the villager
         standing at a door, or saying something to whoever is in there. */
      scrolled: (key) => {
        if (buildWatch && (key === 'ArrowLeft' || key === 'ArrowRight')) {
          return buildWatch.step(key === 'ArrowLeft' ? -1 : 1);
        }
        return yard.scrolled(key);
      },
      strayed: (event) => void yard.line.catches(event),
      typed: (event) => {
        /* Tab steps along the rail from anywhere in a project the line is not
           holding the keyboard: the yard with nothing written, a board laid
           over it, the project's own yard before any session is stood in. */
        if (
          event.key === 'Tab' &&
          !event.altKey &&
          open &&
          !looking &&
          !talking &&
          !(sending?.written !== undefined) &&
          !amending &&
          !hunt &&
          !browsingAt &&
          !buildWatch
        ) {
          stepRail(event.shiftKey ? -1 : 1);
          return true;
        }
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
        if (saying.asked()) return yard.answerKey(event);
        /* A slash or an @ with its list open is the one list the line's own
           keys walk: the arrows go up and down it and return presses the line
           picked out, since the line hands return over rather than sending. */
        if (yard.narrowed()) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            const chose = yard.walk.on;
            if (!chose) return false;
            if (event.key === 'Enter' && event.shiftKey && chose.startsWith('slash:')) {
              const meant = watching?.slash.asDefault(chose);
              if (meant) {
                void obey(meant);
                return true;
              }
            }
            press(chose);
            return true;
          }
        }
        /* Everything else is writing, and the line takes that itself: the
           arrows move the caret through what is written, never a highlight
           over the yard's pressable lines. */
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
    holdStill(pixi, camera, () => yard.showing);
    watchGrip(pixi.canvas);

    editing = new Editing(
      pixi,
      camera,
      await client.village.places({}),
      {
        residents: () => projects.filter((project) => !isAway(project)),
        scene: () => drawn.root,
        moves: (id) => client.projects.moves({ id }),
        move: async (id, to) => {
          const done = await client.projects.move({ id, to });
          if (!done.success) return done.error;
          const was = drawn.island;
          drawn = await draw(
            world,
            client,
            pixi.renderer,
            camera,
            drawn,
            sky,
            weatherLayer,
            skyFrame,
            flagLayer
          );
          projects = await client.projects.list({});
          people();
          /* A swap leaves the coast where it was; a lone project carrying the
             camp off to the far side of the map takes the whole island with
             it, and the view goes after it rather than leaving empty sea. */
          const now = drawn.island;
          const same =
            was.x === now.x &&
            was.y === now.y &&
            was.width === now.width &&
            was.height === now.height;
          if (!same) flyOut(camera, now);
          return null;
        },
        forget: async (id) => {
          await forget(id);
        },
        putAway: async (id) => {
          await putAway(id);
        },
        sessions: (id) => tasks.filter((task) => task.project === id).length,
        covered: (x, y) => yard.covers(x / pageZoom(), y / pageZoom()),
        reach: (map) => holdToMap(camera, map),
        flags: () => drawn.pennants,
        plant: async (district, foot) => {
          plantFlag(district, foot, drawn.moored);
          drawn = await draw(
            world,
            client,
            pixi.renderer,
            camera,
            drawn,
            sky,
            weatherLayer,
            skyFrame,
            flagLayer
          );
          people();
        },
      },
      layer.root
    );
    if (import.meta.env.DEV) {
      Object.assign((window as unknown as Record<string, object>).__village ?? {}, { editing });
    }

    /* Out on the island with nothing open, a right-click is the one way into
       rearranging it. Anywhere a board is up, the right-click is the board's. */
    let rearrangeSlab: HTMLElement | null = null;
    const unslabIsland = (): void => {
      rearrangeSlab?.remove();
      rearrangeSlab = null;
    };
    /* The same panel, off the rack's sky slot: hung just under the rack. */
    openTheSky = (): void => {
      if (rearrangeSlab?.classList.contains('sky-panel')) {
        unslabIsland();
        return;
      }
      unslabIsland();
      const opened = skySlab(sky);
      layer.root.appendChild(opened);
      opened.style.top = '62px';
      opened.style.left = `${window.innerWidth - opened.offsetWidth - 12}px`;
      rearrangeSlab = opened;
      keepOnScreen(opened);
    };
    /* A board on the rack, right-clicked: it can come off the island and
       stay on the rack, or go back on. */
    rackMenu = (id, x, y): void => {
      unslabIsland();
      const project = projects.find((one) => one.id === id);
      if (!project || editing?.active) return;
      const away = isAway(project);
      rearrangeSlab = rackMenuPane({
        name: project.name,
        away,
        x,
        y,
        parent: document.body,
        does: () => {
          unslabIsland();
          void (away ? putBack(id) : putAway(id));
        },
      });
    };
    window.addEventListener('contextmenu', (event) => {
      unslabIsland();
      if (open || yard.showing || yard.open || founding || windmill || settings) return;
      if (editing?.active) return;
      event.preventDefault();
      /* On land, a right-click brings that district into focus: the camera
         flies to frame it, nothing opens. The water keeps the menu. */
      const point = camera.toWorld(event.clientX * pageZoom(), event.clientY * pageZoom());
      const aim = drawn.ground.at(point.x, point.y);
      if (aim && aim.district.id !== CAMP) {
        flyToDistrict(camera, districtBounds(aim.district));
        return;
      }
      rearrangeSlab = waterMenu({
        sky,
        x: event.clientX,
        y: event.clientY,
        parent: layer.root,
        edit: () => {
          unslabIsland();
          drawn.ground.hover(null);
          drawn.pennants.show(null);
          editing?.start();
        },
        opened: (panel) => {
          rearrangeSlab = panel;
        },
      });
    });
    window.addEventListener(
      'pointerdown',
      (event) => {
        if (rearrangeSlab && !rearrangeSlab.contains(event.target as Node)) unslabIsland();
      },
      true
    );

    /* A clicked notification names a session the same way pressing it on the
       rail or in the finder does: one path in, `go` decides the rest. */
    window.mender?.attend?.((task) => go(`task:${task}`));
    window.mender?.quitCost?.((n) =>
      showQuitCost(
        n,
        tasks
          .filter((task) => seen[task.id] === 'working')
          .map((task) => {
            const said = stateOf(task, 'working', glances[task.id], undefined).saying;
            const cut = said.lastIndexOf(' · ');
            return {
              name: task.title,
              doing: cut < 0 ? said : said.slice(0, cut),
              ...(cut < 0 ? {} : { for: said.slice(cut + 3) }),
            };
          })
      )
    );

    /* A session caught eating the five hours is put to him over everything,
       wherever he is standing: one at a time, each only once. */
    const askedHungry = new Set<string>();
    let hungryBoard: HungryBoard | null = null;
    let hungryNow: Record<string, Hungry> = {};
    const nextHungry = (): void => {
      if (hungryBoard) {
        if (hungryNow[hungryBoard.task]) return;
        hungryBoard.close();
        hungryBoard = null;
      }
      const waiting = Object.values(hungryNow)
        .filter((one) => !askedHungry.has(`${one.task}:${one.at}`))
        .sort((a, b) => a.at - b.at)[0];
      if (!waiting) return;
      askedHungry.add(`${waiting.task}:${waiting.at}`);
      hungryBoard = openHungry(waiting, {
        answer: (choice) => {
          hungryBoard = null;
          void client.agents.answerHungry({ task: waiting.task, choice }, { timeoutMs: 0 });
          window.setTimeout(nextHungry, 0);
        },
        look: () => {
          hungryBoard = null;
          askedHungry.delete(`${waiting.task}:${waiting.at}`);
          go(`task:${waiting.task}`);
        },
      });
    };
    const hungering = new ReplicaState<Record<string, Hungry>>(
      client.agents.island.state(undefined, 'hungry'),
      {
        onChange: (value) => {
          hungryNow = value ?? {};
          nextHungry();
        },
      }
    );
    void hungering.ready.then(() => {
      hungryNow = hungering.current() ?? {};
      nextHungry();
    });
    /* The native menu can only ask for things the page can do; "settings" is
       the one item it carries, so it lands on the same doing the chord does. */
    window.mender?.menu?.((command) => {
      if (command === 'settings') go('do:windmill');
    });
    window.mender?.missed?.((lines) => showMissed(lines));

    /* Who is standing outside which building, kept true by the main process
       rather than by whatever board happens to be open: a villager is still
       working while you are looking at another district. */
    /* What a house says from the water is what its lantern says on the rail. */
    const lookOf = (task: string, mood: Mood): Look => {
      switch (mood) {
        case 'working':
          return 'working';
        case 'arriving':
          return 'arriving';
        case 'asking':
          return 'wants';
        case 'hurt':
          return 'broken';
        case 'resting':
          if (glances[task]?.waiting) return 'waiting';
          return unseen.has(task) ? 'done' : 'idle';
        default:
          return 'empty';
      }
    };
    lightHouses = (): void => {
      const standing: Standing[] = [];
      const walking: Walking[] = [];
      for (const task of tasks) {
        const mood = seen[task.id];
        if (!mood || mood === 'empty') continue;
        const where = projects.find((project) => project.id === task.project)?.district;
        const district = where ? drawn.districts.get(where) : undefined;
        const building =
          district && task.slot !== null && drawn.ground.buildingAt(district, task.slot);
        if (building) standing.push({ id: task.id, building, look: lookOf(task.id, mood) });
        const look = lookOf(task.id, mood);
        walking.push({
          id: task.id,
          look,
          building: building || null,
          district: district ?? null,
          helper: false,
        });
        const out = glances[task.id]?.helpers ?? 0;
        for (let i = 0; i < out; i++) {
          walking.push({
            id: `${task.id}#${i}`,
            look: 'working',
            building: building || null,
            district: district ?? null,
            helper: true,
          });
        }
      }
      drawn.folk.set(standing);
      drawn.walkers.set(walking);
      const lit: Lit[] = standing.map((one) => ({ building: one.building, look: one.look }));
      drawn.atmosphere.setHouses(lit, new Set(projects.map((project) => project.district)));
    };
    /* What the open yard was last handed by people(), and which yard that was. */
    let handed = '';
    let handedTo: Watching | null = null;
    const people = (): void => {
      lightHouses();
      sendRunners();
      paintRail();
      /* The yard you are standing in was handed who was awake when it opened,
         and moods move after that: a session that has just been cut is still
         arriving when its board comes up, and its lantern stayed dark for the
         whole life of the session because nothing ever told the rail. */
      const inside = open ? projectOn(open.district) : undefined;
      if (watching && inside) {
        /* Only when something this yard draws has actually moved. Every tool
           call in every session anywhere lands here, and handing each one on
           redrew the whole board, so eight busy workspaces were the board
           being torn down and built again many times a second. The minute is
           in it because the rail counts in minutes. */
        const workspaces = boardsFor(inside);
        const here = tasksFor(inside.id);
        const handing = JSON.stringify([
          inside,
          workspaces,
          here,
          here.map((task) => [seen[task.id], glances[task.id], unseen.get(task.id)]),
          Math.floor(Date.now() / 60_000),
        ]);
        if (watching !== handedTo || handing !== handed) {
          handedTo = watching;
          handed = handing;
          watching.moved({
            project: inside,
            workspaces,
            tasks: here,
            moods: seen,
            glances,
            unread: new Map(unseen),
          });
        }
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

    const cutOnes = new ReplicaState<Workspace[]>(
      client.tasks.workspaces.state(undefined, 'list'),
      {
        onChange: (value) => {
          workspaces = value;
          redrawBoards();
        },
      }
    );
    await cutOnes.ready;
    workspaces = cutOnes.current() ?? [];

    const moods = new ReplicaState<Record<string, Mood>>(
      client.agents.island.state(undefined, 'moods'),
      {
        onChange: (value) => {
          /* A turn that settles anywhere but the session you are standing in
             is something finished you have not seen. Going back to work, or
             going home, takes the mark off again. */
          for (const [task, was] of Object.entries(seen)) {
            const now = value[task];
            const settled = (was === 'working' || was === 'asking') && now === 'resting';
            if (settled && inside?.id !== task) unseen.set(task, Date.now());
            else if (now !== 'resting') unseen.delete(task);
          }
          for (const task of unseen.keys()) if (!(task in value)) unseen.delete(task);
          const moved = JSON.stringify(seen) !== JSON.stringify(value);
          seen = value;
          people();
          // Frozen behind another window, a house whose light changed is repainted.
          if (moved) nudge();
        },
      }
    );
    await moods.ready;
    seen = moods.current() ?? {};
    const glancing = new ReplicaState<Record<string, Glance>>(
      client.agents.island.state(undefined, 'glances'),
      {
        onChange: (value) => {
          glances = value;
          people();
        },
      }
    );
    await glancing.ready;
    glances = glancing.current() ?? {};
    people();
    /* How long somebody has been at it, and how long ago something finished,
       are counted in minutes, so the rail is read again once a minute while
       either is on it. */
    window.setInterval(() => {
      const counting = Object.values(seen).some((mood) => mood === 'working');
      const waits = Object.values(glances).some((glance) => glance.waiting);
      if (counting || waits || unseen.size) people();
    }, 60_000);

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

/** A worktree's own setup step that never came back clean, said plainly on
    the checkout board, with the two ways out: run it again, or say it's
    fine as it is and stop being asked. */
function setupFailureLines(failure: { script: string; message: string } | null): Row[] {
  if (!failure) return [];
  return [
    { kind: 'gap' },
    { kind: 'line', text: `its ${failure.script} step failed: ${failure.message}`, tone: 'sore' },
    { kind: 'line', text: 're-run it', pick: 'setup-retry' },
    { kind: 'line', text: "it's fine as it is", tone: 'faded', pick: 'setup-skip' },
  ];
}

function sameAim(a: Aim, b: Aim): boolean {
  return a.district === b.district;
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
  /** The island as one picture, which a district is lifted out of. */
  root: Container;
  ground: Ground;
  water: Water;
  folk: Folk;
  /** The sky, the light, the smoke and the small life. */
  atmosphere: Atmosphere;
  /** Everybody walking about. */
  walkers: Walkers;
  /** Everybody else: townsfolk, animals, runners, carts and boats. */
  crowd: Crowd;
  /** A flag on every district somebody lives in, and its name on hover. */
  pennants: Pennants;
  /** The districts by plot, which is how a project finds its own land. */
  districts: Map<string, District>;
  island: Extent;
  /** How far the islet sailed, which its flag sails with. */
  moored: readonly [number, number];
}

/** Compose the island for the state the app is in, and put it on screen. */
async function draw(
  world: Container,
  client: MenderClient,
  renderer: Renderer,
  camera: Viewport,
  was: Drawn | null,
  sky: Sky,
  weatherLayer: Container,
  skyFrame: Container,
  flagLayer: Container
): Promise<Drawn> {
  say('drawing the island…');
  const map = await client.village.map({});
  /* A post only for a district that is standing: one on open water would be
     a flagpole in the sea. */
  const standing = new Set<string>(map.districts.map((district) => district.id));
  const feet = new Map([...(await loadFeet(map.moored))].filter(([id]) => standing.has(id)));
  const items = new Document(map.layout).items();
  const scene = buildScene(items, map.layout, [...feet.values()]);
  if (scene.missing.length) {
    console.warn(`${scene.missing.length} sprites are not in the kit`, scene.missing.slice(0, 8));
  }
  const island = extentOf(map.layout);
  /* Before the light goes on the land, so the mask is the ground alone. */
  const water = new Water(renderer, scene.root, scene.groundTop, island);
  const ground = new Ground(map.districts, map.layout, scene.buildings);
  scene.root.addChildAt(ground.overlay, scene.groundTop);

  was?.atmosphere.destroy();
  for (const old of world.removeChildren()) old.destroy({ children: true });
  for (const old of flagLayer.removeChildren()) old.destroy({ children: true });
  was?.pennants.destroy();
  const fire = campfireOf(map.layout);
  const atmosphere = new Atmosphere(
    {
      renderer,
      world,
      frame: skyFrame,
      camera,
      flags: flagLayer,
      weatherLayer,
      layout: map.layout,
      items,
      districts: map.districts,
      buildings: scene.buildings,
      fire,
      laneAt: scene.laneAt,
      land: groundCells(map.layout),
      extent: island,
      extentPx: {
        x: island.x - 256,
        y: island.y - 256,
        width: island.width + 512,
        height: island.height + 512,
      },
    },
    sky
  );
  const paths = new Paths(map.layout, scene.buildings);
  const walkers = new Walkers(paths, scene.laneAt, fire);
  was?.crowd.destroy();
  const crowd = new Crowd(
    paths,
    scene.laneAt,
    map.layout,
    map.districts,
    scene.buildings,
    (x, y) => water.wet(x, y),
    island
  );
  atmosphere.follow(
    () => walkers.positions(),
    () => crowd.lit()
  );
  world.addChild(water.mesh, crowd.fleet.wakes, scene.root, atmosphere.air);
  // The island may have grown or shrunk: the camera's limits follow it.
  holdToIsland(camera, island);
  say(null);
  return {
    root: scene.root,
    ground,
    water,
    atmosphere,
    walkers,
    crowd,
    folk: new Folk(ground.windows),
    pennants: new Pennants(
      feet,
      scene.posts.map(() => flagLayer),
      camera
    ),
    districts: new Map(map.districts.map((district) => [district.id, district])),
    island,
    moored: map.moored,
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
  /** Shift-Escape: straight out to the island, leaving everyone working. */
  fled(): void;
  /** An arrow or a page key nothing nearer wanted. */
  scrolled(key: string): boolean;
  /** A key held with command. True if it meant something. */
  ordered(event: KeyboardEvent): boolean;
  /** Option-delete with nothing written: close every session that is done. */
  closeDone(): boolean;
  /** A key that is not escape and not a chord. True if the board took it. */
  typed(event: KeyboardEvent): boolean;
  /** A letter nothing took, which is writing that lost its way to the line. */
  strayed(event: KeyboardEvent): void;
}

/** Somewhere you have been, small enough to write down and come back to. */
type Spot =
  | { kind: 'island' }
  | { kind: 'project'; id: string }
  /** The project rides along so a session taken down since still leaves
      somewhere to go back to: its district. */
  | { kind: 'task'; id: string; card: boolean; project?: string };

function same(a: Spot | undefined, b: Spot): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'island') return true;
  if (a.kind === 'project') return a.id === (b as { id: string }).id;
  const other = b as { id: string; card: boolean };
  return a.id === other.id && a.card === other.card;
}

/** Where the app was when it was last closed, if it wrote it down. */
function lastly(key = 'mender.where'): Spot | null {
  try {
    const kept = localStorage.getItem(key);
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
    /* Only the main button picks. A right-click has its own meaning on the
       island, and letting its release count as a press walked straight into
       the district it was meant to bring into focus. */
    if (event.button !== 0) {
      pressedAt = null;
      return;
    }
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
  /* Except Shift-Escape, which is taken before anything else in the window
     sees it, on the way down rather than on the way back up. The write line,
     a slash list or a terminal would otherwise read the Escape first and stop
     whoever is working, which is exactly what this key promises not to do. */
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !event.shiftKey || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pointing.fled();
    },
    true
  );
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
    if (event.altKey) {
      if (event.key === 'Backspace' && pointing.closeDone()) event.preventDefault();
      return;
    }
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
