/**
 * What a session is building, as something to look at.
 *
 * A session that writes a page, or tells you a dev server is up, is building
 * something with a face, and the code scrolling past in its steps is not that
 * face. This finds the page, has it drawn every time the agent changes it, and
 * keeps every look, so the yard can show the newest and the opened view can
 * show the lot as the page coming together.
 *
 * Kept here rather than in a yard, because a yard is torn down every time you
 * step to another session, and the looks are the session's.
 */

import type { Told } from '@shared/agents';
import type { Drew } from '@shared/building';
import type { MenderClient } from '../wire';

/** The page itself: where it is, what to call it, and when it last changed. */
export interface Page {
  url: string;
  name: string;
  /** The file, when it is a file and not a server. */
  path?: string;
  /** When what it is drawn from last changed, which is when to look again. */
  changed: number;
  /** Something is being written to it right now; look once that has landed. */
  busy?: boolean;
}

export interface Seen {
  image: string;
  /** When the change it shows was made. */
  at: number;
  /** When it was drawn, which is how long "just drew" stays up. */
  when: number;
  drew?: Drew;
}

export interface Building {
  page: Page;
  /** Oldest first. */
  looks: Seen[];
  /** A look is being taken right now. */
  looking: boolean;
  /** The change the last look was asked for, drawn or not. */
  tried: number;
  /** How many times in a row the page would not draw. */
  missed: number;
}

/** Enough to scrub back through a long build without holding every frame of it. */
const KEPT = 48;
/** A dev server reloads itself when a file changes; this is how long that takes to land. */
const SERVER_SETTLE_MS = 1_800;
/** A page that will not draw is tried this many more times, this far apart and widening. */
const RETRIES = 5;
const RETRY_MS = 1_500;

/* A page under any of these was not written to be looked at: a test
   report, a coverage table, somebody else's package. */
const NOT_A_PAGE =
  /\/(node_modules|coverage|playwright-report|test-results|\.git|\.next|htmlcov)\//;

const ON_THIS_MACHINE =
  /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d{2,5})?(?:\/[^\s)\]`'"<>*]*)?/g;

/**
 * The page a session is building, if it is building one.
 *
 * Whichever came last: a page it wrote, or a page on this machine it pointed
 * at in what it said. Only what the agent said counts, never what was said to
 * it, and never a command it ran, since curling an endpoint is not building a
 * page.
 */
export function pageOf(told: Told | undefined): Page | undefined {
  if (!told) return undefined;
  let best: Page | undefined;
  /* A write shows up the moment it starts, before anything is on disk, so a
     page is looked at again once each write to it has finished: the count of
     finished ones moves the change on by a hair when the last one lands. */
  /* A step does not always say which file it is writing while it runs, so
     any write counts: a page waits out every write, and moves on with each. */
  const writes = told.deeds.filter((one) => /write|modify|edit|create/i.test(one.tool));
  const landed = (path?: string): number =>
    writes.filter((one) => !one.running && (!path || !one.path || one.path === path)).length;
  const writing = (path?: string): boolean =>
    writes.some((one) => one.running && (!path || !one.path || one.path === path));
  const newest = (told.wrote[0]?.at ?? 0) + landed();
  for (const one of told.wrote) {
    if (!/\.html?$/i.test(one.path) || !one.path.startsWith('/') || NOT_A_PAGE.test(one.path))
      continue;
    if (!best || one.at > best.changed) {
      best = {
        url: `file://${encodeURI(one.path)}`,
        name: one.path.split('/').at(-1) ?? one.path,
        path: one.path,
        changed: one.at + landed(one.path),
        ...(writing(one.path) ? { busy: true } : {}),
      };
    }
  }
  for (const one of told.thoughts) {
    if (one.quiet || one.trouble) continue;
    for (const found of one.said.matchAll(ON_THIS_MACHINE)) {
      if (best && best.changed > one.at) continue;
      const url = found[0].replace(/[.,;:!?]+$/, '');
      /* A server is drawn from every file it serves, so any file written
         after it was named is it changing. */
      best = {
        url,
        name: new URL(url).host,
        changed: Math.max(one.at, newest),
        ...(writing() ? { busy: true } : {}),
      };
    }
  }
  return best;
}

const kept = new Map<string, Building>();

/** What one session has been seen building so far. */
export function buildingOf(task: string): Building | undefined {
  const one = kept.get(task);
  return one && one.looks.length ? one : undefined;
}

/**
 * Look at a session's page again if it has changed since the last look.
 *
 * One look at a time per session; a change that lands while one is being
 * taken is picked up as soon as it is done.
 */
export function watchPage(
  client: MenderClient,
  task: string,
  page: Page | undefined,
  saw: () => void
): void {
  if (!page) return;
  let one = kept.get(task);
  if (!one || one.page.url !== page.url) {
    one = { page, looks: [], looking: false, tried: 0, missed: 0 };
    kept.set(task, one);
  }
  one.page = page;
  if (one.looking || page.busy || page.changed <= one.tried) return;
  one.looking = true;
  one.tried = page.changed;
  const building = one;
  const at = page.changed;
  void client.building
    .look(
      { key: task, url: page.url, ...(page.path ? {} : { settle: SERVER_SETTLE_MS }) },
      { timeoutMs: 30_000 }
    )
    .then(
      (seen) => seen,
      () => null
    )
    .then((seen) => {
      building.looking = false;
      if (kept.get(task) !== building) return;
      /* A page asked after the moment its write began is not on disk yet,
         and a server that was just named may not be up: try again a little
         later, a few times, rather than waiting for the next change. */
      if (!seen) {
        building.missed += 1;
        if (building.missed <= RETRIES && building.tried === at) {
          window.setTimeout(() => {
            if (kept.get(task) !== building || building.tried !== at) return;
            building.tried = at - 1;
            watchPage(client, task, building.page, saw);
          }, RETRY_MS * building.missed);
        }
        return;
      }
      building.missed = 0;
      if (seen.moved || !building.looks.length) {
        building.looks.push({
          image: seen.image,
          at,
          when: Date.now(),
          ...(seen.drew ? { drew: seen.drew } : {}),
        });
        if (building.looks.length > KEPT) building.looks.splice(1, 1);
        saw();
      }
      /* Whatever changed while that one was being taken. */
      watchPage(client, task, building.page, saw);
    });
}
