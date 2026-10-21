import { parseNativeAbsolute } from '@emdash/core/primitives/path/api';
import type { CheckoutHeadState } from '@emdash/core/runtimes/git/api';
import { ReplicaState } from '@emdash/wire/live';
import type { Kit, Told } from '@shared/agents';
import { isDear } from '@shared/hungry';
import { MCP_CATALOG } from '@shared/mcp-catalog';
import type { Task } from '@shared/tasks';
import { chip, dom, h, label, pressable, sign } from '../glass/f';
import type { MenderClient } from '../wire';
import { stand } from '../yard/standing';
import type { Row } from './row';

/**
 * The card: what a session works with.
 *
 * The board is the conversation and this is the same board showing the other
 * thing it has to show — who is working in here, what they are thinking with,
 * what they can reach out in the world, and what they have been taught. You
 * get to it from the rail and you leave it the same way, which is why there is
 * no tab strip: the rail is the only thing in this app that changes what the
 * board is.
 *
 * Every line on it is pressable, and pressing one is the whole interaction.
 */

export interface LiveCard {
  rows(): Row[];
  /** What would be lost if the session ended, asked for fresh each rewrite. */
  ending(): Ending | undefined;
  /** Ask, or stop asking, whether to take it down. */
  ask(asked: boolean): void;
  /** Show, or fold away, everyone who could work here but is not installed. */
  show(showing: boolean): void;
  showing(): boolean;
  /** What the export line says right now, in place of its own offer. */
  setExported(said: { text: string; path?: string } | null): void;
  /** What a pressed line means, or nothing if it was only a heading. */
  meant(pick: string): Meant | null;
  close(): Promise<void>;
}

export type Meant =
  | { does: 'choose'; what: 'hand' | 'model' | 'mode' | 'effort' | 'collab'; id: string }
  | { does: 'tool'; name: string; on: boolean }
  /** Open the real shell here, with the agent's own sign-in line ready to run. */
  | { does: 'signin'; command: string }
  | { does: 'browse' }
  | { does: 'addcat'; key: string }
  | { does: 'addcustom' }
  /** Arm or fire the two-press removal of one server. */
  | { does: 'rmtool'; name: string; asked: boolean }
  /** Bring an agent already here up to date. */
  | { does: 'updatehand'; id: string }
  /** Arm or fire the two-press removal of an agent's CLI from this machine. */
  | { does: 'rmhand'; id: string; asked: boolean }
  /** Fold the catalogue of installable skills open or shut. */
  | { does: 'browseknacks' }
  /** Install one from the catalogue. */
  | { does: 'addknack'; id: string }
  /** Write one of your own: a name, then what it is for. */
  | { does: 'addcustomknack' }
  /** Read, or stop reading, one it already knows. */
  | { does: 'knack'; name: string; from: 'everywhere' | 'here' }
  /** Arm or fire the two-press removal of one it already knows. */
  | { does: 'rmknack'; name: string; from: 'everywhere' | 'here'; asked: boolean }
  /** Write the transcript out as a markdown file, outside any checkout. */
  | { does: 'export' }
  /** The just-written transcript, shown where it actually landed. */
  | { does: 'show-export'; path: string }
  /** Turn a not-yet-awake session into the agent's own CLI, raw. */
  | { does: 'terminal' };

interface KnackUi {
  catalogShowing: boolean;
  catalog: { id: string; name: string; about: string }[] | null;
  removing: { name: string; from: 'everywhere' | 'here' } | null;
  reading: { name: string; from: 'everywhere' | 'here'; text: string | null } | null;
}

