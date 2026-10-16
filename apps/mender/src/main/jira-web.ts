import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { app, session, shell, type WebContents } from 'electron';
import { JIRA_PARTITION } from '../shared/jira';
import { readToken } from './jira-keychain';

/**
 * Jira's own site, in the village's own window.
 *
 * The board is real Jira in a `<webview>` on a partition of its own, and it
 * is signed in with the same API token the windmill already holds: every
 * request to a connected site goes out with that token, so there is no second
 * sign-in to do and no single sign-on page that might refuse an embedded
 * browser. The token never reaches the page; it is added here, on the way out.
 *
 * Anything that would take the page somewhere other than Jira opens in the
 * machine's own browser instead of wandering off inside the village.
 */
export function installJiraWeb(): void {
  const store = createJsonFileKeyValueStore({
    path: join(process.env.MENDER_DATA_DIR ?? app.getPath('userData'), 'jira.json'),
  });
  const ses = session.fromPartition(JIRA_PARTITION);
  /* Jira serves an embedded Electron a lesser page than it serves Chrome. */
  ses.setUserAgent(
    ses
      .getUserAgent()
      .replace(/ Electron\/\S+/, '')
      .replace(/ \S+?\/\d+\.\d+\.\d+(?= Chrome)/, '')
  );

  const auth = new Map<string, { value: string | undefined; at: number }>();
  const authOf = async (site: string): Promise<string | undefined> => {
    const known = auth.get(site);
    if (known && Date.now() - known.at < 30_000) return known.value;
    const loaded = await store.get('jira');
    const sites =
      loaded.success && loaded.data && typeof loaded.data === 'object'
        ? ((loaded.data as { sites?: { site: string; email: string }[] }).sites ?? [])
        : [];
    const one = sites.find((each) => each.site === site);
    const token = one ? await readToken(site) : undefined;
    const value =
      one && token ? `Basic ${Buffer.from(`${one.email}:${token}`).toString('base64')}` : undefined;
    auth.set(site, { value, at: Date.now() });
    return value;
  };

  ses.webRequest.onBeforeSendHeaders({ urls: ['https://*.atlassian.net/*'] }, (details, done) => {
    const headers = details.requestHeaders;
    if (headers.Authorization?.startsWith('Bearer ')) return done({ requestHeaders: headers });
    void authOf(new URL(details.url).host).then(
      (value) => done({ requestHeaders: value ? { ...headers, Authorization: value } : headers }),
      () => done({ requestHeaders: headers })
    );
  });

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return;
    /* Which partition a guest is on is only settled once it is attached. */
    contents.once('did-start-loading', () => {
      if (contents.session === ses) keepInJira(contents);
    });
  });
}

const atlassian = (url: string): boolean => {
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'https:' && /(^|\.)atlassian\.(net|com)$/.test(host);
  } catch {
    return false;
  }
};

function keepInJira(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    const here = new URL(contents.getURL()).host;
    if (url.startsWith(`https://${here}/`)) void contents.loadURL(url);
    else if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (atlassian(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
}
