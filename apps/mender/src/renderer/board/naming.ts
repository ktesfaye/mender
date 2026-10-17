import { rank, type Offer } from './offer';

/**
 * What an @ opens.
 *
 * Naming a file to whoever is working in there is the one thing you cannot do
 * by describing it: a path is either exactly right or it sends them looking
 * through the wrong folder. So an @ on the line you write on turns the lines
 * under it into what is actually in that checkout, narrowing as you type, and
 * picking one writes the whole path where the @ was.
 *
 * The same place as the slash and the same keys.
 */

/** The @ being written, if what is before the caret ends in one. */
const AT = /(?:^|\s)@(\S*)$/;

export class Naming {
  private found: string[] = [];
  /** What was last asked for, which is also whether an @ is open at all. */
  private asking: string | null = null;
  /** The line up to the caret, for where the @ is on it. */
  private asked = '';
  /** And whatever is written after the caret, kept when a path goes in. */
  private after = '';

  constructor(
    private readonly look: (like: string) => Promise<string[]>,
    private readonly told: () => void
  ) {}

  /** Whatever is on the line now. */
  typed(text: string, caret = text.length): void {
    this.asked = text.slice(0, caret);
    this.after = text.slice(caret);
    const written = AT.exec(this.asked)?.[1] ?? null;
    if (written === this.asking) return;
    this.asking = written;
    this.found = [];
    if (written === null) return;
    void this.look(written).then((found) => {
      // The checkout answers between keystrokes, and by the time it does the
      // question has often moved on. An answer to a question nobody is asking
      // any more is dropped rather than drawn.
      if (this.asking !== written) return;
      this.found = found;
      this.told();
    });
  }

  /** Whether an @ is open at all, which is what makes the keys mean this. */
  get open(): boolean {
    return this.asking !== null && this.found.length > 0;
  }

  /** Where on the line the @ that opened this is. */
  get from(): number {
    const found = AT.exec(this.asked);
    return found ? found.index + found[0].indexOf('@') : 0;
  }

  /**
   * What is in the checkout that answers to it. What it is called first, then
   * where it is, because a checkout is full of files with the same name in
   * different folders.
   */
  offers(): Offer[] {
    if (!this.open) return [];
    return rank(
      this.found.map((path) => {
        const cut = path.lastIndexOf('/');
        return {
          pick: `name:${path}`,
          name: cut === -1 ? path : path.slice(cut + 1),
          ...(cut === -1 ? {} : { about: path.slice(0, cut) }),
        };
      }),
      this.asking ?? '',
      { keepOrder: true }
    );
  }

  /** The line with a pressed one written into it, and where the caret goes. */
  named(pick: string): [string, number] | null {
    const path = pick.startsWith('name:') ? pick.slice(5) : '';
    const found = AT.exec(this.asked);
    if (!path || !found) return null;
    const head = `${this.asked.slice(0, found.index + found[0].length - (found[1] ?? '').length)}${path} `;
    return [head + this.after.replace(/^\s+/, ''), head.length];
  }
}