export async function openCard(
  client: MenderClient,
  task: Task,
  changed: (rows: Row[]) => void
): Promise<LiveCard> {
  let kit: Kit | null = null;
  /* What ending it would cost, kept current from the same live checkout the
     board reads: a preflight computed once and then gone stale is a preflight
     that lies. */
  let ending: Ending = { uncommitted: 0, unsent: 0, asked: false };
  /** Whether the agents who are not on this machine are folded open. */
  let showing = false;
  /** Whether the models older than the latest few are folded open. */
  let older = false;
  /** Whether the catalogue of suggested servers is folded open. */
  let catalogShowing = false;
  /** The server armed for a second press to throw it away, if any. */
  let removing: string | null = null;
  /** The agent CLI armed for a second press to take it off this machine, if any. */
  let removingHand: string | null = null;
  /** What the export line says while its own result is sitting on it. */
  let exported: { text: string; path?: string } | null = null;
  /** The catalogue of skills, what it is reading, and what it is about to
      throw away — all folded together since none of it is a fact the kit
      itself carries. */
  let knackUi: KnackUi = { catalogShowing: false, catalog: null, removing: null, reading: null };

  const redraw = (): void => {
    changed(
      written(
        task,
        kit,
        ending,
        showing,
        catalogShowing,
        removing,
        removingHand,
        exported,
        knackUi,
        older
      )
    );
  };

  const replica = new ReplicaState<Kit>(client.agents.kit.state({ task: task.id }, 'state'), {
    onChange: (value) => {
      kit = value;
      redraw();
    },
  });

  const parsed = parseNativeAbsolute(task.path);
  const checkout = parsed.success ? parsed.data : null;
  const model = client.git.checkout.model;
  const status = checkout
    ? new ReplicaState<{ kind: string; entries?: Record<string, unknown> }>(
        model.state({ checkout }, 'status'),
        {
          onChange: (value) => {
            ending = { ...ending, uncommitted: Object.keys(value.entries ?? {}).length };
            redraw();
          },
        }
      )
    : null;
  const head = checkout
    ? new ReplicaState<CheckoutHeadState>(model.state({ checkout }, 'head'), {
        onChange: (value) => {
          ending = { ...ending, unsent: unsentIn(value) };
          redraw();
        },
      })
    : null;

  await Promise.all([replica.ready, status?.ready, head?.ready]);
  kit = replica.current();
  ending = {
    uncommitted: Object.keys(status?.current()?.entries ?? {}).length,
    unsent: unsentIn(head?.current()),
    asked: false,
  };

  return {
    rows: () =>
      written(
        task,
        kit,
        ending,
        showing,
        catalogShowing,
        removing,
        removingHand,
        exported,
        knackUi,
        older
      ),
    setExported: (said) => {
      exported = said;
    },
    show: (open) => {
      showing = open;
      /* Turned back to the transcript is backing out of the card, and the
         offer to take the session down does not survive that — an accidental
         second press the next time the card is turned over must land on
         "send everybody home", not on "press again and it is gone". */
      if (!open && ending.asked) ending = { ...ending, asked: false };
    },
    showing: () => showing,
    ending: () => ending,
    ask: (asked) => {
      ending = { ...ending, asked };
    },
    meant: (pick) => {
      if (pick === 'older') {
        older = !older;
        return { does: 'browse' };
      }
      const meant = read(pick, kit);
      /* Arming or firing removal is the card's own state, tracked here rather
         than asked of the caller twice. */
      if (meant?.does === 'rmtool') {
        if (removing === meant.name) {
          removing = null;
          return { ...meant, asked: true };
        }
        removing = meant.name;
        return { ...meant, asked: false };
      }
      if (meant?.does === 'rmhand') {
        if (removingHand === meant.id) {
          removingHand = null;
          return { ...meant, asked: true };
        }
        removingHand = meant.id;
        return { ...meant, asked: false };
      }
      if (meant?.does === 'browse') catalogShowing = !catalogShowing;
      if (meant?.does === 'browseknacks') {
        knackUi = { ...knackUi, catalogShowing: !knackUi.catalogShowing };
        if (knackUi.catalogShowing && !knackUi.catalog) {
          void client.agents.skillsCatalogue().then((list) => {
            knackUi = { ...knackUi, catalog: list };
            redraw();
          });
        }
      }
      if (meant?.does === 'rmknack') {
        if (knackUi.removing?.name === meant.name && knackUi.removing.from === meant.from) {
          knackUi = { ...knackUi, removing: null };
          return { ...meant, asked: true };
        }
        knackUi = { ...knackUi, removing: { name: meant.name, from: meant.from } };
        return { ...meant, asked: false };
      }
      if (meant?.does === 'knack') {
        if (knackUi.reading?.name === meant.name && knackUi.reading.from === meant.from) {
          knackUi = { ...knackUi, reading: null };
        } else {
          knackUi = { ...knackUi, reading: { name: meant.name, from: meant.from, text: null } };
          const asked = meant;
          void client.agents
            .knackText({ task: task.id, name: asked.name, from: asked.from })
            .then((got) => {
              if (knackUi.reading?.name !== asked.name || knackUi.reading.from !== asked.from)
                return;
              knackUi = {
                ...knackUi,
                reading: {
                  name: asked.name,
                  from: asked.from,
                  text: got.success
                    ? got.data.content
                    : `could not read it${got.error.kind === 'refused' ? `: ${got.error.because}` : '.'}`,
                },
              };
              redraw();
            });
        }
      }
      return meant;
    },
    close: async () => {
      await Promise.all([replica.dispose(), status?.dispose(), head?.dispose()]);
    },
  };
}

