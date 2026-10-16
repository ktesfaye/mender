/**
 * Jira's REST API, over the one pipe the main process keeps open to the site
 * with its token, so nothing here ever holds a secret. Only what launching a
 * ticket needs: reading it, and moving it on.
 */

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Wire {
  api(site: string, method: Method, path: string, body?: unknown): Promise<unknown>;
}

export class JiraFailed extends Error {}

export type Category = 'new' | 'indeterminate' | 'done';

export interface RawIssue {
  key: string;
  fields: Record<string, unknown> & {
    summary?: string;
    description?: unknown;
    status?: { name?: string; statusCategory?: { key?: string } };
  };
}

export const categoryOf = (key: string | undefined): Category =>
  key === 'new' ? 'new' : key === 'done' ? 'done' : 'indeterminate';

export function makeJira(wire: Wire, site: string) {
  return {
    site,
    get: <T>(path: string) => wire.api(site, 'GET', path) as Promise<T>,
    send: <T>(method: Method, path: string, body?: unknown) =>
      wire.api(site, method, path, body) as Promise<T>,
  };
}
