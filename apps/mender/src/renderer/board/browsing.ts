import type { Row } from './row';

/**
 * A browser, on the wood.
 *
 * A board, not a pane: the address line is written the same way everything
 * else in this app is written, on the one line at the foot of the screen, and
 * the page itself is mounted beside the rows the way a real terminal is —
 * this app's own webview rather than a panel propped open beside the yard.
 *
 * Thin on purpose, for a first cut: no history, no profiles, no DevTools.
 * "Show me the page next to my session" is the whole job.
 */

export interface Browsing {
  /** What is actually loaded. */
  url: string;
  /** What is being typed on the line, while it differs from what is loaded. */
  written: string;
}

export function browsing(state: Browsing): Row[] {
  const rows: Row[] = [
    { kind: 'title', text: 'browser' },
    { kind: 'line', text: state.written, tone: 'quoted', keep: 'tail' },
  ];
  if (!safe(state.written)) {
    rows.push({ kind: 'gap' }, { kind: 'line', text: onlyLocal, tone: 'faded' });
  }
  return rows;
}

/** Only a page this machine is already running is opened here — never the
    open web, which this board has no chrome for (no history, no cookies UI,
    nothing to keep a stranger's page from asking for either). */
export function safe(url: string): boolean {
  try {
    const at = new URL(url);
    return (
      (at.protocol === 'http:' || at.protocol === 'https:') &&
      (at.hostname === 'localhost' || at.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

const onlyLocal = 'only a page already running on this machine opens here.';

/** The page itself, mounted once and left alone. */
export function openPage(url: string): HTMLElement {
  const el = document.createElement('webview') as HTMLElement & { src: string };
  el.setAttribute('src', safe(url) ? url : 'about:blank');
  el.style.cssText = 'width:100%;height:100%;display:block;background:#1b1207';
  /* No node integration, no preload, no persistence beyond this run: the page
     is somebody else's dev server, not this app. */
  el.setAttribute('partition', 'mender-browser');
  return el;
}
