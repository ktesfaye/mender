import { Document, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import { createCamera, flyOut, flyTo, frame } from './village/camera';
import { districtBounds, Ground } from './village/ground';
import { loadKit } from './village/kit';
import { say } from './village/notice';
import { buildScene } from './village/scene';
import { wire } from './wire';

/**
 * You open Mender and you see the village.
 *
 * Nothing else is on the screen: no title bar full of buttons, no sidebar, no
 * tab strip. The island is composed in the main process out of the state the
 * app is actually in — which projects exist, how far each has grown — and drawn
 * here. Everything the app can do arrives as something standing on it.
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
    const [village] = await Promise.all([wire().then((w) => w.village), loadKit()]);

    say('drawing the island…');
    const map = await village.map({});
    const scene = buildScene(new Document(map.layout).items());
    if (scene.missing.length) {
      console.warn(`${scene.missing.length} sprites are not in the kit`, scene.missing.slice(0, 8));
    }

    world.addChild(scene.root);
    const ground = new Ground(map.districts, map.layout);
    scene.root.addChildAt(ground.overlay, scene.groundTop);
    frame(camera, world);
    say(null);

    watchPointer(pixi, camera, world, ground);
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Pointing and going.
 *
 * A district lights when the pointer is over it and the camera flies to it when
 * you pick it; the open sea takes you back out, and so does escape. The camera
 * is also dragged with the same button, so a press that moved is a pan and not
 * a pick — without that, every drag that ends over land flies you somewhere.
 */
function watchPointer(
  pixi: Application,
  camera: ReturnType<typeof createCamera>,
  world: Container,
  ground: Ground
): void {
  pixi.stage.eventMode = 'static';
  pixi.stage.hitArea = pixi.screen;

  let pressedAt: { x: number; y: number } | null = null;
  let focused: District | null = null;

  const under = (event: FederatedPointerEvent): District | null => {
    const point = camera.toWorld(event.global);
    return ground.at(point.x, point.y);
  };

  pixi.stage.on('pointermove', (event: FederatedPointerEvent) => {
    const district = under(event);
    ground.hover(district);
    pixi.canvas.style.cursor = district ? 'pointer' : 'default';
  });

  pixi.stage.on('pointerdown', (event: FederatedPointerEvent) => {
    pressedAt = { x: event.global.x, y: event.global.y };
  });

  pixi.stage.on('pointerup', (event: FederatedPointerEvent) => {
    const from = pressedAt;
    pressedAt = null;
    if (!from) return;
    const dragged = Math.hypot(event.global.x - from.x, event.global.y - from.y) > 4;
    if (dragged) return;

    const district = under(event);
    if (!district || district === focused) {
      focused = null;
      flyOut(camera, world);
      return;
    }
    focused = district;
    flyTo(camera, districtBounds(district));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !focused) return;
    focused = null;
    flyOut(camera, world);
  });
}

void boot();