/** `kind:id`, so a pressed line says what it was without a lookup table. */
function read(pick: string, kit: Kit | null): Meant | null {
  if (pick === 'signin') {
    return kit?.signIn ? { does: 'signin', command: kit.signIn.command } : null;
  }
  if (pick === 'browse') return { does: 'browse' };
  if (pick === 'addcustom') return { does: 'addcustom' };
  if (pick.startsWith('addcat:')) return { does: 'addcat', key: pick.slice(7) };
  if (pick.startsWith('rmtool:')) return { does: 'rmtool', name: pick.slice(7), asked: false };
  if (pick.startsWith('updatehand:')) return { does: 'updatehand', id: pick.slice(11) };
  if (pick.startsWith('rmhand:')) return { does: 'rmhand', id: pick.slice(7), asked: false };
  if (pick === 'export') return { does: 'export' };
  if (pick === 'terminal') return { does: 'terminal' };
  if (pick.startsWith('show-export:')) return { does: 'show-export', path: pick.slice(12) };
  if (pick === 'browseknacks') return { does: 'browseknacks' };
  if (pick === 'addcustomknack') return { does: 'addcustomknack' };
  if (pick.startsWith('addknack:')) return { does: 'addknack', id: pick.slice(9) };
  if (pick.startsWith('rmknack:')) {
    const [, from, name] = pick.split(':');
    return { does: 'rmknack', name, from: from as 'everywhere' | 'here', asked: false };
  }
  if (pick.startsWith('knack:')) {
    const [, from, name] = pick.split(':');
    return { does: 'knack', name, from: from as 'everywhere' | 'here' };
  }
  const cut = pick.indexOf(':');
  if (cut === -1) return null;
  const kind = pick.slice(0, cut);
  const id = pick.slice(cut + 1);
  if (
    kind === 'hand' ||
    kind === 'model' ||
    kind === 'mode' ||
    kind === 'effort' ||
    kind === 'collab'
  ) {
    return { does: 'choose', what: kind, id };
  }
  if (kind === 'tool') {
    const was = kit?.tools.find((tool) => tool.name === id);
    return { does: 'tool', name: id, on: !was?.on };
  }
  return null;
}

/** How much of the window a model spends, by family: Fable most, Haiku least. */
function spend(choice: { id: string; name: string }): { n: number; word: string } | null {
  const said = `${choice.name} ${choice.id}`.toLowerCase();
  if (/fable|mythos/.test(said)) return { n: 4, word: 'dearest' };
  if (/opus/.test(said)) return { n: 3, word: 'steady' };
  if (/sonnet/.test(said)) return { n: 2, word: 'light' };
  if (/haiku/.test(said)) return { n: 1, word: 'lightest' };
  return null;
}

/** How many of the models are shown before the rest are folded under "older". */
const LATEST = 4;

