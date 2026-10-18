import type { Choice, Kit } from '@shared/agents';
import type { Prompt } from '@shared/prompts';
import { rank, type Offer } from './offer';

/**
 * What a slash opens.
 *
 * The last line of the board is where you write, and writing a slash there
 * opens everything you could mean, right where you are writing it. Most of it
 * is the agent's own: whatever its CLI advertises when it starts, which on
 * Claude is its commands and every skill it has been taught. Then whatever you
 * have kept to say again, which is what Emdash calls its prompt library. And a
 * handful are the village's and never reach the agent as words — picking a
 * model is a setting on the session, not a sentence, so it is done to the
 * session directly.
 *
 * A slash at the start of the line opens all of it. A slash later in a
 * sentence opens only the agent's and yours, because a setting is not
 * something you say halfway through a thought.
 */

/** What picking a line here means. */
export type Meant =
  /** Set one of the session's own settings, without saying a word to it. */
  | {
      does: 'set';
      what: 'model' | 'mode' | 'effort' | 'collab' | 'defaultModel' | 'defaultEffort';
      id: string;
      name: string;
      /** The sentence the slash was written into, which stays on the line. */
      keep?: { text: string; caret: number };
    }
  /** Turn the board over and show what the session works with. */
  | { does: 'card' }
  /** Cut a fresh session here and turn straight to its own past terminal
      history, the same door the empty hook's own naming board opens. */
  | { does: 'resume' }
  /** Put this on the line instead, and keep writing from `caret`. */
  | { does: 'write'; text: string; caret?: number }
  /** Say it to the agent as it stands. */
  | { does: 'send'; text: string }
  /** Keep this, to say again. */
  | { does: 'keep'; text: string }
  /** Stop keeping one. */
  | { does: 'forget'; id: string; title: string };

type Setting = 'model' | 'mode' | 'effort' | 'collab' | 'defaultModel' | 'defaultEffort';

/** One of the village's own, which the agent never hears about. */
type Ours = {
  name: string;
  about: string;
  /** The choices it is answered with, or nothing if it is answered by doing it. */
  choices?: (kit: Kit) => Choice[];
  on?: (kit: Kit) => string | null;
  /** Which of its choices new sessions start on, marked in the list. */
  starts?: (kit: Kit) => string | null;
  what?: Setting;
  /** Answered by what is written after it rather than by a choice. */
  takes?: string;
  /** Only there while this is true of the session and the list. */
  when?: (kit: Kit, kept: readonly Prompt[]) => boolean;
};

const OURS: Ours[] = [
  {
    name: '/model',
    about: 'what it thinks with, in this session only',
    what: 'model',
    choices: (kit) => kit.models,
    on: (kit) => kit.model,
    starts: (kit) => kit.defaultModel,
  },
  {
    name: '/default-model',
    about: 'what every new session starts thinking with',
    what: 'defaultModel',
    choices: (kit) => kit.models,
    on: (kit) => kit.defaultModel,
  },
  {
    name: '/mode',
    about: 'how it works, and what it asks first',
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
    starts: (kit) => kit.defaultEffort,
  },
  {
    name: '/default-effort',
    about: 'how hard every new session starts thinking',
    what: 'defaultEffort',
    choices: (kit) => kit.efforts,
    on: (kit) => kit.defaultEffort,
  },
  {
    name: '/collaboration',
    about: 'whether it plans first or just gets on with it',
    what: 'collab',
    choices: (kit) => kit.collabs,
    on: (kit) => kit.collab,
  },
  { name: '/agent', about: 'everything this session works with' },
  { name: '/resume', about: 'pick up one of its own past terminal sessions, in a new one' },
  { name: '/keep', about: 'keep what you write after it, to say again', takes: 'what to keep' },
  {
    name: '/forget',
    about: 'stop keeping something you kept',
    choices: () => [],
    when: (_kit, kept) => kept.length > 0,
  },
];

const SECTION = {
  ours: 'settings',
  theirs: 'commands',
  kept: 'kept',
  written: 'as you wrote it',
} as const;

/** Everything you have kept, for every session at once. */
let kept: Prompt[] = [];

/** What is kept changed, somewhere. */
export function keptNow(prompts: Prompt[]): void {
  kept = prompts;
}

/** The slash being written after something else, if what is before the caret ends in one. */
const LATER = /(^|\s)(\/\S*)$/;

/** What is open, if anything: which kind, where it starts, and what is being asked. */
type Open =
  | { kind: 'all'; from: number; asked: string }
  | { kind: 'later'; from: number; asked: string }
  | { kind: 'choice'; ours: Ours; from: number; asked: string }
  | { kind: 'keep'; from: number; asked: string };

