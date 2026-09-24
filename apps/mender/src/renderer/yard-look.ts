/**
 * The yard, on its own, standing in the real village.
 *
 * The whole app is one screen with the island drawn under everything, which is
 * lovely to use and slow to iterate on: to look at one line of the yard you
 * would otherwise wake the wire, cut a worktree and start an agent. This page
 * composes the same island the app does, straight off the world files, parks
 * the camera on a district and writes the designs' own session over the top.
 *
 * So what is behind the words here is exactly what will be behind them in the
 * app, dimmed by exactly as much, which is the only thing that makes looking at
 * this page worth anything.
 *
 * It is a harness and it is allowed to be one. Nothing the app ships imports
 * from here.
 */

import {
  createVillage,
  districtsOf,
  parseLayout,
  type Atlas,
  type DistrictSpec,
  type Layout,
} from '@mender/village';
import type { Viewport } from 'pixi-viewport';
import { Application, Container } from 'pixi.js';
import { setPace } from './pace';
import { createCamera } from './village/camera';
import { districtBounds, Ground } from './village/ground';
import { loadKit } from './village/kit';
import { buildScene } from './village/scene';
import { dim, makeLayer } from './yard/frame';
import { SAMPLE } from './yard/sample';
import { loadCuts } from './yard/sprite';
import { makeYard } from './yard/yard';
import './yard/tokens.css';

/** Which districts are standing. Enough of them that the island reads. */
const STANDING = 5;

async function island(world: Container): Promise<void> {
  const read = async (name: string): Promise<string> =>
    await (await fetch('./village/' + name)).text();
  const village = createVillage({
    // `parseLayout`, not `JSON.parse`: a hundred-odd of his objects carry a
    // Unity instance id larger than a double can hold, and a plain parse
    // silently rewrites them.
    base: parseLayout<Layout>(await read('base-layout.json')),
    districts: (JSON.parse(await read('districts.json')) as { districts: DistrictSpec[] })
      .districts,
    atlas: JSON.parse(await read('atlas.json')) as Atlas,
  });

  const wanted = village.world.districts.slice(0, STANDING).map((one) => one.id);
  const composed = village.compose(village.connected(wanted));
  const districts = districtsOf(village.world, composed.on, composed.moored);
  const scene = buildScene(
    new (await import('@mender/village')).Document(composed.layout).items(),
    composed.layout
  );
  if (scene.missing.length) console.warn(`${scene.missing.length} sprites are not in the kit`);
  const ground = new Ground(districts, composed.layout, scene.buildings);
  scene.root.addChildAt(ground.overlay, scene.groundTop);
  world.addChild(scene.root);

  const standing = districts.find((one) => composed.on.includes(one.id)) ?? districts[0];
  if (!standing) return;
  /* Where the camera comes to rest on a district, near enough that the ground
     under the writing is a place rather than a map. */
  const at = districtBounds(standing);
  const camera = world.parent as Viewport;
  camera.setZoom(3, true);
  camera.moveCenter(at.x + at.width / 2, at.y + at.height / 2);
}

async function boot(): Promise<void> {
  const pixi = new Application();
  await pixi.init({
    resizeTo: window,
    background: '#1d1811',
    antialias: false,
    roundPixels: true,
    preference: 'webgl',
    sharedTicker: true,
  });
  setPace(pixi);
  pixi.renderer.canvas.style.imageRendering = 'pixelated';
  document.body.appendChild(pixi.canvas);

  const camera = createCamera(pixi);
  const world = new Container();
  camera.addChild(world);

  await Promise.all([loadKit(), loadCuts()]);
  await island(world);
  /* The faces have to be in before anything is placed: every position in the
     designs was measured against these metrics and nothing else. */
  await document.fonts.ready;

  dim(pixi.canvas, 'yard');
  const layer = makeLayer();
  const yard = makeYard(layer, {
    open: (id) => console.log('walk into', id),
    say: (text) => console.log('said', text),
    leave: () => console.log('back out'),
  });
  yard.show(SAMPLE);
  yard.line.take();

  /* The arrows walk the board and return picks, which is the whole of the
     keyboard until the chords land. One listener, as everywhere else. */
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      yard.walk.step(event.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

void boot();
