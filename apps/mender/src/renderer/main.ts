import { ReplicaState } from '@emdash/wire/live';
import { CAMP, Document, extentOf, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { Mood } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { makeBoard, type Board, type Row } from './board/board';
import { openCard, type LiveCard } from './board/card';
import { openCheckout, type LiveBoard } from './board/district';
import { loadLettering } from './board/lettering';
import { makeRail, type Rail, type Tag } from './board/rail';
import { answerFor, openWork, type LiveWork } from './board/work';
import { createCamera, flyOut, flyTo, frame, type Extent } from './village/camera';
import { Folk, loadFolk, type Standing } from './village/folk';
import { districtBounds, Ground, type Aim } from './village/ground';
import { loadKit } from './village/kit';
import { say } from './village/notice';
import { buildScene } from './village/scene';
import { wire, type MenderClient } from './wire';

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
  });
  pixi.renderer.canvas.style.imageRendering = 'pixelated';
  document.body.appendChild(pixi.canvas);

  const camera = createCamera(pixi);
  const world = new Container();
  camera.addChild(world);

  try {
    say('waking the village…');
    const [client] = await Promise.all([wire(), loadKit(), loadFolk(), loadLettering()]);
    const board = await makeBoard(pixi);
    const rail = await makeRail(pixi);
    let drawn = await draw(world, client);
    let projects = await client.projects.list({});
    let tasks: Task[] = [];
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
    /** Set while the board in front of you is a task's, which can be talked to. */
    let work: LiveWork | null = null;
    /** The task that board belongs to. */
    let inside: Task | null = null;
    /** Set while the board is showing what that session works with. */
    let card: LiveCard | null = null;
    /** Set while a name for something new is being written on the wood. */
    let naming: {
      district: District;
      project: Project;
      slot: number | null;
      written: string;
    } | null = null;
    /** Set while an existing session is being called something else. */
    let titling: { task: Task; written: string } | null = null;
    /** What everybody is doing, as the main process sees it. */
    let seen: Record<string, Mood> = {};

    const projectOn = (district: District): Project | undefined =>
      projects.find((candidate) => candidate.plot === district.id);
    const tasksOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasks.filter((task) => task.project === project.id) : [];
    };
    /** The task standing in one of a district's buildings, if any is. */
    const taskIn = (district: District, slot: number): Task | undefined =>
      tasksOn(district).find((task) => task.slot === slot);
    /** The first building on a district nobody is in, if there is one. */
    const freeSlot = (district: District): number | null => {
      const taken = new Set(tasksOn(district).map((task) => task.slot));
      for (let slot = 0; slot < drawn.ground.room(district); slot += 1) {
        if (!taken.has(slot)) return slot;
      }
      return null;
    };

    /* The rail carries a peg for every project and, after them, the sessions
       of whichever district you are standing in. It is the only place in the
       app that shows you work you are not looking at. */
    const paintRail = (): void => {
      const here = open ? projectOn(open.district) : undefined;
      const tags: Tag[] = projects.map((project) => ({
        id: `project:${project.id}`,
        text: project.name,
        here: project.id === here?.id,
      }));
      if (here) {
        tags.push({ id: 'seam', text: '│', tone: 'faded' });
        for (const task of tasks.filter((task) => task.project === here.id)) {
          tags.push({
            id: `task:${task.id}`,
            text: task.title,
            mark: markOf(seen[task.id]),
            tone: toneOf(seen[task.id]),
            here: inside?.id === task.id,
          });
        }
        tags.push({ id: 'new', text: '+' });
        if (inside) {
          tags.push({ id: 'seam2', text: '│', tone: 'faded' });
          tags.push({
            id: 'card',
            text: inside.agent ?? 'claude',
            here: Boolean(card),
          });
        }
      }
      rail.show(tags);
    };

    rail.onPick((id) => {
      if (id === 'card') {
        const task = inside;
        const aim = open;
        if (!task || !aim) return;
        if (card) void openTask(aim, task);
        else void showCard(aim, task);
        return;
      }
      if (id === 'new') {
        const district = open?.district;
        if (district) askName({ kind: 'district', district }, freeSlot(district));
        return;
      }
      if (id.startsWith('project:')) {
        const project = projects.find((candidate) => candidate.id === id.slice(8));
        const district = project && drawn.districts.get(project.plot ?? '');
        // A peg always takes you to that project, never away from it: pressing
        // the one you are standing on is how you get back out of a session.
        if (district) void openDistrict({ kind: 'district', district });
        return;
      }
      if (!id.startsWith('task:')) return;
      const task = tasks.find((candidate) => candidate.id === id.slice(5));
      if (!task) return;
      // Pressing the one you are already inside is how you call it something
      // else, because there is nothing else to press.
      if (inside?.id === task.id) {
        askTitle(task);
        return;
      }
      const district = drawn.districts.get(
        projects.find((project) => project.id === task.project)?.plot ?? ''
      );
      if (district) {
        void openTask(
          task.slot === null
            ? { kind: 'district', district }
            : { kind: 'building', district, slot: task.slot },
          task
        );
      }
    });

    const shut = async (): Promise<void> => {
      open = null;
      naming = null;
      titling = null;
      inside = null;
      work = null;
      const shown = card;
      card = null;
      await shown?.close();
      board.hide();
      paintRail();
      const was = live;
      live = null;
      await was?.close();
    };

    /** Put a checkout on the board and keep it there until something else is. */
    const stand = async (aim: Aim, name: string, path: string, lines: Row[]): Promise<void> => {
      const was = live;
      live = null;
      work = null;
      inside = null;
      await was?.close();

      open = aim;
      naming = null;
      titling = null;
      paintRail();
      board.show([
        { kind: 'title', text: name },
        { kind: 'line', text: path, tone: 'faded', keep: 'tail' },
        { kind: 'gap' },
        { kind: 'line', text: 'reading the checkout…', tone: 'faded' },
      ]);

      const opened = await openCheckout(client, { name, path, lines }, (rows) => {
        if (open === aim) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      live = opened;
      board.update(opened.rows());
    };

    /* Opening a district is one move with two halves: the camera pulls in on
       its land, aiming at the part of the window the board is about to leave,
       and the board comes in from the right with what is true of that checkout
       written on it. Neither waits for the other. */
    const openDistrict = async (aim: Aim): Promise<void> => {
      const project = projectOn(aim.district);
      if (!project) return;
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      const standing = tasksOn(aim.district);
      const spare = drawn.ground.room(aim.district) - standing.length;
      const lines: Row[] = [
        { kind: 'gap' },
        { kind: 'heading', text: 'work' },
        ...(standing.length
          ? standing.map((task): Row => ({ kind: 'entry', mark: '·', text: task.title }))
          : [
              { kind: 'line' as const, text: 'nothing standing here yet.', tone: 'faded' as const },
            ]),
        {
          kind: 'line',
          text:
            spare > 0
              ? 'the + on the rail starts another one.'
              : 'every building on this district is taken, but the + still works.',
          tone: 'faded',
        },
      ];
      await stand(aim, project.name, project.path, lines);
    };

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
      work = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      inside = task;
      const opened = await openCard(client, task, (rows) => {
        if (open === aim && card) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      card = opened;
      paintRail();
      board.show(opened.rows());
    };

    /**
     * A building with a task in it is that task's own checkout, and whoever is
     * working in it. The board opens at the bottom, because the bottom is now.
     */
    const openTask = async (aim: Aim, task: Task): Promise<void> => {
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      const was = live;
      live = null;
      work = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      naming = null;
      titling = null;
      inside = task;
      paintRail();
      board.show(
        [
          { kind: 'title', text: task.title },
          { kind: 'line', text: task.path, tone: 'faded', keep: 'tail' },
          { kind: 'gap' },
          { kind: 'line', text: 'looking in…', tone: 'faded' },
        ],
        'now'
      );

      const opened = await openWork(client, task, (rows) => {
        if (open === aim) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      live = opened;
      work = opened;
      board.show(opened.rows(), 'now');
    };

    /** A new session is a question: what is going to happen in there. */
    const askName = (aim: Aim, slot: number | null): void => {
      const project = projectOn(aim.district);
      if (!project) return;
      open = aim;
      inside = null;
      work = null;
      titling = null;
      naming = { district: aim.district, project, slot, written: '' };
      paintRail();
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      board.show(asking(naming));
    };

    /** Calling a session something else. His name for it outranks the agent's. */
    const askTitle = (task: Task): void => {
      naming = null;
      titling = { task, written: task.title };
      board.show(retitling(titling));
    };

    const wrote = (written: string): void => {
      if (titling) {
        titling = { ...titling, written };
        board.update(retitling(titling));
        return;
      }
      if (!naming) return;
      naming = { ...naming, written };
      board.update(asking(naming));
    };

    const begin = async (): Promise<void> => {
      if (!naming) return;
      const { project, slot, written } = naming;
      const aim = open;
      naming = null;
      board.update([
        { kind: 'title', text: written },
        { kind: 'gap' },
        { kind: 'line', text: 'cutting a worktree…', tone: 'faded' },
      ]);
      // No deadline: a worktree on a big repository is minutes of copying, plus
      // whatever that project runs to make a checkout usable.
      const made = await client.tasks.begin(
        { project: project.id, name: written, slot },
        { timeoutMs: 0 }
      );
      if (!made.success) {
        say(whyNot(made.error), 6000);
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      // The first thing written in a new session is the first thing said in
      // it. There is no separate step where you name it and then start it.
      void client.agents.tell({ task: made.data.id, text: written }, { timeoutMs: 0 });
      if (aim) await openTask(aim, made.data);
    };

    /** Writing a new name on a session that already has one. */
    const retitle = async (): Promise<void> => {
      const asked = titling;
      if (!asked) return;
      titling = null;
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
        return;
      }
      // The camp is where the island grows from: its fire is the only thing on
      // an empty island, and founding a project is what it is for.
      if (aim.district.id === CAMP) {
        await found(client, async () => {
          await shut();
          drawn = await draw(world, client);
          projects = await client.projects.list({});
          people();
          frame(camera, drawn.island);
        });
        return;
      }
      if (open && sameAim(aim, open)) {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      if (aim.kind === 'building') {
        const task = taskIn(aim.district, aim.slot);
        if (task) await openTask(aim, task);
        else askName(aim, aim.slot);
        return;
      }
      await openDistrict(aim);
    };

    /**
     * Whatever is written on a task's board is said to whoever is in there —
     * and nothing written, while they are working, calls them off.
     */
    const tell = async (): Promise<void> => {
      const task = inside;
      const saying = work;
      if (!task || !saying) return;
      const text = saying.written().trim();
      if (!text) {
        if (saying.working()) await client.agents.hush({ task: task.id });
        return;
      }
      saying.wrote('');
      const heard = await client.agents.tell({ task: task.id, text }, { timeoutMs: 0 });
      if (!heard.success) {
        say(heard.error.kind === 'refused' ? heard.error.because : 'nobody heard that.', 6000);
      }
    };

    const answer = async (key: string): Promise<void> => {
      const task = inside;
      const asked = work?.asked();
      if (!task || !asked) return;
      const optionId = answerFor(asked, key);
      if (!optionId) return;
      const given = await client.agents.answer({
        task: task.id,
        requestId: asked.requestId,
        optionId,
      });
      if (!given.success && given.error.kind === 'refused') say(given.error.because, 6000);
    };

    board.onPick((pick) => {
      const task = inside;
      const meant = card?.meant(pick);
      if (!task || !meant) return;
      void (async () => {
        const done =
          meant.does === 'choose'
            ? await client.agents.choose(
                { task: task.id, what: meant.what, id: meant.id },
                { timeoutMs: 0 }
              )
            : await client.agents.tool({ task: task.id, name: meant.name, on: meant.on });
        if (!done.success && done.error.kind === 'refused') say(done.error.because, 6000);
      })();
    });

    watchPointer(pixi, camera, board, rail, {
      at: (x, y) => drawn.ground.at(x, y),
      hover: (aim) => drawn.ground.hover(aim),
      picked: (aim) => void picked(aim),
      escaped: () => void picked(null),
      /* Three things the keyboard can be doing, and never more than one at a
         time: naming a building nobody has moved into, answering the villager
         standing at a door, or saying something to whoever is in there. */
      typed: (event) => {
        if (titling) {
          if (event.key === 'Enter') void retitle();
          else if (event.key === 'Backspace') wrote(titling.written.slice(0, -1));
          else if (event.key.length === 1) wrote(titling.written + event.key);
          else return false;
          return true;
        }
        if (naming) {
          if (event.key === 'Enter') void begin();
          else if (event.key === 'Backspace') wrote(naming.written.slice(0, -1));
          else if (event.key.length === 1) wrote(naming.written + event.key);
          else return false;
          return true;
        }
        const saying = work;
        if (!saying) return false;
        if (saying.asked()) {
          if (!/^[1-9]$/.test(event.key)) return false;
          void answer(event.key);
          return true;
        }
        if (event.key === 'Enter') void tell();
        else if (event.key === 'Backspace') saying.wrote(saying.written().slice(0, -1));
        else if (event.key.length === 1) saying.wrote(saying.written() + event.key);
        else return false;
        return true;
      },
    });

    /* Who is standing outside which building, kept true by the main process
       rather than by whatever board happens to be open: a villager is still
       working while you are looking at another district. */
    const people = (): void => {
      const standing: Standing[] = [];
      for (const task of tasks) {
        const mood = seen[task.id];
        if (!mood || mood === 'empty') continue;
        const plot = projects.find((project) => project.id === task.project)?.plot;
        const district = plot ? drawn.districts.get(plot) : undefined;
        const building =
          district && task.slot !== null && drawn.ground.buildingAt(district, task.slot);
        if (building) standing.push({ id: task.id, building, mood });
      }
      drawn.folk.set(standing);
      paintRail();
    };
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
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function sameAim(a: Aim, b: Aim): boolean {
  if (a.district !== b.district || a.kind !== b.kind) return false;
  return a.kind !== 'building' || a.slot === (b as { slot: number }).slot;
}

/** An empty board with a cursor on it, which is all a new session is. */
function asking(naming: { district: District; written: string }): Row[] {
  return [
    { kind: 'title', text: 'a new session' },
    { kind: 'line', text: `on the ${naming.district.name.toLowerCase()}`, tone: 'faded' },
    { kind: 'gap' },
    {
      kind: 'prose',
      text: 'say what you want doing. it gets its own branch, and it will name itself.',
      tone: 'faded',
    },
    { kind: 'gap' },
    { kind: 'typed', text: naming.written },
  ];
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
    { kind: 'line', text: 'return to keep it, escape to leave it alone.', tone: 'faded' },
  ];
}

/** The mark a session wears on the rail, which is what it is doing. */
function markOf(mood: Mood | undefined): string | undefined {
  if (mood === 'working') return '…';
  if (mood === 'asking') return '?';
  if (mood === 'hurt') return '×';
  if (mood === 'arriving') return '·';
  if (mood === 'resting') return '·';
  return undefined;
}

function toneOf(mood: Mood | undefined): 'keen' | 'sore' | undefined {
  if (mood === 'asking') return 'keen';
  if (mood === 'hurt') return 'sore';
  return undefined;
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

async function found(client: MenderClient, grown: () => Promise<void>): Promise<void> {
  // No deadline on this one. The call is open for exactly as long as someone is
  // looking through their folders for the right checkout, and wire's default
  // half minute is a perfectly reasonable amount of time to spend doing that.
  const result = await client.projects.found({}, { timeoutMs: 0 });
  if (result.success) {
    await grown();
    say(`${result.data.name} has moved in.`, 4000);
    return;
  }
  const error = result.error;
  if (error.kind === 'cancelled') return;
  say(
    error.kind === 'not-a-repository'
      ? 'That folder is not a checkout, so nothing can be built on it.'
      : error.kind === 'already-founded'
        ? 'There is already a district on that checkout.'
        : 'Every plot on the island is taken.',
    5000
  );
}

interface Pointing {
  at(worldX: number, worldY: number): Aim | null;
  hover(aim: Aim | null): void;
  picked(aim: Aim | null): void;
  escaped(): void;
  /** A key that is not escape. True if the board took it. */
  typed(event: KeyboardEvent): boolean;
}

/**
 * Pointing, going, and writing.
 *
 * A district lights when the pointer is over it and something happens when you
 * pick it; the open sea takes you back out, and so does escape. The camera is
 * dragged with the same button, so a press that moved is a pan and not a pick —
 * without that, every drag that ends over land takes you somewhere.
 *
 * There is no text field anywhere in this app, so while the board is asking for
 * a name the keyboard simply belongs to the board.
 */
function watchPointer(
  pixi: Application,
  camera: ReturnType<typeof createCamera>,
  board: Board,
  rail: Rail,
  pointing: Pointing
): void {
  pixi.stage.eventMode = 'static';
  pixi.stage.hitArea = pixi.screen;

  let pressedAt: { x: number; y: number } | null = null;

  const under = (event: FederatedPointerEvent): Aim | null => {
    const point = camera.toWorld(event.global);
    return pointing.at(point.x, point.y);
  };
  // Land the board is standing in front of, or the rail is nailed over, is not
  // land you can point at.
  const behind = (event: FederatedPointerEvent): boolean =>
    board.over(event.global.x) || rail.over(event.global.y);

  pixi.stage.on('pointermove', (event: FederatedPointerEvent) => {
    const aim = behind(event) ? null : under(event);
    pointing.hover(aim);
    pixi.canvas.style.cursor = aim ? 'pointer' : 'default';
  });

  pixi.stage.on('pointerdown', (event: FederatedPointerEvent) => {
    pressedAt = behind(event) ? null : { x: event.global.x, y: event.global.y };
  });

  pixi.stage.on('pointerup', (event: FederatedPointerEvent) => {
    const from = pressedAt;
    pressedAt = null;
    if (!from || behind(event)) return;
    if (Math.hypot(event.global.x - from.x, event.global.y - from.y) > 4) return;
    pointing.picked(under(event));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      pointing.escaped();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (pointing.typed(event)) event.preventDefault();
  });
}

void boot();