function written(
  task: Task,
  kit: Kit | null,
  ending?: Ending,
  showing?: boolean,
  catalogShowing?: boolean,
  removing?: string | null,
  removingHand?: string | null,
  exported?: { text: string; path?: string } | null,
  knackUi?: KnackUi,
  older?: boolean
): Row[] {
  const root = h('div', 'f-root');
  const whoIs = kit?.hands.find((hand) => hand.id === kit.hand);

  const head = h('div', 'f-head');
  head.append(h('div', 'f-av', sign('spark', '#ffd2bf', 30)));
  const sub = h('div', 'f-sub');
  if (whoIs?.signedIn === true) sub.append(chip('signed in', '#9bd28a'));
  if (whoIs?.signedIn === false) sub.append(chip('not signed in', '#f08a72'));
  sub.append(`working in ${task.title}`);
  head.append(h('div', '', h('h1', '', whoIs?.name ?? (kit ? kit.hand : 'who works here')), sub));
  const acts = h('div', 'f-acts');
  if (kit && whoIs?.here) {
    acts.append(
      pressable(h('span', 'g-ghost g-plain', 'Bring it up to date'), `updatehand:${kit.hand}`)
    );
    const asked = removingHand === kit.hand;
    const off = h(
      'span',
      'g-ghost f-ghost-sore',
      asked ? `press again and ${whoIs.name} is off this machine` : 'Take it off this machine'
    );
    pressable(off, `rmhand:${kit.hand}`);
    if (asked) stand(() => off.click(), off);
    acts.append(off);
  }
  if (kit?.signIn) {
    acts.append(
      pressable(h('span', 'g-ghost', `${kit.signIn.agent} needs you to sign in`), 'signin')
    );
  }
  head.append(acts);
  root.append(head);

  if (!kit) {
    root.append(h('div', 'f-note', 'looking…'));
    return [dom(root), ...over(ending, false, task.shared)];
  }

  if (!kit.awake) {
    root.append(
      h(
        'div',
        'f-sec f-prose',
        'what they think with, how they work and how hard they think are theirs to offer, not ours to guess, so they are not here until somebody has spoken to them.'
      )
    );
  } else {
    if (kit.models.length) {
      const sec = h('div', 'f-sec', label('thinking with', 'new sessions start on it too'));
      const grid = h('div', 'f-models');
      const shown =
        older || kit.models.length <= LATEST + 1
          ? kit.models
          : kit.models.filter((one, at) => at < LATEST || one.id === kit.model);
      for (const choice of shown) grid.append(modelCard(choice, kit));
      const hidden = kit.models.length - shown.length;
      if (hidden > 0 || (older && kit.models.length > LATEST + 1)) {
        const more = h(
          'div',
          'f-m f-more',
          h('b', '', older ? 'fewer' : `${hidden} older`),
          h('span', '', older ? 'the latest only' : 'fold them open')
        );
        grid.append(pressable(more, 'older'));
      }
      sec.append(grid);
      root.append(sec);
    }

    const pair = h('div', 'f-two f-even');
    if (kit.efforts.length) {
      const seg = h('div', 'f-seg');
      kit.efforts.forEach((choice, at) => {
        const flames = h('div', 'f-flames');
        for (let i = 0; i <= Math.min(at, 4); i++) flames.append(sign('flame', '#ff9a4a', 12));
        const one = h('span', choice.id === kit.effort ? 'f-on' : '', flames, choice.name);
        seg.append(choice.id === kit.effort ? one : pressable(one, `effort:${choice.id}`));
      });
      pair.append(h('div', '', label('how hard it thinks'), seg));
    }
    if (kit.modes.length) {
      const seg = h('div', 'f-seg');
      for (const choice of kit.modes) {
        const on = choice.id === kit.mode;
        const one = h('span', on ? 'f-on' : '', choice.name);
        if (choice.about) one.append(h('small', '', brief(choice.about)));
        seg.append(on ? one : pressable(one, `mode:${choice.id}`));
      }
      pair.append(h('div', '', label('how it works'), seg));
    }
    if (pair.childElementCount) root.append(pair);

    if (kit.collabs.length) {
      const seg = h('div', 'f-seg');
      for (const choice of kit.collabs) {
        const on = choice.id === kit.collab;
        const one = h('span', on ? 'f-on' : '', choice.name);
        if (choice.about) one.append(h('small', '', brief(choice.about)));
        seg.append(on ? one : pressable(one, `collab:${choice.id}`));
      }
      root.append(h('div', 'f-sec', label('how it goes about it'), seg));
    }
  }

  if (kit.awake) {
    const pair = h('div', 'f-two f-even');
    pair.append(reach(kit, catalogShowing, removing));
    pair.append(taught(kit, knackUi));
    root.append(pair);
    const open = catalogShowing || knackUi?.catalogShowing;
    if (open) root.append(catalogues(kit, catalogShowing, knackUi));
    const reading = readingOf(kit, knackUi);
    if (reading) root.append(reading);
  }

  const others = kit.hands.filter((hand) => hand.id !== kit.hand);
  const here = others.filter((hand) => hand.here);
  const away = others.filter((hand) => !hand.here);
  if (here.length || away.length) {
    const row = h('div', 'f-others');
    for (const hand of here) {
      const name = hand.signedIn === false ? `${hand.name}, not signed in` : hand.name;
      const pill = h('span', 'f-hand');
      const who = h('span', 'f-who', h('i', 'f-b', sign('ring', '#f2c66d', 14)), name);
      pill.append(pressable(who, `hand:${hand.id}`));
      const up = pressable(h('span', 'f-small', 'update'), `updatehand:${hand.id}`);
      const off = pressable(
        h(
          'span',
          removingHand === hand.id ? 'f-small f-sorep' : 'f-small',
          removingHand === hand.id ? `press again and ${hand.name} is off` : 'take off'
        ),
        `rmhand:${hand.id}`
      );
      if (removingHand === hand.id) stand(() => off.click(), off);
      pill.append(up, off);
      row.append(pill);
    }
    if (away.length) {
      if (showing) {
        for (const hand of away) {
          row.append(
            pressable(
              h('span', 'f-hand', h('i', 'f-b', sign('plus', '#f2c66d', 14)), hand.name),
              `bring:${hand.id}`
            )
          );
        }
      } else {
        row.append(
          pressable(
            h(
              'span',
              'f-hand',
              h('i', 'f-b', sign('plus', '#f2c66d', 14)),
              `${away.length} more could work here`
            ),
            'elsewhere'
          )
        );
      }
    }
    root.append(h('div', 'f-sec', label('also on this machine'), row));
  }

  const foot = h('div', 'f-cardfoot');
  const out = exported
    ? h(
        'span',
        'g-ghost g-plain',
        sign('down', exported.path ? '#f2c66d' : '#9bd28a', 13),
        exported.text
      )
    : h('span', 'g-ghost g-plain', sign('down', '#f2c66d', 13), 'Write it all out to Downloads');
  if (exported ? exported.path : true) {
    pressable(out, exported ? `show-export:${exported.path}` : 'export');
  }
  foot.append(out);
  if (!kit.awake && task.kind !== 'terminal') {
    foot.append(
      pressable(
        h(
          'span',
          'g-ghost g-plain',
          sign('shell', '#f2c66d', 13),
          'Start one like this in a terminal'
        ),
        'terminal'
      )
    );
  }
  if (kit.awake) {
    foot.append(
      pressable(
        h('span', 'g-ghost g-plain', sign('house', '#f2c66d', 13), 'Send them home for the night'),
        'rest'
      )
    );
  }
  foot.append(h('span', 'f-nt', 'changing who works here sends this one home'));
  root.append(foot);

  return [dom(root), ...over(ending, kit.awake, task.shared)];
}

