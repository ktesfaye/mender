import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createController, type Controller } from '@emdash/wire/rpc';
import { githubAuthContract } from '@upstream/services/pull-requests/api/github-auth-contract';

const ran = promisify(execFile);

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
export function createGitHubAuth(): Controller {
  return createController(githubAuthContract, {
    resolveAuth: async ({ repositoryUrl }) => {
      const host = hostOf(repositoryUrl);
      const token = await tokenFor(host);
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
async function tokenFor(host: string): Promise<string | null> {
  const said = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (said) return said;
  try {
    const { stdout } = await ran('gh', ['auth', 'token', '--hostname', host], {
      timeout: 10_000,
    });
    const token = stdout.trim();
    return token || null;
  } catch {
    return null;
  }
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
