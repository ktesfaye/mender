import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createController, type Controller } from '@emdash/wire/rpc';
import {
  composeState,
  parseLayout,
  stateKey,
  type Atlas,
  type ComposedVillage,
  type Layout,
  type Plots,
  type Stages,
  type VillageWorld,
} from '@mender/village';
import { app } from 'electron';
import { villageContract } from '@shared/village';

export interface VillageOptions {
  /** What is on the island right now: plot id -> stage. */
  state: () => Promise<Stages>;
}

/**
 * The world, and the map of it for any state.
 *
 * Composing costs about a second: filtering ten megabytes of tagged world down
 * to one state, then erasing everything outside that state's footprints to the
 * sea and dressing the coast that exposes. It happens here rather than in the
 * renderer because the world files are on disk, and because a second of work is
 * a second the village would otherwise spend frozen mid-pan.
 */
export function createVillageController(options: VillageOptions): Controller {
  let world: VillageWorld | undefined;
  const maps = new Map<string, ComposedVillage>();

  return createController(villageContract, {
    async map({ stages }) {
      const wanted = stages ?? (await options.state());
      const key = stateKey(wanted);
      let map = maps.get(key);
      if (!map) {
        world ??= loadWorld();
        map = composeState(world, wanted);
        maps.set(key, map);
      }
      return { layout: map.layout, stages: map.stages, shore: map.shore };
    },
  });
}

function loadWorld(): VillageWorld {
  const dir = join(app.getAppPath(), 'assets', 'village');
  const read = (name: string) => readFileSync(join(dir, name), 'utf8');
  return {
    // `parseLayout`, not `JSON.parse`: 116 of the world's objects carry a Unity
    // instance id larger than 2^53, and a plain parse silently rewrites them.
    world: parseLayout<Layout>(read('world.json')),
    plots: JSON.parse(read('plots.json')) as Plots,
    atlas: JSON.parse(read('atlas.json')) as Atlas,
  };
}