/** What a mode says about itself, short enough to sit under its name. */
function brief(about: string): string {
  const one = about.replace(/\s+/g, ' ').trim();
  return one.length > 26 ? `${one.slice(0, 24).trimEnd()}…` : one;
}

function modelCard(choice: { id: string; name: string; about?: string }, kit: Kit): HTMLElement {
  const on = choice.id === kit.model;
  const dear = isDear({ model: choice.id, models: [choice] });
  const card = h('div', `f-m${on ? ' f-on' : ''}${dear ? ' f-fable' : ''}`);
  /* "Default (recommended)" is the agent's own label for letting it choose;
     the card says that in a word, and what it means in the line under it. */
  const named = choice.name.replace(/\s*\(.*\)\s*$/, '');
  const name = h(
    'b',
    '',
    dear ? sign('gem', '#c9b2ff', 14) : null,
    /^default$/i.test(named) ? 'default' : named
  );
  card.append(name);
  if (choice.about) card.append(h('span', '', choice.about.replace(/\s+/g, ' ').trim()));
  const cost = spend(choice);
  if (cost) {
    const meter = h('div', 'f-cost');
    for (let i = 0; i < 4; i++) meter.append(h('i', i < cost.n ? 'f' : ''));
    meter.append(h('small', '', cost.word));
    card.append(meter);
  }
  return on ? card : pressable(card, `model:${choice.id}`);
}

