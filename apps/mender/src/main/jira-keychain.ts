import { execFile, spawn } from 'node:child_process';

/**
 * Jira tokens live in the login keychain as items owned by Apple's own
 * `security` tool rather than by Mender. Mender is signed with a local
 * certificate and no team, so the keychain pins whatever it creates to that
 * one build's exact hash, and every rebuild asked for the login password
 * again. `security` never changes, so reading back through it never asks.
 * The token goes in on stdin, never on a command line `ps` could show.
 */

const SERVICE = 'Mender Jira';
const SECURITY = '/usr/bin/security';

const cache = new Map<string, string>();

export function readToken(site: string): Promise<string | undefined> {
  const known = cache.get(site);
  if (known !== undefined) return Promise.resolve(known);
  return new Promise((resolve) => {
    execFile(
      SECURITY,
      ['find-generic-password', '-s', SERVICE, '-a', site, '-w'],
      (error, stdout) => {
        if (error) return resolve(undefined);
        const token = stdout.replace(/\n$/, '');
        cache.set(site, token);
        resolve(token);
      }
    );
  });
}

export function writeToken(site: string, token: string): Promise<boolean> {
  if (/["\\\n\r]/.test(token) || /["\\\n\r\s]/.test(site)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const child = spawn(SECURITY, ['-i'], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', () => resolve(false));
    child.on('close', () => {
      cache.delete(site);
      void readToken(site).then((kept) => resolve(kept === token));
    });
    child.stdin.end(`add-generic-password -U -s "${SERVICE}" -a "${site}" -w "${token}"\n`);
  });
}

export function forgetToken(site: string): Promise<void> {
  cache.delete(site);
  return new Promise((resolve) => {
    execFile(SECURITY, ['delete-generic-password', '-s', SERVICE, '-a', site], () => resolve());
  });
}
