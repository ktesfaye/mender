/**
 * A picture an agent put in what it said, drawn where it put it.
 *
 * Markdown says a picture as `![what it is](where it is)`, and an answer
 * about somewhere to eat, a pair of headphones or a species of bird is worth
 * a great deal more with a look at the thing than with a description of it.
 * So a picture goes where the agent wrote it: one written into a paragraph or
 * a list item stands beside that writing, the way a listing puts the photo
 * next to what it is a photo of, and pictures on lines of their own stand
 * where they were written, several in a row together. Each has what the agent
 * called it underneath. It may be on the web or on this machine, since an
 * agent that made a chart or saved a photo has only a path to give. One that
 * will not load is simply not there: a broken frame says less than nothing.
 */

import { holdUp } from './picture-view';

export interface Picture {
  name: string;
  url: string;
  /** Where pressing it goes, when the agent wrapped it in a link: a cover that opens its book's page. */
  href?: string;
}

type Local = (path: string, width: number) => Promise<string | null>;

let local: Local | undefined;
/** A picture on this machine, once read, by its path. */
const read = new Map<string, Promise<string | null>>();
/**
 * Pictures already loaded, kept whole. The board is written again every time
 * anything on it changes, and a fresh `<img>` has no height until it has
 * decoded, so everything under it would jump up and slide back down. The one
 * already decoded is moved into the new writing instead.
 */
const loaded = new Map<string, HTMLImageElement>();

/** How a picture on this machine is read, seeded once at boot. */
export function seedLocalPictures(to: Local): void {
  local = to;
}

/** `![name](url)`, or the same wrapped in a link as `[![name](url)](href)`. */
const IMAGE =
  /(\[\s*)?!\[([^\]]*)\]\(\s*(?:<([^>]+)>|((?:https?:\/\/|file:\/\/|\/)[^)\s]+))(?:\s+"[^"]*")?\s*\)(?:\s*\]\(\s*(https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\s*\))?/g;

