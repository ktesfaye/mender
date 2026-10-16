import { join } from 'node:path';
import { createJsonFileKeyValueStore } from '@emdash/core/primitives/kv/node';
import { app, session, shell, type WebContents } from 'electron';
import { JIRA_PARTITION } from '../shared/jira';
import { readToken } from './jira-keychain';

/**
 * Jira's own site, in the village's own window.
 *
 * The board is real Jira in a `<webview>` on a partition of its own, and it
 * is signed in with the same API token the windmill already holds wherever
 * Jira takes it: every request to a connected site goes out with that token,
 * so there is no second sign-in to do. A site that refuses tokens signs in
 * the ordinary way instead, its whole sign-in flow kept in here. The token
 * never reaches the page; it is added here, on the way out.
 *
 * A link off Jira opens in the machine's own browser instead of wandering off
 * inside the village; a sign-in step never does.
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
    if (known && Date.now() - known.at < 5 * 60_000) return known.value;
    const loaded = await store.get('jira');
    const sites =
      loaded.success && loaded.data && typeof loaded.data === 'object'
        ? ((loaded.data as { sites?: { site: string; email: string }[] }).sites ?? [])
        : [];
    const one = sites.find((each) => each.site === site);
    const token = one ? await readToken(site) : undefined;
    let value =
      one && token ? `Basic ${Buffer.from(`${one.email}:${token}`).toString('base64')}` : undefined;
    /* Only a token Jira actually takes is put on the page's requests. A work
       site can refuse API tokens outright, and stamping a refused one on
       every request fails the sign-in page's own last step too, so then the
       page is left to sign in the ordinary way. */
    if (value) {
      const ok = await fetch(`https://${site}/rest/api/3/myself`, {
        headers: { Authorization: value, Accept: 'application/json' },
      }).then(
        (response) => response.ok,
        () => null
      );
      if (ok === false) value = undefined;
    }
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

const jiraSite = (url: string): boolean => {
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'https:' && /\.atlassian\.net$/.test(host) && host !== 'id.atlassian.net';
  } catch {
    return false;
  }
};

/* A work site signs in through whatever the company uses, Okta, Microsoft,
   Google, a SAML page of its own, and the last step lands back on Atlassian
   with the session cookie. Every step of that has to happen in here, in
   this partition, or the cookie lands in some other browser and the board
   never gets it: so a page that is mid sign-in is never sent anywhere else. */
const signingIn = (url: string): boolean =>
  /(^|\.)(id|auth)\.atlassian\.com$|okta|onelogin|duosecurity|microsoftonline|login\.live|accounts\.google|pingidentity|pingone|jumpcloud|auth0|sso|saml|oauth|login|signin|authorize/i.test(
    (() => {
      try {
        const { host, pathname } = new URL(url);
        return host + pathname;
      } catch {
        return '';
      }
    })()
  );

function keepInJira(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (!/^https?:/.test(url)) return { action: 'deny' };
    const here = contents.getURL();
    const site = (() => {
      try {
        return new URL(here).host;
      } catch {
        return '';
      }
    })();
    if (url.startsWith(`https://${site}/`) && jiraSite(here)) {
      void contents.loadURL(url);
      return { action: 'deny' };
    }
    /* A sign-in popup opens as a small window of its own on the same
       partition, so whatever it signs in to is what the board then uses. */
    if (!jiraSite(here) || signingIn(url))
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 700,
          autoHideMenuBar: true,
          webPreferences: { partition: JIRA_PARTITION },
        },
      };
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('did-create-window', (popup) => keepInJira(popup.webContents));
  /* Following a link within the page stays here, sign-in pages included;
     only something that is not a web page at all goes to the machine. */
  contents.on('will-navigate', (event, url) => {
    if (/^https?:/.test(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
}