export class Palette {
  private kit: Kit | null = null;
  private text = '';
  /** The line up to the caret, which is what a slash is read off. */
  private head = '';
  /** And whatever is written after the caret, kept when a command goes in. */
  private tail = '';
  /** Forgetting takes two presses, and this is the first. */
  private armed: string | null = null;

  told(kit: Kit | null): void {
    this.kit = kit;
  }

  /** Whether the agent behind the list is up, so what it lists is current. */
  get awake(): boolean {
    return this.kit?.awake ?? false;
  }

  /** Whatever is on the line now. */
  typed(text: string, caret = text.length): void {
    if (text !== this.text) this.armed = null;
    this.text = text;
    this.head = text.slice(0, caret);
    this.tail = text.slice(caret);
  }

  /** Whether a slash is open at all, which is what makes the keys mean this. */
  get open(): boolean {
    return this.offers().length > 0;
  }

  /** Where on the line the slash that opened this is. */
  get from(): number {
    return this.opened()?.from ?? 0;
  }

  /** Everything the slash could mean as it stands, best first. */
  offers(): Offer[] {
    const kit = this.kit;
    const open = this.opened();
    if (!kit || !open) return [];

    if (open.kind === 'keep') {
      const what = open.asked.trim();
      return [
        {
          pick: 'slash:keep',
          name: what ? `keep “${clip(what, 48)}”` : '/keep',
          about: what ? 'for later, under the slash' : 'write what to keep after it',
          section: SECTION.ours,
        },
      ];
    }

    if (open.kind === 'choice') {
      const ours = open.ours;
      if (ours.name === '/forget') {
        return rank(
          kept.map((one) => ({
            pick: `slash:forget:${one.id}`,
            name: one.title,
            about: this.armed === one.id ? 'press again to forget it for good' : one.prompt,
            section: SECTION.kept,
            ...(this.armed === one.id ? { sore: true } : {}),
          })),
          open.asked
        );
      }
      const on = ours.on?.(kit) ?? null;
      const starts = ours.starts?.(kit) ?? null;
      return rank(
        (ours.choices?.(kit) ?? []).map((choice) => ({
          pick: `slash:${ours.name}:${choice.id}`,
          name: choice.name,
          ...(choice.about ? { about: choice.about } : {}),
          on: choice.id === on,
          section: ours.what === 'model' || ours.what === 'effort'
            ? `${ours.about}, shift-return makes it the default`
            : ours.about,
          ...(starts !== null && choice.id === starts ? { starts: true } : {}),
          ...((ours.what === 'model' || ours.what === 'defaultModel') && /fable|mythos/i.test(`${choice.id} ${choice.name}`)
            ? { dear: true }
            : {}),
        })),
        open.asked,
        { keepOrder: true }
      );
    }

    const offers: Offer[] = [];
    if (open.kind === 'all' || open.kind === 'later') {
      for (const ours of OURS) {
        if (open.kind === 'later' && !ours.what) continue;
        if (ours.when ? !ours.when(kit, kept) : ours.choices && !ours.choices(kit).length) continue;
        offers.push({
          pick: `slash:${ours.name}`,
          name: ours.name,
          about: ours.about,
          section: SECTION.ours,
        });
      }
    }
    const mine = new Set(offers.map((one) => one.name));
    for (const order of kit.orders) {
      const name = slashed(order.name);
      if (mine.has(name)) continue;
      offers.push({
        pick: `slash:${name}`,
        name,
        about: order.about,
        section: SECTION.theirs,
        ...(order.takes ? { takes: order.takes } : {}),
      });
    }
    for (const one of kept) {
      offers.push({
        pick: `slash:kept:${one.id}`,
        name: one.title,
        ...(one.title === one.prompt ? {} : { about: one.prompt }),
        section: SECTION.kept,
      });
    }
    const ranked = rank(offers, open.asked.slice(1));
    /* A whole name written out that nothing here starts with is still meant:
       a skill taught since the agent last said what it has, or one it never
       listed. Return says it as written rather than picking whatever only
       happens to mention those letters, which used to swallow it for good. */
    const want = open.asked.slice(1).toLowerCase();
    const named = ranked.some((one) =>
      one.name.replace(/^\/+/, '').toLowerCase().startsWith(want)
    );
    if (open.kind !== 'all' || want.length < 2 || named) return ranked;
    return [
      { pick: 'slash:as-written', name: open.asked, about: 'say it as written', section: SECTION.written },
      ...ranked,
    ];
  }

