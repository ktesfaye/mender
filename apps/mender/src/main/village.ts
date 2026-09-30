import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createController, type Controller } from '@emdash/wire/rpc';
import {
  CAMP,
  createVillage,
  districtsOf,
  landOf,
  parseLayout,
  retagSplit,
  splitOf,
  type Atlas,
  type Composed,
  type District,
  type DistrictSpec,
  ISLET,
  type Layout,
  type SubdistrictSpec,
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
  let subdistricts: SubdistrictSpec[] | undefined;
  const maps = new Map<string, { composed: Composed; districts: District[] }>();

  /* The map for whoever is standing where. What is composed is always his: a
     piece switches its district on, and is cut out of it afterwards. The islet
     is always drawn, but it is only a place you point at while somebody lives
     on it; empty, it is common ground like the camp. */
  const mapFor = (wanted: readonly string[]): { composed: Composed; districts: District[] } => {
    village ??= createVillage(loadWorld());
    subdistricts ??= loadSubdistricts();
    const land = [...new Set(wanted.map((id) => landOf(id, subdistricts!)))];
    const cut = subdistricts
      .filter((one) => wanted.includes(one.id))
      .map((one) => one.id)
      .join('-');
    const lived = wanted.includes(ISLET);
    const key = `${village.stateKey(village.connected(land))}|${cut}|${lived}`;
    let map = maps.get(key);
    if (!map) {
      const composed = village.compose(land);
      const districts = splitOf(
        districtsOf(village.world, composed.on, composed.moored),
        subdistricts,
        wanted
      ).map(
        (one): District => (one.id === ISLET ? { ...one, kind: lived ? 'project' : 'common' } : one)
      );
      retagSplit(composed.layout, districts, subdistricts);
      map = { composed, districts };
      maps.set(key, map);
    }
    return map;
  };

  return createController(villageContract, {
    async map({ on }) {
      const map = mapFor(on ?? (await options.state()));
      return {
        layout: map.composed.layout,
        on: map.composed.on,
        shore: map.composed.shore,
        districts: map.districts,
        moored: [map.composed.moored[0], map.composed.moored[1]] as [number, number],
      };
    },
    async places() {
      village ??= createVillage(loadWorld());
      subdistricts ??= loadSubdistricts();
      /* The islet stands wherever it is moored today, not where he drew it. */
      const islet = mapFor(await options.state()).districts.find((one) => one.id === ISLET);
      return [
        ...village.world.districts
          .filter((spec) => spec.id !== CAMP)
          .map((spec) => ({
            id: spec.id,
            name: spec.name,
            of: null,
            cells: spec.id === ISLET && islet ? islet.cells : spec.cells,
          })),
        ...subdistricts.map((one) => ({
          id: one.id,
          name: one.name,
          of: one.of,
          cells: one.cells,
        })),
      ];
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

/** The pieces the big districts give up once all eleven are taken. */
export function loadSubdistricts(): SubdistrictSpec[] {
  const path = join(app.getAppPath(), 'assets', 'village', 'subdistricts.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { pieces: SubdistrictSpec[] }).pieces;
}
