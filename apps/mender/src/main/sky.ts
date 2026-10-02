import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createController, type Controller } from '@emdash/wire/rpc';
import { skyContract, type Bustle, type RealWeather } from '@shared/sky';
import { claudeProjectDirName } from './claude-cli-history';
import type { Projects } from './projects';
import type { Tasks } from './tasks';

const ran = promisify(execFile);

/** Weather moves slowly; asking more often than this learns nothing. */
const WEATHER_EVERY = 15 * 60_000;
/** Where he is moves even more slowly. */
const PLACE_EVERY = 6 * 60 * 60_000;
/** Commits do not happen every second either, and git is a process each time. */
const AGING_EVERY = 5 * 60_000;
/** The crowd follows the work closely enough to notice a commit within a minute. */
const BUSTLE_EVERY = 45_000;

interface Place {
  lat: number;
  lon: number;
  at: number;
}

/**
 * The sky over the island, as it really is where he is.
 *
 * Where he is comes from his address on the internet, which is a town and not
 * a street, and is all a sky needs; the weather from Open-Meteo, which asks for
 * no key. Both are asked from here rather than from the page, rarely, and kept:
 * the island asks for the weather every few minutes and almost every one of
 * those is answered from memory.
 */
export function createSkyController(projects: Projects, tasks: Tasks): Controller {
  let place: Place | null = null;
  let weather: RealWeather | null = null;
  let asking: Promise<RealWeather | null> | null = null;
  let aging: { at: number; ages: Record<string, number> } | null = null;
  let bustling: { at: number; all: Record<string, Bustle> } | null = null;
  let reading: Promise<Record<string, Bustle>> | null = null;

  const whereAmI = async (): Promise<Place | null> => {
    if (place && Date.now() - place.at < PLACE_EVERY) return place;
    const found =
      (await fetchJson<{ latitude: string; longitude: string }>(
        'https://get.geojs.io/v1/ip/geo.json'
      ).then((read) =>
        read ? { lat: Number(read.latitude), lon: Number(read.longitude) } : null
      )) ??
      (await fetchJson<{ lat: number; lon: number }>('http://ip-api.com/json/?fields=lat,lon').then(
        (read) => (read ? { lat: Number(read.lat), lon: Number(read.lon) } : null)
      ));
    if (!found || !Number.isFinite(found.lat) || !Number.isFinite(found.lon)) return place;
    place = { ...found, at: Date.now() };
    return place;
  };

  const ask = async (): Promise<RealWeather | null> => {
    const here = await whereAmI();
    if (!here) return weather;
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${here.lat.toFixed(2)}&longitude=${here.lon.toFixed(2)}` +
      '&current=weather_code,cloud_cover,precipitation,rain,showers,snowfall,wind_speed_10m,visibility' +
      '&daily=sunrise,sunset&timezone=GMT&forecast_days=1';
    const read = await fetchJson<{
      current: Parameters<typeof lookOf>[0];
      daily: { sunrise?: string[]; sunset?: string[] };
    }>(url);
    const now = read?.current;
    if (!now) return weather;
    weather = {
      ...lookOf(now),
      sunrise: Date.parse(`${read.daily?.sunrise?.[0]}Z`) || 0,
      sunset: Date.parse(`${read.daily?.sunset?.[0]}Z`) || 0,
      at: Date.now(),
    };
    return weather;
  };

  return createController(skyContract, {
    async weather() {
      if (weather && Date.now() - weather.at < WEATHER_EVERY) return weather;
      asking ??= ask().finally(() => {
        asking = null;
      });
      return asking;
    },
    async bustle() {
      if (bustling && Date.now() - bustling.at < BUSTLE_EVERY) return bustling.all;
      reading ??= (async () => {
        const all: Record<string, Bustle> = {};
        await Promise.all(
          (await projects.list()).map(async (project) => {
            const where = new Set([project.path]);
            for (const task of await tasks.list(project.id)) where.add(task.path);
            const read = await bustleOf(project.path, [...where]);
            if (read) all[project.id] = read;
          })
        );
        bustling = { at: Date.now(), all };
        return all;
      })().finally(() => {
        reading = null;
      });
      return reading;
    },
    async aging() {
      if (aging && Date.now() - aging.at < AGING_EVERY) return aging.ages;
      const ages: Record<string, number> = {};
      await Promise.all(
        (await projects.list()).map(async (project) => {
          const last = await lastCommit(project.path);
          if (last) ages[project.id] = last;
        })
      );
      aging = { at: Date.now(), ages };
      return ages;
    },
  });
}

/** The newest commit on any of the checkout's own branches, not a remote's:
    somebody else pushing upstream is not this project being worked on. */
async function lastCommit(path: string): Promise<number | null> {
  try {
    const { stdout } = await ran('git', ['log', '-1', '--branches', '--format=%ct'], {
      cwd: path,
      timeout: 5000,
    });
    const seconds = Number(stdout.trim());
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
  } catch {
    return null;
  }
}

/** The last time any session in these folders said or did anything, read off
    Claude's own transcripts. A scratch folder that is worked in all day and
    never committed to is as lived in as one that ships every hour. */
async function lastTalk(paths: string[]): Promise<{ last: number; today: number }> {
  let newest = 0;
  let today = 0;
  const dayAgo = Date.now() - 86_400_000;
  await Promise.all(
    paths.map(async (path) => {
      const dir = join(homedir(), '.claude', 'projects', claudeProjectDirName(path));
      let names: string[];
      try {
        names = await readdir(dir);
      } catch {
        return;
      }
      await Promise.all(
        names
          .filter((name) => name.endsWith('.jsonl'))
          .map(async (name) => {
            try {
              const { mtimeMs } = await stat(join(dir, name));
              newest = Math.max(newest, mtimeMs);
              if (mtimeMs > dayAgo) today++;
            } catch {
              // Gone between the listing and the look.
            }
          })
      );
    })
  );
  return { last: newest, today };
}

/** How busy a checkout has been: a few cheap questions to git, any of which
    may fail on a folder that is not one or has nothing committed yet, and
    when its sessions last spoke. */
async function bustleOf(path: string, worked: string[]): Promise<Bustle | null> {
  const [committed, talked] = await Promise.all([lastCommit(path), lastTalk(worked)]);
  const last = Math.max(committed ?? 0, talked.last);
  if (!last) return null;
  const count = async (since: string): Promise<number> => {
    try {
      const { stdout } = await ran(
        'git',
        ['rev-list', '--count', '--branches', `--since=${since}`],
        { cwd: path, timeout: 5000 }
      );
      return Number(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  };
  let ahead = 0;
  try {
    const { stdout } = await ran('git', ['rev-list', '--count', '@{push}..HEAD'], {
      cwd: path,
      timeout: 5000,
    });
    ahead = Number(stdout.trim()) || 0;
  } catch {
    // Nowhere to push to: nothing ever goes out by boat.
  }
  const [today, week] = await Promise.all([count('1 day ago'), count('7 days ago')]);
  return { last, committed: committed ?? 0, today, week, ahead, talked: talked.today };
}

/** Somebody else's JSON, typed as what it is hoped to be and read as if it might not be. */
async function fetchJson<T>(url: string): Promise<Partial<T> | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * What a WMO weather code and a few readings look like.
 *
 * The code says what kind of weather it is; the readings say how much.
 */
function lookOf(now: {
  weather_code?: number;
  cloud_cover?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  wind_speed_10m?: number;
  visibility?: number;
}): Omit<RealWeather, 'sunrise' | 'sunset' | 'at'> {
  const code = now.weather_code ?? 0;
  const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const wet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  // A millimetre an hour is steady rain; five is a downpour.
  const falling = Math.max(now.precipitation ?? 0, (now.rain ?? 0) + (now.showers ?? 0));
  const heavy = Math.min(1, 0.25 + falling / 5);
  const rain = wet ? heavy : 0;
  const snow = snowy ? Math.min(1, 0.3 + (now.snowfall ?? 0) / 2) : 0;
  const misty = code === 45 || code === 48;
  const visibility = now.visibility ?? 20000;
  const fog = misty ? 0.85 : Math.max(0, Math.min(0.6, (4000 - visibility) / 4000));
  return {
    cloud: Math.max(rain || snow ? 0.75 : 0, (now.cloud_cover ?? 0) / 100),
    rain,
    snow,
    fog,
    // Fifty kilometres an hour is a gale as far as a tree on an island cares.
    wind: Math.min(1, (now.wind_speed_10m ?? 0) / 50),
    thunder: code >= 95,
  };
}
