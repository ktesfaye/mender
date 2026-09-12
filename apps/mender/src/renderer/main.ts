import { CAMP, Document, extentOf, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { Project } from '@shared/projects';
import { makeBoard, type Board } from './board/board';
import { openDistrict, type DistrictBoard } from './board/district';
import { loadLettering } from './board/lettering';
import { createCamera, flyOut, flyTo, frame, type Extent } from './village/camera';
import { districtBounds, Ground } from './village/ground';
import { loadKit } from './village/kit';
import { say } from './village/notice';
import { buildScene } from './village/scene';
import { wire, type MenderClient } from './wire';

/**
 * You open Mender and you see the village.
 *
 * Nothing else is on the screen: no title bar full of buttons, no sidebar, no
 * tab strip. The island is composed in the main process out of the state the
 * app is actually in — which projects exist, how far each has grown — and drawn
 * here. Everything the app can do arrives as something standing on it, and
 * everything it has to say arrives on one wooden board.
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
    const [client] = await Promise.all([wire(), loadKit(), loadLettering()]);
    const board = await makeBoard(pixi);
    let drawn = await draw(world, client);
    let projects = await client.projects.list({});
    frame(camera, drawn.island);
    pixi.ticker.add((ticker) => drawn.ground.tick(ticker));

    let focused: District | null = null;
    let showing: DistrictBoard | null = null;

    const shut = async (): Promise<void> => {
      focused = null;
      board.hide();
      const was = showing;
      showing = null;
      await was?.close();
    };

    /* Opening a district is one move with two halves: the camera pulls in on
       its land, aiming at the part of the window the board is about to leave,
       and the board comes in from the right with what is true of that checkout
       written on it. Neither waits for the other — the board is up with the
       project's name on it before git has been asked anything. */
    const openBoard = async (district: District): Promise<void> => {
      const project = projects.find((candidate) => candidate.plot === district.id);
      if (!project) return;
      const was = showing;
      showing = null;
      await was?.close();

      focused = district;
      board.show(waiting(project));
      flyTo(camera, districtBounds(district), { inset: board.inset });

      const opened = await openDistrict(client, project, (rows) => {
        if (focused === district) board.update(rows);
      });
      // Closed, or opened somewhere else, while git was still answering.
      if (focused !== district) {
        await opened.close();
        return;
      }
      showing = opened;
      board.update(opened.rows());
    };

    const picked = async (district: District | null): Promise<void> => {
      if (!district) {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      // The camp is where the island grows from: its fire is the only thing on
      // an empty island, and founding a project is what it is for.
      if (district.id === CAMP) {
        await found(client, async () => {
          await shut();
          drawn = await draw(world, client);
          projects = await client.projects.list({});
          frame(camera, drawn.island);
        });
        return;
      }
      if (district === focused) {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      await openBoard(district);
    };

    watchPointer(pixi, camera, board, {
      at: (x, y) => drawn.ground.at(x, y),
      hover: (district) => drawn.ground.hover(district),
      picked: (district) => void picked(district),
      escaped: () => void picked(null),
    });
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/** What the board says in the moment between opening and git answering. */
function waiting(project: Project): Parameters<Board['show']>[0] {
  return [
    { kind: 'title', text: project.name },
    { kind: 'line', text: project.path, tone: 'faded', keep: 'tail' },
    { kind: 'gap' },
    { kind: 'line', text: 'reading the checkout…', tone: 'faded' },
  ];
}

interface Drawn {
  ground: Ground;
  island: Extent;
}

/** Compose the island for the state the app is in, and put it on screen. */
async function draw(world: Container, client: MenderClient): Promise<Drawn> {
  say('drawing the island…');
  const map = await client.village.map({});
  const scene = buildScene(new Document(map.layout).items());
  if (scene.missing.length) {
    console.warn(`${scene.missing.length} sprites are not in the kit`, scene.missing.slice(0, 8));
  }
  const ground = new Ground(map.districts, map.layout);
  scene.root.addChildAt(ground.overlay, scene.groundTop);

  for (const old of world.removeChildren()) old.destroy({ children: true });
  world.addChild(scene.root);
  say(null);
  return { ground, island: extentOf(map.layout) };
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
  at(worldX: number, worldY: number): District | null;
  hover(district: District | null): void;
  picked(district: District | null): void;
  escaped(): void;
}

/**
 * Pointing and going.
 *
 * A district lights when the pointer is over it and something happens when you
 * pick it; the open sea takes you back out, and so does escape. The camera is
 * dragged with the same button, so a press that moved is a pan and not a pick —
 * without that, every drag that ends over land takes you somewhere.
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

  const under = (event: FederatedPointerEvent): District | null => {
    const point = camera.toWorld(event.global);
    return pointing.at(point.x, point.y);
  };
  // Land the board is standing in front of is not land you can point at.
  const behind = (event: FederatedPointerEvent): boolean => board.over(event.global.x);

  pixi.stage.on('pointermove', (event: FederatedPointerEvent) => {
    const district = behind(event) ? null : under(event);
    pointing.hover(district);
    pixi.canvas.style.cursor = district ? 'pointer' : 'default';
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
    if (event.key === 'Escape') pointing.escaped();
  });
}

void boot();