  /** What a pressed line means. */
  meant(pick: string): Meant | null {
    const open = this.opened();
    const kit = this.kit;
    if (!open || !kit) return null;
    const before = this.head.slice(0, open.from);
    /* Written into the middle of a sentence, the rest of it stays where it
       was and the caret lands right after what went in. */
    const around = (put: string): Meant => {
      const after = this.tail.replace(/^\s+/, '');
      const head = after && !/\s$/.test(put) ? `${put} ` : put;
      return { does: 'write', text: head + after, caret: head.length };
    };

    if (pick === 'slash:as-written') return { does: 'send', text: this.text.trim() };
    if (pick === 'slash:keep') {
      const what = open.asked.trim();
      return what ? { does: 'keep', text: what } : { does: 'write', text: '/keep ' };
    }
    if (pick.startsWith('slash:forget:')) {
      const id = pick.slice('slash:forget:'.length);
      const one = kept.find((each) => each.id === id);
      if (!one) return null;
      if (this.armed !== id) {
        this.armed = id;
        return null;
      }
      this.armed = null;
      return { does: 'forget', id, title: one.title };
    }
    if (pick.startsWith('slash:kept:')) {
      const one = kept.find((each) => `slash:kept:${each.id}` === pick);
      return one ? around(before + one.prompt) : null;
    }

    if (open.kind === 'choice') {
      const ours = open.ours;
      const id = pick.slice(`slash:${ours.name}:`.length);
      const choice = ours.choices?.(kit).find((each) => each.id === id);
      if (!choice || !ours.what) return null;
      const text = before + this.tail.replace(/^\s+/, '');
      return {
        does: 'set',
        what: ours.what,
        id: choice.id,
        name: choice.name,
        ...(text.trim() ? { keep: { text, caret: before.length } } : {}),
      };
    }

    const name = pick.slice('slash:'.length);
    const ours =
      open.kind === 'all'
        ? OURS.find((each) => each.name === name)
        : open.kind === 'later'
          ? OURS.find((each) => each.name === name && each.what)
          : undefined;
    if (ours && open.kind === 'later') return around(`${before}${ours.name} `);
    if (ours) {
      if (ours.name === '/agent') return { does: 'card' };
      if (ours.name === '/resume') return { does: 'resume' };
      return { does: 'write', text: `${ours.name} ` };
    }
    const order = kit.orders.find((each) => slashed(each.name) === name);
    if (!order) return null;
    /* A command already written out in full is what you meant, so return sends
       it rather than writing it again. Otherwise it is written with a space
       after it, which closes the list, and the next return sends it; the same
       two presses as Emdash's own chip. */
    if (open.kind === 'all' && same(this.text.trim(), name) && !order.takes) {
      return { does: 'send', text: name };
    }
    return around(`${before}${name} `);
  }

  /** The same line, picked as what every new session starts on rather than this one. */
  asDefault(pick: string): Meant | null {
    const open = this.opened();
    if (!open || open.kind !== 'choice') return null;
    const which = open.ours.what === 'model' ? 'defaultModel' : open.ours.what === 'effort' ? 'defaultEffort' : null;
    if (!which) return null;
    const meant = this.meant(pick);
    return meant && meant.does === 'set' ? { ...meant, what: which } : null;
  }

  private opened(): Open | null {
    const text = this.head;
    const midway = this.tail.trim() !== '';
    if (text.startsWith('/') && !midway) {
      const space = text.indexOf(' ');
      if (space === -1) return { kind: 'all', from: 0, asked: text };
      const head = text.slice(0, space);
      const rest = text.slice(space + 1);
      if (same(head, '/keep')) return { kind: 'keep', from: 0, asked: rest };
      const ours = OURS.find((each) => same(each.name, head) && each.choices);
      if (ours && !rest.includes(' ')) return { kind: 'choice', ours, from: 0, asked: rest };
    }
    const mid = /(^|\s)(\/\S+) (\S*)$/.exec(text);
    const setting = mid && OURS.find((each) => each.what && each.choices && same(each.name, mid[2] ?? ''));
    if (mid && setting) {
      return {
        kind: 'choice',
        ours: setting,
        from: mid.index + (mid[1] ?? '').length,
        asked: mid[3] ?? '',
      };
    }
    const later = LATER.exec(text);
    if (later && (midway || text.trim() !== later[2])) {
      const from = later.index + (later[1] ?? '').length;
      return { kind: 'later', from, asked: later[2] ?? '/' };
    }
    return null;
  }
}

function slashed(name: string): string {
  return name.startsWith('/') ? name : `/${name}`;
}

function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function clip(text: string, most: number): string {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > most ? `${flat.slice(0, most - 1)}…` : flat;
}
