import { ReplicaState } from '@emdash/wire/live';
import { CAMP, Document, extentOf, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { Mood } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { makeBoard, type Board, type Row } from './board/board';
import { openCheckout, type LiveBoard } from './board/district';
import { loadLettering } from './board/lettering';
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
    let drawn = await draw(world, client);
    let projects = await client.projects.list({});
    let tasks = await client.tasks.list({});
    frame(camera, drawn.island);
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
    /** Set while a name is being written on the wood. */
    let naming: {
      district: District;
      project: Project;
      slot: number;
      written: string;
    } | null = null;

    const projectOn = (district: District): Project | undefined =>
      projects.find((candidate) => candidate.plot === district.id);
    const tasksOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasks.filter((task) => task.project === project.id) : [];
    };
    /** The task standing in one of a district's buildings, if any is. */
    const taskIn = (district: District, slot: number): Task | undefined =>
      tasksOn(district).find((task) => task.slot === slot);

    const shut = async (): Promise<void> => {
      open = null;
      naming = null;
      inside = null;
      work = null;
      board.hide();
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
          ? standing.map((task): Row => ({ kind: 'entry', mark: '·', text: task.name }))
          : [
              { kind: 'line' as const, text: 'nothing standing here yet.', tone: 'faded' as const },
            ]),
        {
          kind: 'line',
          text:
            spare > 0
              ? 'click an empty building to start something.'
              : 'every building on this district is taken.',
          tone: 'faded',
        },
      ];
      await stand(aim, project.name, project.path, lines);
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

      open = aim;
      naming = null;
      inside = task;
      board.show(
        [
          { kind: 'title', text: task.name },
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

    /** An empty building is a question: what is going to happen in here. */
    const askName = (aim: Aim & { kind: 'building' }): void => {
      const project = projectOn(aim.district);
      if (!project) return;
      open = aim;
      naming = { district: aim.district, project, slot: aim.slot, written: '' };
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      board.show(asking(naming));
    };

    const wrote = (written: string): void => {
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
      tasks = await client.tasks.list({});
      people();
      if (aim) await openTask(aim, made.data);
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
        else askName(aim);
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

    watchPointer(pixi, camera, board, {
      at: (x, y) => drawn.ground.at(x, y),
      hover: (aim) => drawn.ground.hover(aim),
      picked: (aim) => void picked(aim),
      escaped: () => void picked(null),
      /* Three things the keyboard can be doing, and never more than one at a
         time: naming a building nobody has moved into, answering the villager
         standing at a door, or saying something to whoever is in there. */
      typed: (event) => {
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
    let seen: Record<string, Mood> = {};
    const people = (): void => {
      const standing: Standing[] = [];
      for (const task of tasks) {
        const mood = seen[task.id];
        if (!mood || mood === 'empty') continue;
        const plot = projects.find((project) => project.id === task.project)?.plot;
        const district = plot ? drawn.districts.get(plot) : undefined;
        const building = district && drawn.ground.buildingAt(district, task.slot);
        if (building) standing.push({ id: task.id, building, mood });
      }
      drawn.folk.set(standing);
    };
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

/** The board, waiting to be written on. */
function asking(naming: { district: District; written: string }): Row[] {
  return [
    { kind: 'title', text: 'a new task' },
    { kind: 'line', text: `on the ${naming.district.name.toLowerCase()}`, tone: 'faded' },
    { kind: 'gap' },
    { kind: 'line', text: 'what is going to happen in here?' },
    { kind: 'typed', text: naming.written },
    { kind: 'gap' },
    { kind: 'line', text: 'return to begin, escape to leave it empty.', tone: 'faded' },
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
  pointing: Pointing
): void {
  pixi.stage.eventMode = 'static';
  pixi.stage.hitArea = pixi.screen;

  let pressedAt: { x: number; y: number } | null = null;

  const under = (event: FederatedPointerEvent): Aim | null => {
    const point = camera.toWorld(event.global);
    return pointing.at(point.x, point.y);
  };
  // Land the board is standing in front of is not land you can point at.
  const behind = (event: FederatedPointerEvent): boolean => board.over(event.global.x);

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
