import { execFile, spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { access, constants, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebStream } from 'node:stream/web';
import { promisify } from 'node:util';
import type { ShellEnvManager } from '@emdash/core/services/shell-env/node';
import { log } from '@emdash/shared/logger';
import { createController, type Controller } from '@emdash/wire/rpc';
import { app, net } from 'electron';
import { newer, updatesContract, type UpdateState } from '@shared/updates';

const ran = promisify(execFile);

/**
 * Mender keeping itself up to date, on a machine nobody codes it on.
 *
 * Published versions are GitHub releases on Mender's own repository, made by
 * hand when he says so (`tools/publish.sh`), never on every commit. The
 * repository is public, so this asks github.com itself, with no `gh` and no
 * sign-in, since the work laptop has neither: where "latest" points and the
 * one dmg every release carries under the same name. Drafts are only seen
 * signed in, so a Mender run with MENDER_UPDATE_DRAFTS=1 still asks `gh`.
 * It asks when it opens, every few hours after, and
 * whenever "check for updates" is pressed on the windmill. A newer one is
 * fetched straight away and waits beside the app until the next quit, when a
 * small shell left behind swaps the bundle over once this process is gone.
 *
 * Not Electron's own updater: that needs a paid signing certificate on macOS,
 * and this app has none. Swapping a bundle we own does not care.
 */

const REPO = 'ktesfaye/mender';
const SITE = `https://github.com/${REPO}/releases`;
const DMG = 'Mender-arm64.dmg';
const TAG = /^mender-v(\d+\.\d+\.\d+)$/;
const EVERY_MS = 3 * 60 * 60 * 1000;

type EnvSource = Pick<ShellEnvManager, 'current'>;

export interface Updates {
  controller: Controller;
  /** Called on the way out: hand the swap to a shell that outlives us. */
  quitting(): void;
  dispose(): void;
}

/** A Mender run on its own data (a test copy) opens again on that data. */
function opening(): string {
  return ['MENDER_DATA_DIR', 'MENDER_UPDATE_DRAFTS', 'MENDER_DEBUG_PORT']
    .filter((name) => process.env[name])
    .map((name) => `--env ${name}=${JSON.stringify(process.env[name])}`)
    .join(' ');
}

/** The .app this process is running out of. */
function bundlePath(): string | null {
  const at = process.execPath.indexOf('.app/Contents/MacOS/');
  return at < 0 ? null : process.execPath.slice(0, at + '.app'.length);
}

export function createUpdates(env: EnvSource): Updates {
  const version = app.getVersion();
  const bundle = bundlePath();
  const staging = join(app.getPath('userData'), 'update');
  const drafts = process.env.MENDER_UPDATE_DRAFTS === '1';

  let state: UpdateState = { version, phase: 'idle', latest: null, said: null };
  let staged: string | null = null;
  let reopen = false;
  let busy: Promise<UpdateState> | null = null;

  const cannot =
    !app.isPackaged || process.platform !== 'darwin' || !bundle
      ? 'only an installed Mender updates itself'
      : null;
  if (cannot) state = { ...state, phase: 'cannot', said: cannot };

  const gh = async (args: string[], timeout = 30_000): Promise<string> => {
    const { stdout } = await ran('gh', args, { timeout, env: await env.current() });
    return stdout;
  };

  /**
   * Where github.com's own "latest" release points, read off the redirect
   * rather than asked of its API, which rate-limits a whole office's address.
   * `net.request` because it goes through this Mac's proxy, and because
   * `net.fetch` neither reports a redirect's target nor lets one be stopped.
   */
  const latestPublished = (): Promise<string | null> =>
    new Promise((resolve, reject) => {
      const req = net.request({ url: `${SITE}/latest`, method: 'HEAD', redirect: 'manual' });
      req.on('redirect', (_status, _method, to) => {
        resolve(TAG.exec(to.split('/').pop() ?? '')?.[1] ?? null);
        req.abort();
      });
      req.on('response', (res) => {
        reject(new Error(`github said ${res.statusCode} when asked for the latest Mender`));
      });
      req.on('error', reject);
      req.end();
    });

  const latestTag = async (): Promise<string | null> => {
    if (!drafts) return latestPublished();
    const out = await gh([
      'release',
      'list',
      '--repo',
      REPO,
      '--limit',
      '20',
      '--json',
      'tagName,isDraft,isPrerelease',
    ]);
    const releases = JSON.parse(out) as {
      tagName: string;
      isDraft: boolean;
      isPrerelease: boolean;
    }[];
    let best: string | null = null;
    for (const one of releases) {
      if (one.isPrerelease || (one.isDraft && !drafts)) continue;
      const v = TAG.exec(one.tagName)?.[1];
      if (v && (!best || newer(v, best))) best = v;
    }
    return best;
  };

  /** Download the dmg, lift the app out of it, and leave it beside us. */
  const fetch = async (latest: string): Promise<string> => {
    const work = await mkdtemp(join(tmpdir(), 'mender-update-'));
    const mount = join(work, 'mnt');
    try {
      if (drafts)
        await gh(
          [
            'release',
            'download',
            `mender-v${latest}`,
            '--repo',
            REPO,
            '--pattern',
            '*.dmg',
            '--dir',
            work,
          ],
          10 * 60 * 1000
        );
      else {
        const res = await net.fetch(`${SITE}/download/mender-v${latest}/${DMG}`);
        if (!res.ok || !res.body) throw new Error(`github said ${res.status} for the download`);
        await pipeline(
          Readable.fromWeb(res.body as unknown as WebStream),
          createWriteStream(join(work, DMG))
        );
      }
      const dmg = (await ran('/bin/ls', [work])).stdout.split('\n').find((f) => f.endsWith('.dmg'));
      if (!dmg) throw new Error('the release had no dmg on it');
      await mkdir(mount);
      await ran('/usr/bin/hdiutil', [
        'attach',
        '-nobrowse',
        '-readonly',
        '-mountpoint',
        mount,
        join(work, dmg),
      ]);
      const target = join(staging, latest, 'Mender.app');
      await rm(join(staging), { recursive: true, force: true });
      await mkdir(dirname(target), { recursive: true });
      try {
        await ran('/usr/bin/ditto', [join(mount, 'Mender.app'), target]);
      } finally {
        await ran('/usr/bin/hdiutil', ['detach', mount, '-force']).catch(() => undefined);
      }
      const plist = await readFile(join(target, 'Contents', 'Info.plist'), 'utf8');
      if (!plist.includes(`<string>${latest}</string>`)) {
        throw new Error(`what came down does not say it is ${latest}`);
      }
      await ran('/usr/bin/xattr', ['-dr', 'com.apple.quarantine', target]).catch(() => undefined);
      return target;
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  };

  const check = (): Promise<UpdateState> => {
    if (cannot) return Promise.resolve(state);
    if (busy) return busy;
    busy = (async () => {
      if (staged) return state;
      state = { ...state, phase: 'checking', said: null };
      try {
        const latest = await latestTag();
        if (!latest || !newer(latest, version)) {
          state = { ...state, phase: 'none', latest };
          return state;
        }
        if (!bundle) throw new Error('nowhere to put it');
        await access(dirname(bundle), constants.W_OK).catch(() => {
          throw new Error(`this mac won't let Mender replace itself in ${dirname(bundle)}`);
        });
        state = { ...state, phase: 'fetching', latest };
        staged = await fetch(latest);
        state = { ...state, phase: 'ready' };
        log.info('update ready', { from: version, to: latest });
      } catch (error) {
        const said = error instanceof Error ? error.message : String(error);
        const plain =
          /ENOENT/.test(said) && drafts
            ? 'gh is not on this machine'
            : /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ENOTFOUND/.test(said)
              ? 'this mac can’t reach github right now'
              : (said.split('\n')[0] ?? said);
        state = { ...state, phase: 'failed', said: plain };
        log.warn('update check failed', { said });
      }
      return state;
    })().finally(() => {
      busy = null;
    });
    return busy;
  };

  const first = setTimeout(() => void check(), 20_000);
  const every = setInterval(() => void check(), EVERY_MS);

  const quitting = (): void => {
    if (!staged || !bundle) return;
    const script = join(staging, 'swap.sh');
    const body = [
      '#!/bin/sh',
      `pid=${process.pid}`,
      `cur=${JSON.stringify(bundle)}`,
      `new=${JSON.stringify(staged)}`,
      `was=${JSON.stringify(version)}`,
      'while kill -0 "$pid" 2>/dev/null; do sleep 0.5; done',
      // Somebody put a different Mender there in the meantime; leave it be.
      'now=$(/usr/bin/defaults read "$cur/Contents/Info" CFBundleShortVersionString 2>/dev/null)',
      '[ "$now" = "$was" ] || exit 0',
      'old="$cur.old-$$"',
      'mv "$cur" "$old" || exit 1',
      'if mv "$new" "$cur"; then rm -rf "$old"; else mv "$old" "$cur"; exit 1; fi',
      reopen ? `open ${opening()} "$cur"` : '',
      '',
    ].join('\n');
    // Synchronously: the process is on its way out and will not wait.
    writeFileSync(script, body, { mode: 0o755 });
    spawn('/bin/sh', [script], { detached: true, stdio: 'ignore' }).unref();
  };

  const controller = createController(updatesContract, {
    state: () => state,
    check: () => check(),
    restart: () => {
      if (!staged) return false;
      reopen = true;
      setImmediate(() => app.quit());
      return true;
    },
  });

  return {
    controller,
    quitting,
    dispose: () => {
      clearTimeout(first);
      clearInterval(every);
    },
  };
}
