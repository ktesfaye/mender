import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createController, type Controller } from '@emdash/wire/rpc';
import {
  createVillage,
  districtsOf,
  parseLayout,
  type Atlas,
  type Composed,
  type District,
  type DistrictSpec,
  type Layout,
  type Village,
  type VillageWorld,
} from '@mender/village';
import { app } from 'electron';
import { villageContract } from '@shared/village';

export interface VillageOptions {
  /** Which districts have a checkout standing on them right now. */
  state: () => Promise<string[]>;
}

/**
 * The artist's world, and the map of it for any state.
 *
 * Composing costs about a second: erasing everything outside the standing
 * districts to the sea, sailing the islet to whatever coast there is, and
 * dressing the coastline that exposes. It happens here rather than in the
 * renderer because the world files are on disk, and because a second of work is
 * a second the village would otherwise spend frozen mid-pan.
 */
export function createVillageController(options: VillageOptions): Controller {
  let village: Village | undefined;
  const maps = new Map<string, { composed: Composed; districts: District[] }>();

  return createController(villageContract, {
    async map({ on }) {
      village ??= createVillage(loadWorld());
      const wanted = on ?? (await options.state());
      const key = village.stateKey(village.connected(wanted));
      let map = maps.get(key);
      if (!map) {
        const composed = village.compose(wanted);
        map = {
          composed,
          districts: districtsOf(village.world, composed.on, composed.moored),
        };
        maps.set(key, map);
      }
      return {
        layout: map.composed.layout,
        on: map.composed.on,
        shore: map.composed.shore,
        districts: map.districts,
      };
    },
  });
}

function loadWorld(): VillageWorld {
  const dir = join(app.getAppPath(), 'assets', 'village');
  const read = (name: string) => readFileSync(join(dir, name), 'utf8');
  return {
    // `parseLayout`, not `JSON.parse`: 116 of his objects carry a Unity
    // instance id larger than 2^53, and a plain parse silently rewrites them.
    base: parseLayout<Layout>(read('base-layout.json')),
    districts: (JSON.parse(read('districts.json')) as { districts: DistrictSpec[] }).districts,
    atlas: JSON.parse(read('atlas.json')) as Atlas,
  };
}
