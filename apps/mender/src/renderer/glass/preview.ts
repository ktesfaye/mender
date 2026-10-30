/**
 * What an option on a question would look like, drawn on the option itself.
 *
 * An agent asking which of several designs, animations or pages is wanted can
 * hang the thing on each answer. A picture is drawn; a film or an animated
 * picture plays, looping and silent; a page runs. Anything else it wrote is
 * left as the words it is.
 */

import { figure } from '../yard/pictures';

const MEDIA =
  /!\[([^\]]*)\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)|`?((?:file:\/\/|https?:\/\/)?\/?[^\s`()'"<>]+\.(?:png|jpe?g|webp|gif|apng|mp4|webm|mov|m4v|html?))`?/gi;
const PLAYED = /\.(gif|apng|mp4|webm|mov|m4v)$/i;
const PAGE = /\.html?$/i;

function fileUrl(path: string): string {
  if (/^(https?|file):\/\//.test(path)) return path;
  return `file://${path.split('/').map(encodeURIComponent).join('/')}`;
}

function inWebview(path: string, after: string): HTMLElement {
  const el = document.createElement('webview') as HTMLElement & {
    executeJavaScript(code: string): Promise<unknown>;
  };
  el.setAttribute('src', fileUrl(path));
  el.setAttribute('partition', 'mender-drafting');
  el.className = 'ga-prev-web';
  el.addEventListener('dom-ready', () => {
    void el.executeJavaScript(after).catch(() => undefined);
  });
  return el;
}

const PLAY = `
  document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden';
  document.querySelectorAll('video').forEach((v) => {
    v.loop = true; v.muted = true; v.controls = false;
    v.style.cssText = 'width:100%;height:100%;object-fit:contain;background:transparent';
    v.play().catch(() => {});
  });
  document.querySelectorAll('img').forEach((i) => {
    i.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:auto';
  });
`;

/** The look of one option, or nothing when what it carries is only words. */
export function previewOf(text: string): HTMLElement | null {
  const looks: HTMLElement[] = [];
  const seen = new Set<string>();
  for (const found of text.matchAll(MEDIA)) {
    const path = (found[2] ?? found[3] ?? '').trim();
    if (!path || seen.has(path) || !/^(file:\/\/|https?:\/\/|\/)/.test(path)) continue;
    seen.add(path);
    const holder = document.createElement('div');
    holder.className = 'ga-prev-one';
    if (PAGE.test(path)) holder.appendChild(inWebview(path, ''));
    else if (PLAYED.test(path)) holder.appendChild(inWebview(path, PLAY));
    else holder.appendChild(figure({ name: found[1] ?? '', url: path }));
    looks.push(holder);
  }
  if (!looks.length) return null;
  const it = document.createElement('div');
  it.className = 'ga-prev';
  it.append(...looks);
  return it;
}
