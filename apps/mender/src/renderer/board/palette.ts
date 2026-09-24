import type { Choice, Kit } from '@shared/agents';
import type { Row } from './row';

/**
 * What a slash opens.
 *
 * The last line of the board is where you write, and writing a slash there
 * turns the lines under it into everything you could mean. Most of it is the
 * agent's own: whatever its CLI advertises when it starts, which on Claude is
 * its commands and the skills it has been taught. A handful are the village's
 * and never reach the agent as words — picking a model is a setting on the
 * session, not a sentence, so it is done to the session directly.
 *
 * Nothing here is a menu that floats. It is more writing on the same wood,
 * under the line you are writing on, and it goes away when the slash does.
 */

/** What picking a line here means. */
export type Meant =
  /** Set one of the session's own settings, without saying a word to it. */
  | { does: 'set'; what: 'model' | 'mode' | 'effort'; id: string; name: string }
  /** Turn the board over and show what the session works with. */
  | { does: 'card' }
  /** Put this on the line instead, and keep writing. */
  | { does: 'write'; text: string }
  /** Say it to the agent as it stands. */
  | { does: 'send' };

/** One of the village's own, which the agent never hears about. */
type Ours = {
  name: string;
  about: string;
  /** The choices it is answered with, or nothing if it is answered by doing it. */
  choices?: (kit: Kit) => Choice[];
  on?: (kit: Kit) => string | null;
  what?: 'model' | 'mode' | 'effort';
};

const OURS: Ours[] = [
  {
    name: '/model',
    about: 'what it thinks with',
    what: 'model',
    choices: (kit) => kit.models,
    on: (kit) => kit.model,
  },
  {
    name: '/mode',
    about: 'how it works',
    what: 'mode',
    choices: (kit) => kit.modes,
    on: (kit) => kit.mode,
  },
  {
    name: '/effort',
    about: 'how hard it thinks',
    what: 'effort',
    choices: (kit) => kit.efforts,
    on: (kit) => kit.effort,
  },
  { name: '/agent', about: 'everything this session works with' },
];

/** As many as the wood shows at once before it starts scrolling itself. */
const SHOWN = 8;

/** The one you are on, and the ones you are not. */
const HERE = '>';
const ON = '●';

/**
 * As much of what a command says about itself as is worth a line.
 *
 * An agent's own catalogue is written for another program to read: a skill
 * will happily describe itself in two hundred words. What the line under the
 * one you are writing on needs is enough to tell two of them apart, so it is
 * cut at the first sentence and then at a width, and nothing is lost that was
 * not already unreadable at a glance.
 */
function hint(about: string): string {
  const first = about.split(/(?<=[.!?])\s/)[0] ?? about;
  const said = first.replace(/\s+/g, ' ').trim();
  return said.length > 92 ? `${said.slice(0, 91)}…` : said;
}

export class Palette {
  private kit: Kit | null = null;
  private text = '';
  private at = 0;

  told(kit: Kit | null): void {
    this.kit = kit;
    this.at = Math.min(this.at, Math.max(0, this.matches().length - 1));
  }

  /** Whatever is on the line now. */
  typed(text: string): void {
    const was = this.text;
    this.text = text;
    if (head(was) !== head(text)) this.at = 0;
    this.at = Math.min(this.at, Math.max(0, this.matches().length - 1));
  }

  /** Whether a slash is open at all, which is what makes the keys mean this. */
  get open(): boolean {
    return this.text.startsWith('/') && this.matches().length > 0;
  }

  moved(by: number): void {
    const many = this.matches().length;
    if (!many) return;
    this.at = (this.at + by + many) % many;
  }