function reach(kit: Kit, catalogShowing?: boolean, removing?: string | null): HTMLElement {
  const sec = h(
    'div',
    '',
    label(
      'what it can reach',
      kit.tools.length ? `${kit.tools.length} server${kit.tools.length === 1 ? '' : 's'}` : ''
    )
  );
  const chips = h('div', 'f-chips');
  for (const tool of kit.tools) {
    const armed = removing === tool.name;
    const dot = h('span', 'g-dot');
    dot.style.background = tool.trouble ? '#f08a72' : tool.on ? '#9bd28a' : 'rgba(255,240,215,.3)';
    const one = h(
      'span',
      `f-cp${armed ? ' f-armed' : ''}${tool.on || tool.trouble ? '' : ' f-dim'}`,
      dot,
      tool.name
    );
    if (tool.trouble) {
      const why = h('span', '', tool.trouble);
      why.style.cssText = 'color:var(--g-sore);font-weight:500;font-size:11.5px';
      one.append(why);
    }
    pressable(one, `tool:${tool.name}`);
    const x = h('span', '', armed ? `press again and ${tool.name} is gone` : '×');
    x.style.cssText = `margin-left:2px;opacity:${armed ? 1 : 0.6};font-weight:500`;
    pressable(x, `rmtool:${tool.name}`, false);
    if (armed) stand(() => x.click(), x);
    one.append(x);
    chips.append(one);
  }
  chips.append(
    pressable(
      h('span', 'f-cp f-add1', catalogShowing ? 'fold the catalogue' : '+ add one'),
      'browse'
    )
  );
  chips.append(pressable(h('span', 'f-cp f-add1', '+ one of your own'), 'addcustom'));
  sec.append(chips);
  if (!kit.tools.length) {
    sec.append(h('div', 'f-note', 'nothing beyond this machine.'));
  }
  return sec;
}

function taught(kit: Kit, knackUi?: KnackUi): HTMLElement {
  const sec = h(
    'div',
    '',
    label('what it has been taught', kit.knacksSupported ? `${kit.knacks.length} skills` : '')
  );
  if (!kit.knacksSupported) {
    sec.append(h('div', 'f-note', 'this agent keeps none.'));
    return sec;
  }
  const chips = h('div', 'f-chips');
  for (const knack of kit.knacks) {
    const open = knackUi?.reading?.name === knack.name && knackUi.reading.from === knack.from;
    const one = h('span', `f-cp${open ? ' f-armed' : ''}`, knack.name);
    if (open) one.style.color = 'var(--g-ink)';
    one.title = knack.about;
    chips.append(pressable(one, `knack:${knack.from}:${knack.name}`));
  }
  chips.append(
    pressable(
      h('span', 'f-cp f-add1', knackUi?.catalogShowing ? 'fold the catalogue' : '+ teach one'),
      'browseknacks'
    )
  );
  chips.append(pressable(h('span', 'f-cp f-add1', '+ one of your own'), 'addcustomknack'));
  sec.append(chips);
  return sec;
}