/** The writing with its pictures lifted out of it, and the pictures. */
export function pictured(text: string): { text: string; pictures: Picture[] } {
  const pictures: Picture[] = [];
  const rest = text.replace(
    IMAGE,
    (
      whole: string,
      opened: string | undefined,
      name: string,
      bracketed?: string,
      bare?: string,
      href?: string
    ) => {
      const url = (bracketed ?? bare ?? '').trim();
      if (!/^(https?:\/\/|file:\/\/|\/)/.test(url)) return whole;
      const one: Picture = { name: name.replace(/[*_`]/g, '').trim(), url };
      if (opened && href) one.href = href;
      pictures.push(one);
      /* A `[` with no link after it was never the picture's, so it stays. */
      return opened && !href ? opened : '';
    }
  );
  return pictures.length
    ? { text: rest.replace(/\s{2,}/g, ' ').trim(), pictures }
    : { text, pictures };
}

/**
 * Pictures on lines of their own. Right under a paragraph or a list entry
 * they are that writing's own, the way a photo under a listing is of what it
 * lists, so a picture or two goes up beside it; more than that is a gallery
 * and stands as a row. Anywhere else they are a row, or join the row above.
 */
export function hangPictures(into: HTMLElement, pictures: readonly Picture[]): void {
  if (!pictures.length) return;
  const last = into.lastElementChild;
  const side = last?.querySelector(
    ':scope > .prose-beside-pictures, :scope > .prose-beside > .prose-beside-pictures'
  );
  if (side && side.childElementCount + pictures.length <= 2) {
    for (const one of pictures) side.appendChild(figure(one));
    return;
  }
  if (last instanceof HTMLElement && pictures.length <= 2) {
    if (last.classList.contains('prose-para')) {
      standBeside(last, pictures);
      return;
    }
    const words = last.classList.contains('prose-item') ? last.lastElementChild : null;
    if (words instanceof HTMLElement && !words.classList.contains('prose-beside')) {
      standBeside(words, pictures);
      return;
    }
  }
  const row =
    last instanceof HTMLElement && last.classList.contains('prose-pictures')
      ? last
      : into.appendChild(
          Object.assign(document.createElement('div'), { className: 'prose-pictures' })
        );
  for (const one of pictures) row.appendChild(figure(one));
}

/** Put pictures beside writing already on the board, where it stands. */
function standBeside(writing: HTMLElement, pictures: readonly Picture[]): void {
  const parent = writing.parentElement;
  const next = writing.nextSibling;
  if (parent) parent.insertBefore(beside(writing, pictures), next);
}

/** Writing with its own pictures standing beside it. */
export function beside(writing: HTMLElement, pictures: readonly Picture[]): HTMLElement {
  const it = document.createElement('div');
  it.className = 'prose-beside';
  writing.classList.add('prose-beside-words');
  const side = document.createElement('div');
  side.className = 'prose-beside-pictures';
  for (const one of pictures) side.appendChild(figure(one));
  it.append(writing, side);
  return it;
}

/** One picture with what it was called under it, for wherever it is to stand. */
export function figure(one: Picture): HTMLElement {
  const it = document.createElement('figure');
  it.className = 'prose-picture';
  /* A linked one is an anchor round the picture, so pressing it is the same
     press any link in the answer is, heard one level up. */
  const holder = one.href
    ? Object.assign(document.createElement('a'), { className: 'prose-picture-link', href: one.href })
    : it;
  if (holder !== it) {
    holder.addEventListener('click', (event) => event.preventDefault());
    it.appendChild(holder);
  }
  const kept = loaded.get(one.url);
  if (kept && !kept.isConnected) {
    kept.alt = one.name;
    holder.appendChild(kept);
  } else {
    it.hidden = !kept;
    if (!kept) it.classList.add('prose-picture-new');
    holder.appendChild(image(one, it));
  }
  if (one.name) {
    const said = document.createElement('figcaption');
    said.textContent = one.name;
    it.appendChild(said);
  }
  return it;
}

function image(one: Picture, it: HTMLElement): HTMLImageElement {
  const picture = document.createElement('img');
  picture.alt = one.name;
  picture.draggable = false;
  picture.referrerPolicy = 'no-referrer';
  picture.addEventListener(
    'load',
    () => {
      if (!loaded.get(one.url)?.isConnected) loaded.set(one.url, picture);
      it.hidden = false;
    },
    { once: true }
  );
  picture.addEventListener('error', () => it.remove(), { once: true });
  /* Pressed, it is held up big; dragged across, it is part of a selection. */
  let from = { x: 0, y: 0 };
  picture.addEventListener('pointerdown', (event) => {
    from = { x: event.clientX, y: event.clientY };
  });
  picture.addEventListener('click', (event) => {
    if (event.button !== 0 || !picture.currentSrc || picture.closest('a')) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4) return;
    event.stopPropagation();
    holdUp(picture.currentSrc, picture.alt, larger(one.url));
  });
  if (/^https?:\/\//.test(one.url)) picture.src = one.url;
  else {
    void onThisMachine(one.url).then((src) => {
      if (src) picture.src = src;
      else it.remove();
    });
  }
  return picture;
}

/** A picture on this machine, read once, as something an `<img>` can draw. */
export function onThisMachine(url: string): Promise<string | null> {
  let path = url;
  if (path.startsWith('file://')) {
    try {
      path = decodeURIComponent(new URL(path).pathname);
    } catch {
      return Promise.resolve(null);
    }
  }
  let one = read.get(path);
  if (!one) {
    one = local ? local(path, 1280).catch(() => null) : Promise.resolve(null);
    read.set(path, one);
  }
  return one;
}

/** A picture on this machine read again at a size worth holding up, or nothing for one on the web. */
function larger(url: string): Promise<string | null> | undefined {
  if (/^https?:\/\//.test(url) || !local) return undefined;
  let path = url;
  if (path.startsWith('file://')) {
    try {
      path = decodeURIComponent(new URL(path).pathname);
    } catch {
      return undefined;
    }
  }
  return local(path, 3200).catch(() => null);
}
