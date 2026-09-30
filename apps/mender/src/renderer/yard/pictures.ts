/**
 * A picture an agent put in what it said, drawn where it put it.
 *
 * Markdown says a picture as `![what it is](where it is)`, and an answer
 * about somewhere to eat is worth a great deal more with a look at the place
 * than with its address spelled out. So a picture is lifted out of the line it
 * was written in and set under it, several in a row together, each with what
 * the agent called it underneath. One that will not load is simply not there:
 * a broken frame says less than nothing.
 */

export interface Picture {
  name: string;
  url: string;
}

/** Pictures already seen load, so writing the answer again as it streams does not blink them. */
const loaded = new Set<string>();

const IMAGE = /!\[([^\]]*)\]\(<?(https?:\/\/[^)\s>]+)>?(?:\s+"[^"]*")?\)/g;

/** The writing with its pictures lifted out of it, and the pictures. */
export function pictured(text: string): { text: string; pictures: Picture[] } {
  const pictures: Picture[] = [];
  const rest = text.replace(IMAGE, (_, name: string, url: string) => {
    pictures.push({ name: name.replace(/[*_`]/g, '').trim(), url });
    return '';
  });
  return pictures.length
    ? { text: rest.replace(/\s{2,}/g, ' ').trim(), pictures }
    : { text, pictures };
}

/** A row of pictures, or pictures added to the row that came just before. */
export function hangPictures(into: HTMLElement, pictures: readonly Picture[]): void {
  if (!pictures.length) return;
  const last = into.lastElementChild;
  const row =
    last instanceof HTMLElement && last.classList.contains('prose-pictures')
      ? last
      : into.appendChild(
          Object.assign(document.createElement('div'), { className: 'prose-pictures' })
        );
  for (const one of pictures) {
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
    picture.src = one.url;
    it.appendChild(picture);
    if (one.name) {
      const said = document.createElement('figcaption');
      said.textContent = one.name;
      it.appendChild(said);
    }
    row.appendChild(it);
  }
}
