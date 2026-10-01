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

export interface Picture {
  name: string;
  url: string;
}

type Local = (path: string, width: number) => Promise<string | null>;

let local: Local | undefined;
/** A picture on this machine, once read, by its path. */
const read = new Map<string, Promise<string | null>>();
/** Pictures already seen load, so writing the answer again as it streams does not blink them. */
const loaded = new Set<string>();

/** How a picture on this machine is read, seeded once at boot. */
export function seedLocalPictures(to: Local): void {
  local = to;
}

const IMAGE =
  /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|((?:https?:\/\/|file:\/\/|\/)[^)\s]+))(?:\s+"[^"]*")?\s*\)/g;

/** The writing with its pictures lifted out of it, and the pictures. */
export function pictured(text: string): { text: string; pictures: Picture[] } {
  const pictures: Picture[] = [];
  const rest = text.replace(IMAGE, (_, name: string, bracketed?: string, bare?: string) => {
    const url = (bracketed ?? bare ?? '').trim();
    if (!/^(https?:\/\/|file:\/\/|\/)/.test(url)) return _;
    pictures.push({ name: name.replace(/[*_`]/g, '').trim(), url });
    return '';
  });
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

function figure(one: Picture): HTMLElement {
  const it = document.createElement('figure');
  it.className = 'prose-picture';
  const seen = loaded.has(one.url);
  it.hidden = !seen;
  if (!seen) it.classList.add('prose-picture-new');
  const picture = document.createElement('img');
  picture.alt = one.name;
  picture.draggable = false;
  picture.referrerPolicy = 'no-referrer';
  picture.addEventListener(
    'load',
    () => {
      loaded.add(one.url);
      it.hidden = false;
    },
    { once: true }
  );
  picture.addEventListener('error', () => it.remove(), { once: true });
  if (/^https?:\/\//.test(one.url)) picture.src = one.url;
  else {
    void onThisMachine(one.url).then((src) => {
      if (src) picture.src = src;
      else it.remove();
    });
  }
  it.appendChild(picture);
  if (one.name) {
    const said = document.createElement('figcaption');
    said.textContent = one.name;
    it.appendChild(said);
  }
  return it;
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