  /** The lines under the one you are writing on. */
  rows(): Row[] {
    const all = this.matches();
    if (!all.length) return [];
    const from = Math.max(0, Math.min(this.at - SHOWN + 1, all.length - SHOWN));
    const rows: Row[] = [];
    for (const [index, match] of all.slice(from, from + SHOWN).entries()) {
      const here = from + index === this.at;
      rows.push({
        kind: 'entry',
        mark: here ? HERE : match.on ? ON : ' ',
        text: match.about ? `${match.name} · ${hint(match.about)}` : match.name,
        tone: here ? 'ink' : 'faded',
        pick: `slash:${match.name}`,
      });
    }
    if (all.length > SHOWN) {
      rows.push({ kind: 'line', text: `and ${all.length - SHOWN} more.`, tone: 'faded' });
    }
    return rows;
  }

  /** What the highlighted line means, or nothing if there is no slash open. */
  chosen(): Meant | null {
    return this.meaning(this.matches()[this.at]);
  }

  /** What a pressed line means. */
  meant(pick: string): Meant | null {
    return this.meaning(this.matches().find((match) => `slash:${match.name}` === pick));
  }

  private meaning(match: Match | undefined): Meant | null {
    if (!match) return null;
    if (match.kind === 'card') return { does: 'card' };
    if (match.kind === 'choice' && match.what) {
      return { does: 'set', what: match.what, id: match.id ?? match.name, name: match.name };
    }
    // A command that wants something after it is completed, not sent: the
    // next thing you type is the argument.
    return { does: 'write', text: match.takes ? `${match.name} ` : match.name };
  }

  /** Everything the slash could mean as it stands. */
  private matches(): Match[] {
    const kit = this.kit;
    if (!this.text.startsWith('/') || !kit) return [];
    const written = head(this.text);
    const rest = this.text.slice(written.length).replace(/^ +/, '');
    const spaced = this.text.length > written.length;

    if (spaced) {
      const ours = OURS.find((each) => each.name === written);
      if (!ours?.choices) return [];
      const on = ours.on?.(kit) ?? null;
      return ours
        .choices(kit)
        .filter((choice) => starts(choice.name, rest) || starts(choice.id, rest))
        .map((choice) => ({
          kind: 'choice' as const,
          name: choice.name,
          id: choice.id,
          ...(choice.about ? { about: choice.about } : {}),
          ...(ours.what ? { what: ours.what } : {}),
          on: choice.id === on,
        }));
    }

    const mine: Match[] = OURS.filter((ours) => !ours.choices || ours.choices(kit).length)
      .filter((ours) => starts(ours.name, written))
      .map((ours) => ({
        kind: ours.choices ? ('ours' as const) : ('card' as const),
        name: ours.name,
        about: ours.about,
        ...(ours.choices ? { takes: 'which' } : {}),
        ...(ours.what ? { what: ours.what } : {}),
      }));
    const theirs: Match[] = kit.orders
      .filter((order) => starts(slashed(order.name), written))
      .filter((order) => !mine.some((each) => each.name === slashed(order.name)))
      .map((order) => ({
        kind: 'order' as const,
        name: slashed(order.name),
        about: order.about,
        ...(order.takes ? { takes: order.takes } : {}),
      }));
    /* What you have written in full is what you meant. `/mode` is a prefix of
       `/model`, so without this, typing the whole of the shorter one and
       pressing return silently picked the longer. */
    return [...mine, ...theirs].sort(
      (a, b) => Number(same(b.name, written)) - Number(same(a.name, written))
    );
  }
}

type Match = {
  kind: 'ours' | 'card' | 'order' | 'choice';
  name: string;
  id?: string;
  about?: string;
  takes?: string;
  what?: 'model' | 'mode' | 'effort';
  on?: boolean;
};

/** The command itself, without whatever is being written after it. */
function head(text: string): string {
  const space = text.indexOf(' ');
  return space === -1 ? text : text.slice(0, space);
}

function slashed(name: string): string {
  return name.startsWith('/') ? name : `/${name}`;
}

function starts(name: string, written: string): boolean {
  return name.toLowerCase().startsWith(written.toLowerCase());
}

function same(name: string, written: string): boolean {
  return name.toLowerCase() === written.toLowerCase();
}
