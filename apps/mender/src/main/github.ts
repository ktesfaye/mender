import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { ShellEnvManager } from '@emdash/core/services/shell-env/node';
import { createController, type Controller } from '@emdash/wire/rpc';
import { githubAuthContract } from '@upstream/services/pull-requests/api/github-auth-contract';
import { shell } from 'electron';
import { githubContract } from '../shared/github';

const ran = promisify(execFile);

type EnvSource = Pick<ShellEnvManager, 'current'>;

/**
 * Who the village is, to GitHub.
 *
 * Emdash keeps its own account store, its own device-code flow and its own
 * keychain entries, and the village does not want any of that: the machine
 * already has a GitHub login, because `gh` is how anybody who works here signs
 * in, and a second place to be signed in is a second place to be signed out
 * of. So this asks `gh` for the token it already holds.
 *
 * Nothing is stored, logged or written down. The token is fetched when it is
 * asked for and handed straight to the runtime that makes the request.
 */
export function createGitHubAuth(env: EnvSource): Controller {
  return createController(githubAuthContract, {
    resolveAuth: async ({ repositoryUrl }) => {
      const host = hostOf(repositoryUrl);
      const token = await tokenFor(host, env);
      if (!token) {
        return {
          success: false,
          error: {
            type: 'auth_required',
            host,
            message: `nothing on this machine is signed in to ${host}.`,
            hint: 'run `gh auth login` in a terminal.',
          },
        };
      }
      return {
        success: true,
        data: {
          token,
          host,
          apiBaseUrl: host === 'github.com' ? 'https://api.github.com' : `https://${host}/api/v3`,
        },
      };
    },
  });
}

/**
 * The token `gh` is holding for that host.
 *
 * An environment variable wins, because somebody who set one meant it, and
 * that is also the only way this works on a machine without `gh` at all.
 */
async function tokenFor(host: string, env: EnvSource): Promise<string | null> {
  const said = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (said) return said;
  try {
    const { stdout } = await ran('gh', ['auth', 'token', '--hostname', host], {
      timeout: 10_000,
      env: await env.current(),
    });
    const token = stdout.trim();
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Whether this machine is signed in, and as whom — read, never stored.
 *
 * Mender keeps no per-project account picker (see MENDER.md): one machine,
 * one `gh`, one identity every project's GitHub work acts as.
 */
export function createGitHubStatus(): Controller {
  return createController(githubContract, {
    status: () => status(),
    signIn: () => signIn(),
  });
}

async function status(): Promise<
  { kind: 'signed-in'; login: string; host: string } | { kind: 'signed-out' } | { kind: 'no-gh' }
> {
  try {
    const { stdout } = await ran('gh', ['api', 'user', '--jq', '.login'], { timeout: 10_000 });
    const login = stdout.trim();
    return login ? { kind: 'signed-in', login, host: 'github.com' } : { kind: 'signed-out' };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT' ? { kind: 'no-gh' } : { kind: 'signed-out' };
  }
}

/**
 * Starts `gh`'s own device flow and hands back the code and the URL the
 * moment they are known, opening that URL for him at the same time. The
 * process itself keeps running after this resolves, polling GitHub until he
 * finishes in the browser or it times out — nothing here waits on that, the
 * same way a folder pick does not wait on him finding the right folder.
 */
async function signIn(): Promise<
  | { success: true; data: { code: string; url: string } }
  | { success: false; error: { kind: 'no-gh' } | { kind: 'refused'; said: string } }
> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        'gh',
        ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch {
      resolve({ success: false, error: { kind: 'no-gh' } });
      return;
    }
    let settled = false;
    let said = '';
    const seen = (chunk: Buffer): void => {
      said += chunk.toString();
      const code = /one-time code:\s*([A-Z0-9-]+)/i.exec(said)?.[1];
      const url = /(https:\/\/github\.com\/login\/device\S*)/.exec(said)?.[1];
      if (code && url && !settled) {
        settled = true;
        void shell.openExternal(url);
        resolve({ success: true, data: { code, url } });
      }
    };
    child.stdout?.on('data', seen);
    child.stderr?.on('data', seen);
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      const code = (error as NodeJS.ErrnoException).code;
      resolve(
        code === 'ENOENT'
          ? { success: false, error: { kind: 'no-gh' } }
          : { success: false, error: { kind: 'refused', said: error.message } }
      );
    });
    child.on('exit', (exitCode) => {
      if (settled) return;
      settled = true;
      resolve({
        success: false,
        error: { kind: 'refused', said: said.trim() || `gh exited (${exitCode}).` },
      });
    });
  });
}

/** Which GitHub a remote points at, since not everybody's is github.com. */
function hostOf(url: string): string {
  const ssh = /^[^@]+@([^:]+):/.exec(url);
  if (ssh?.[1]) return ssh[1];
  try {
    return new URL(url).hostname || 'github.com';
  } catch {
    return 'github.com';
  }
}