/** The catalogues of servers and skills, folded open under the card. */
function catalogues(kit: Kit, catalogShowing?: boolean, knackUi?: KnackUi): HTMLElement {
  const sec = h('div', 'f-sec');
  if (catalogShowing) {
    const has = new Set(kit.tools.map((tool) => tool.name));
    sec.append(label('servers worth adding'));
    const list = h('div', 'f-card f-list');
    for (const entry of MCP_CATALOG.filter((each) => !has.has(each.name.toLowerCase()))) {
      const line = h(
        'div',
        'f-line',
        sign('plus', '#f2c66d', 12),
        h('span', 'f-f f-ltr', entry.name),
        h('span', 'f-d', entry.description)
      );
      list.append(pressable(line, `addcat:${entry.key}`));
    }
    sec.append(list);
  }
  if (knackUi?.catalogShowing) {
    const has = new Set(kit.knacks.map((knack) => knack.name));
    sec.append(label('skills worth teaching'));
    const list = h('div', 'f-card f-list');
    const found = (knackUi.catalog ?? []).filter((one) => !has.has(one.id));
    if (!knackUi.catalog) list.append(h('div', 'f-note', 'looking…'));
    for (const entry of found) {
      const line = h(
        'div',
        'f-line',
        sign('plus', '#f2c66d', 12),
        h('span', 'f-f f-ltr', entry.name),
        h('span', 'f-d', entry.about)
      );
      list.append(pressable(line, `addknack:${entry.id}`));
    }
    sec.append(list);
  }
  return sec;
}

/** What a skill says, opened under the chips, and the way to throw it away. */
function readingOf(kit: Kit, knackUi?: KnackUi): HTMLElement | null {
  const open = knackUi?.reading;
  if (!open) return null;
  const knack = kit.knacks.find((one) => one.name === open.name && one.from === open.from);
  if (!knack) return null;
  const wrap = h(
    'div',
    'f-sec',
    label(knack.name, knack.from === 'here' ? 'only in this checkout' : '')
  );
  wrap.append(h('div', 'f-read', open.text ?? 'reading…'));
  const asking = knackUi?.removing?.name === knack.name && knackUi.removing.from === knack.from;
  const gone = h(
    'span',
    asking ? 'g-ghost f-ghost-sore' : 'g-ghost g-plain',
    sign('trash_y', asking ? '#f08a72' : '#f2c66d', 13),
    asking ? `press again and ${knack.name} is gone` : 'Throw it away'
  );
  gone.style.marginTop = '10px';
  pressable(gone, `rmknack:${knack.from}:${knack.name}`);
  if (asking) stand(() => gone.click(), gone);
  wrap.append(gone);
  return wrap;
}

/**
 * What would be lost if this session were taken down, and the offer to do it.
 *
 * The branch outlives the building: taking a session down removes the place
 * the work happened, not the work. What it does remove is whatever in that
 * working tree was never committed, so that is counted and said before you are
 * asked rather than after, and it takes two presses like everything else here
 * that cannot be pressed again.
 */
export interface Ending {
  /** How many files in there are not as they were committed. */
  uncommitted: number;
  /** How many commits nowhere else has, or null when it follows nothing. */
  unsent: number | null;
  asked: boolean;
}

/**
 * The end of a session, with what it would cost said before you are asked
 * rather than after, and two presses like everything else here that cannot be
 * pressed again.
 */
