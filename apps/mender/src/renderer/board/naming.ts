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

/** The @ being written, if the line ends in one. */
const AT = /(?:^|\s)@(\S*)$/;

export class Naming {
  private found: string[] = [];
  /** What was last asked for, which is also whether an @ is open at all. */
  private asking: string | null = null;
  /** The whole line, for where the @ is on it. */
  private asked = '';

  constructor(
    private readonly look: (like: string) => Promise<string[]>,
    private readonly told: () => void
  ) {}

  /** Whatever is on the line now. */
  typed(text: string): void {
    this.asked = text;
    const written = AT.exec(text)?.[1] ?? null;
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
