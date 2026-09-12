import { Document } from '@mender/village';
import { Application, Container } from 'pixi.js';
import { createCamera, frame } from './village/camera';
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
    frame(camera, world);
    say(null);
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

void boot();