function over(ending: Ending | undefined, _awake: boolean, shared?: boolean): Row[] {
  if (!ending) return [];
  const strip = h('div', 'g-danger');
  strip.style.cssText = 'margin-top:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap';
  if (shared) {
    /* Nothing of its own to lose: the folder is the project's, and whatever
       was changed in it stays for whoever is next. */
    const go = h(
      'span',
      'g-ghost f-ghost-sore',
      sign('cross', '#f08a72', 12),
      'Send them home and take this down'
    );
    pressable(go, 'end!');
    strip.append(
      h(
        'span',
        '',
        'it works in the project’s own folder, so taking it down leaves every file where it is.'
      ),
      go
    );
    (strip.firstElementChild as HTMLElement).style.cssText =
      'flex:1;min-width:240px;color:#f6c4b6;font-size:13px';
    return [dom(strip)];
  }
  const losing = [
    ending.uncommitted
      ? `${counted(ending.uncommitted, 'file')} in there nobody has committed`
      : '',
    ending.unsent === null
      ? 'a branch nowhere else has ever seen'
      : ending.unsent
        ? `${counted(ending.unsent, 'commit')} nowhere else has`
        : '',
  ].filter(Boolean);
  const said = h(
    'span',
    '',
    losing.length
      ? `there ${losing.length === 1 ? 'is' : 'are'} ${losing.join(' and ')}.`
      : 'everything in there is committed and sent.'
  );
  said.style.cssText = `flex:1;min-width:240px;font-size:13px;color:${losing.length ? '#f6c4b6' : 'var(--g-ink-2)'}`;
  const go = h(
    'span',
    'g-ghost f-ghost-sore',
    sign('cross', '#f08a72', 12),
    ending.asked
      ? losing.length
        ? 'press again and all of that is gone'
        : 'press again and it is gone'
      : 'Send everybody home and take this down'
  );
  pressable(go, ending.asked ? 'end!' : 'end');
  if (ending.asked) stand(() => go.click(), go);
  strip.append(said, go);
  return [dom(strip)];
}

export function counted(many: number, thing: string): string {
  return many === 1 ? `one ${thing}` : `${many} ${thing}s`;
}

/**
 * How far the branch has run ahead of whatever it is following.
 *
 * Null when it is following nothing, which is a different fact and has to stay
 * one: a branch nobody has seen has everything on it that nowhere else has,
 * and how much that is cannot be counted from here. A number would be a guess
 * printed as a fact, which is the worst thing a preflight can do.
 */
export function unsentIn(head: CheckoutHeadState | undefined): number | null {
  if (!head || head.kind === 'detached' || head.kind === 'unborn') return 0;
  if (head.upstream.kind === 'none') return null;
  const tracking = head.upstream.tracking;
  return tracking.kind === 'resolved' ? tracking.ahead : 0;
}

/**
 * The whole conversation, oldest first, as a plain markdown document.
 *
 * `notes` arrive newest first and `thoughts` oldest first, so this reads the
 * notes backwards and pairs each with whatever it answered by turn, which is
 * the only thing that already ties the two together.
 */
/**
 * The same pairing `transcriptMarkdown` writes as a document, as plain turns
 * instead — for reading an ended session back without any marks on it, or
 * for carrying a conversation into a forked one up to a given turn.
 */
export function turnsOf(told: Told, uptoTurn?: number): { who: 'you' | 'agent'; text: string }[] {
  const turns: { who: 'you' | 'agent'; text: string }[] = [];
  const notes = [...told.notes]
    .reverse()
    .filter((note) => uptoTurn === undefined || (note.turn ?? 0) <= uptoTurn);
  for (const note of notes) {
    turns.push({ who: 'you', text: note.said });
    for (const thought of told.thoughts) {
      if (thought.turn !== note.turn) continue;
      turns.push({ who: 'agent', text: thought.said });
    }
  }
  return turns;
}

export function transcriptMarkdown(task: Task, told: Told): string {
  const lines: string[] = [`# ${task.title}`, '', `_${task.branch}_`];
  const notes = [...told.notes].reverse();
  for (const note of notes) {
    lines.push('', '## you', '', note.said);
    for (const thought of told.thoughts) {
      if (thought.turn !== note.turn) continue;
      lines.push('', '## agent', '', thought.said);
    }
  }
  return `${lines.join('\n')}\n`;
}
