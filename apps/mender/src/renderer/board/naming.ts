import type { Row } from './board';

/**
 * What an @ opens.
 *
 * Naming a file to whoever is working in there is the one thing you cannot do
 * by describing it: a path is either exactly right or it sends them looking
 * through the wrong folder. So an @ on the line you write on turns the lines
 * under it into what is actually in that checkout, narrowing as you type, and
 * picking one writes the whole path where the @ was.
 *
 * The same wood as the slash and the same keys. Nothing floats.
 */

/** As many as the wood shows at once. */
const SHOWN = 8;

/** The one you are on. */
const HERE = '>';

/** The @ being written, if the line ends in one. */
const AT = /(?:^|\s)@(\S*)$/;

/** A path as it is read: its name first, then the folder it is in. */
function said(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : `${path.slice(cut + 1)} · ${path.slice(0, cut)}`;
}

export class Naming {
  private found: string[] = [];
  private at = 0;
  /** What was last asked for, which is also whether an @ is open at all. */
  private asking: string | null = null;

  constructor(
    private readonly look: (like: string) => Promise<string[]>,
    private readonly told: () => void
  ) {}

  /** Whatever is on the line now. */
  typed(text: string): void {
    const written = AT.exec(text)?.[1] ?? null;
    if (written === this.asking) return;
    this.asking = written;
    this.at = 0;
    this.found = [];
    if (written === null) return;
    void this.look(written).then((found) => {
      // The checkout answers between keystrokes, and by the time it does the
      // question has often moved on. An answer to a question nobody is asking
      // any more is dropped rather than drawn.
      if (this.asking !== written) return;
      this.found = found;
      this.at = 0;
      this.told();
    });
  }

  /** Whether an @ is open at all, which is what makes the keys mean this. */
  get open(): boolean {
    return this.asking !== null && this.found.length > 0;
  }

  moved(by: number): void {
    const many = this.found.length;
    if (!many) return;
    this.at = (this.at + by + many) % many;
  }

  /** The lines under the one you are writing on. */
  rows(): Row[] {
    if (!this.open) return [];
    const from = Math.max(0, Math.min(this.at - SHOWN + 1, this.found.length - SHOWN));
    const rows: Row[] = [];
    for (const [index, path] of this.found.slice(from, from + SHOWN).entries()) {
      const here = from + index === this.at;
      rows.push({
        kind: 'entry',
        mark: here ? HERE : ' ',
        /* What it is called, and then where it is. A checkout is full of files
           with the same name in different folders, and written whole they all
           truncate to the same middle of the same path. */
        text: said(path),
        tone: here ? 'ink' : 'faded',
        keep: 'front',
        pick: `name:${path}`,
      });
    }
    if (this.found.length > SHOWN) {
      rows.push({ kind: 'line', text: `and ${this.found.length - SHOWN} more.`, tone: 'faded' });
    }
    return rows;
  }

  /** The line with whatever you are standing on written into it. */
  chosen(text: string): string | null {
    return this.open ? this.written(text, this.found[this.at]) : null;
  }

  /** The line with a pressed one written into it. */
  named(text: string, pick: string): string | null {
    if (!pick.startsWith('name:')) return null;
    return this.written(text, pick.slice(5));
  }

  private written(text: string, path: string | undefined): string | null {
    if (!path) return null;
    const found = AT.exec(text);
    if (!found) return null;
    return `${text.slice(0, found.index + found[0].length - (found[1] ?? '').length)}${path} `;
  }
}
