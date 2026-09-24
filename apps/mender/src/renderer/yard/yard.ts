/**
 * The yard.
 *
 * You open a project and you are standing in its yard at night. What you asked
 * for is nailed to a gatepost on the left. What the agent is thinking rises off
 * the fire in the middle, getting brighter and larger the more recent it is.
 * What it has made is loaded on the cart to the right, and under that is the
 * ground itself, with everybody it sent out standing either in the firelight
 * with an answer or out in the dark still working. Along the bottom, one
 * lantern per session in the project, yours hanging lowest.
 *
 * There is no roster board and there is no second board. A session is not
 * something you navigate to from a list; it is where you already are, and the
 * lanterns are how you get to the others.
 *
 * Everything here is written on the layer over the village rather than drawn
 * into it. Nothing in this file talks to the wire: it is handed a `Yard` and it
 * writes it down.
 */

import type { Row } from '../board/row';
import { GUTTER, MARGIN, type Layer } from './frame';
import { makeLine, type Asking as Prompting, type Line } from './line';
import { pressing, twice } from './press';
import { makeRows } from './rows';
import { makeScrim, type Reading } from './scrim';
import { KIT_NAMES, sprite } from './sprite';
import { astop, walking, type Walking } from './walk';
import type { Asking as Ask, Hand, Made, Note, Posture, Step, Thought, Yard } from './what';
import { box, exact, firelight, folk, label, row, rule, said, stack, trim } from './write';

/* Where the bands sit, measured off the designs, with one change: the top
   right corner belongs to the projects shelf, so the two facts the designs put
   up there drop below it and the whole band is that much deeper. */
const HEAD = {
  title: 22,
  meta: 56,
  aside: 70,
  under: 92,
  rule: 112,
  label: 132,
  top: 162,
} as const;
/* From the beam down to the bottom edge, which is what the rail lives in. Less
   of it when the lanterns are hanging bare, since there are no words under
   them to leave room for. */
const RAIL_TALL = 118;
const RAIL_BARE = 76;
/* How far apart two lanterns hang, and how much of one is the lantern itself. */
const LANTERN_STEP = 232;
const LANTERN = { wide: 22, tall: 38, cord: 16, cordHere: 30 };
/* The ground you can see under the cart, which is bottom-anchored so it stays
   above the line you write on however short the window is. */
const YARD_BOX = { wide: 380, tall: 214 };

/** What the five postures look like when they are a name on a lantern. */
const TONE: Record<Posture, string> = {
  working: '#e8d3a6',
  'wants-you': '#ff9a6a',
  done: '#a8c469',
  broken: '#d98a5a',
  resting: '#bfa476',
};

export interface Doings {
  /** Walk into another session in this project. */
  open(id: string): void;
  /** Something on a board of rows was pressed. */
  press(pick: string): void;
  /** Something was typed, for whatever is narrowing under the line. */
  typed(said: string): void;
  /** Answer the question somebody is standing at the gate with. */
  answer(id: string): void;
  /** Say something on the line. */
  say(said: string): void;
  /** Escape with nothing left on the line to throw away. */
  leave(): void;
  /** The village forgets this project. Only ever reached by two presses. */
  forget(): Promise<{ said: string } | { wrong: string; because?: string }>;
}

export interface Standing {
  /** Rewrite everything. Cheap: the yard is a couple of hundred elements. */
  show(yard: Yard): void;
  /** What the line is asking for at the moment. */
  asks(what: Prompting): void;
  /** Write the lines a slash or an @ has opened under the line. */
  narrowing(rows: Row[]): void;
  /**
   * Lay something over the yard to read, or take it away.
   *
   * The world dims further while this is up and the middle and right of the
   * yard go under it; what you asked for and the rail do not.
   */
  reading(what: Reading | null): void;
  readonly open: boolean;
  /** An arrow or a page key that nothing nearer wanted. */
  scrolled(key: string): boolean;
  /** Whether something written on covers that point of the window. */
  covers(x: number, y: number): boolean;
  /** Where the keyboard is, for whoever is listening to it. */
  readonly walk: Walking;
  readonly line: Line;
  /**
   * Whether the yard is up, and whether all of it is.
   *
   * `bare` keeps the line you write on and whatever is laid over it, and puts
   * the rest away. That is what the island wants: there is no yard out there,
   * but the finder and founding a place both need somewhere to write.
   */
  up(on: boolean, bare?: boolean): void;
  readonly showing: boolean;
  /** Take it down and give the village back. */
  close(): void;
}

export function makeYard(layer: Layer, does: Doings): Standing {
  /* Everything the yard is, under one thing that can be taken away. The shelf
     of projects lives on the layer beside this rather than inside it, because
     the shelf is reachable from the island as well as from in here. */
  const stage = box({ left: 0, top: 0, right: 0, bottom: 0 });
  stage.style.cssText += ';pointer-events:none;display:none';
  layer.root.appendChild(stage);

  const root = box({ left: 0, top: 0, right: 0, bottom: 0 });
  root.style.pointerEvents = 'none';
  stage.appendChild(root);

  /* The two columns the scrim comes down over. Everything else on the yard —
     the head, the gatepost, the line, the rail — stays visible while you are
     reading something, so they are drawn outside this. */
  const covered = box({ left: 0, top: 0, right: 0, bottom: 0 });
  covered.style.pointerEvents = 'none';
  root.appendChild(covered);

  /* The line is made once and kept. Everything else on this screen is thrown
     away and written again whenever anything moves, and a line that went with
     it would lose whatever you were half-way through typing every time an
     agent said a word. */
  const writing = box(
    { left: 0, right: 0, bottom: 146 },
    'display:flex;align-items:center;gap:10px'
  );
  stage.appendChild(writing);
  /* What is in your hands sits beside the line rather than on it, because a
     picture is not writing: what the board says is that you have it, and
     pressing one puts it down again. */
  const hands = box({}, 'position:relative;display:flex;align-items:center;gap:8px;flex:none');
  writing.appendChild(hands);
  const line = makeLine(writing);
  /* And what a slash or an @ has opened sits just above the line, growing
     upward from it. It is under the line in the sense that matters — it is
     what the line has opened and it goes away when the line does — and it is
     drawn above it because below it is the rail and then the edge of the
     screen. Nothing here floats over anything. */
  const under = box(
    { left: 0, right: 0, bottom: 190 },
    [
      'max-height:280px',
      'overflow-y:auto',
      'display:flex',
      'flex-direction:column',
      'justify-content:flex-end',
      /* The same wash everything read over the yard sits on, because this is
         read over the yard too and the village behind would otherwise be
         showing through the middle of a list of file names. */
      'background:rgba(72,37,16,.72)',
      'padding:10px 0',
      'pointer-events:auto',
    ].join(';')
  );
  const opened = makeRows(under, does.press);
  stage.appendChild(under);
  line.onSay((text) => does.say(text));
  line.onEmpty(() => does.leave());
  line.onType((text) => does.typed(text));

  /* And the wash that comes down over the middle and right of the screen when
     you open something to read. The gatepost keeps its own column and the rail
     keeps its own strip, so neither is ever covered. */
  const scrim = makeScrim(stage, does.press);

  const walk = walking(layer.root);

  /* Where the wash comes down, which is the same whether or not there is a
     yard under it: from the gatepost's own column to the right edge. */
  function lay(): void {
    const columns = layer.columns();
    const floor = window.innerHeight - MARGIN - RAIL_TALL - 60;
    scrim.place(
      columns.thinking.x - GUTTER / 2,
      MARGIN - 8,
      HEAD.rule,
      window.innerHeight - floor - 20
    );
    writing.style.left = `${layer.edge()}px`;
    writing.style.right = `${layer.edge()}px`;
    under.style.left = `${layer.edge()}px`;
    under.style.right = `${layer.edge()}px`;
  }

  let last: Yard | undefined;
  layer.onResize(() => {
    lay();
    if (last) show(last);
  });

  function show(yard: Yard): void {
    last = yard;
    root.replaceChildren(covered);
    covered.replaceChildren();
    const columns = layer.columns();
    /* Everything from under the header rule to above the line you write on.
       The columns live in here and the bands top and bottom do not. */
    const floor = window.innerHeight - MARGIN - (layer.cramped() ? RAIL_BARE : RAIL_TALL) - 60;

    scrims(root);
    lay();
    carried(hands, yard, does);
    head(root, yard, layer.edge(), does);
    asked(root, columns.asked, yard, floor, layer.cramped(), does);
    thinking(covered, columns.thinking, yard, floor, does);
    made(covered, columns.made, yard, floor);
    still(root, yard, layer.edge(), does);
    said_line(root, layer.edge());
    rail(root, yard, layer.cramped(), layer.edge(), does);
    /* What the line asks for follows what the yard is: somebody at the gate
       wants an answer, an empty project wants to know what to build, and
       anything else is the next thing you have to say. Not while something is
       laid over the yard, though: that has its own question. */
    if (!scrim.up) line.asks(yard.asking ? 'answer' : yard.session ? 'say' : 'start');

    /* The keyboard was standing on something before the rewrite and the board
       under it is new, so put the mark back on whatever it was standing on. */
    walk.again();
  }

  return {
    reading: (what) => {
      scrim.show(what);
      /* What is under it is still there and still live; it is simply not what
         you are looking at, so it stops taking the eye. */
      covered.style.visibility = what ? 'hidden' : '';
      line.asks(what?.asks ? (what.asks as Prompting) : 'say');
    },
    get open() {
      return scrim.up;
    },
    scrolled: (key) => scrim.scrolled(key),
    /* The wash covers land without being pressable, and so do the two bands
       at the top and the bottom. Everything else on the layer lets a pointer
       straight through to the island, which is the point of it. */
    covers: (x, y) => {
      if (stage.style.display === 'none') return false;
      const at = document.elementFromPoint(x, y);
      return Boolean(at && stage.contains(at) && at !== stage);
    },
    up: (on, bare = false) => {
      stage.style.display = on ? '' : 'none';
      if (on) lay();
      root.style.display = on && !bare ? '' : 'none';
      if (!on) line.write('');
    },
    get showing() {
      return stage.style.display !== 'none';
    },
    show,
    narrowing: (rows) => {
      opened.write(rows);
      under.style.display = rows.length ? 'flex' : 'none';
      /* Whatever it opened is read from the bottom up, because the thing it is
         narrowing towards is the nearest one to the line. */
      opened.root.scrollTop = opened.root.scrollHeight;
    },
    asks: (what) => line.asks(what),
    walk,
    line,
    close: () => {
      line.close();
      stage.remove();
    },
  };
}

/* ── the village behind, pushed down at both ends ──────────────────────────
   The world is dimmed as a whole elsewhere. These two are local: enough dark
   under the bottom band that the lanterns and the line you write on sit on
   something, without putting a panel there. */
function scrims(root: HTMLElement): void {
  root.appendChild(
    box(
      { left: 0, right: 0, bottom: 0, height: 260 },
      'background:linear-gradient(180deg,rgba(0,0,0,0),rgba(18,13,7,.55))'
    )
  );
  root.appendChild(
    box(
      { left: 0, right: 0, bottom: 0, height: 160 },
      'background:linear-gradient(0deg,rgba(18,13,7,.92),rgba(18,13,7,0))'
    )
  );
}

/* ── who and where ─────────────────────────────────────────────────────────
   The project's name, and under it the one line that says everything about
   the session you are standing in: its checkout, its agent, how long it has
   been going and how much of that was turns. To the right, the two things
   that are true of the agent rather than of the work. */
function head(root: HTMLElement, yard: Yard, edge: number, does: Doings): void {
  const title = box({ left: edge, top: HEAD.title }, TITLE);
  title.textContent = yard.project.name;
  root.appendChild(title);

  /* The head of the board is pressable wherever it leads somewhere. Where the
     checkout stands opens the checkout; where it is on disk walks into it. */
  const on = astop(
    pressing(yard.project.on, () => does.press('checkout')),
    'head:checkout'
  );
  on.style.cssText += META;
  const said = [
    yard.session?.agent,
    yard.project.going,
    counted(yard.project.turns, 'turn'),
    counted(yard.project.spawned, 'agent spawned', 'agents spawned'),
  ]
    .filter(Boolean)
    .join(' · ');
  const meta = box({ left: edge + 2, top: HEAD.meta }, 'display:flex;gap:6px;align-items:baseline');
  meta.append(on);
  if (said) {
    const dot = exact('·', 12, '#6b5a40');
    dot.style.position = 'relative';
    const rest = exact(said, 12);
    rest.style.position = 'relative';
    meta.append(dot, rest);
  }
  const into = astop(
    pressing(shortOf(yard.project.where), () => does.press('inside')),
    'head:in'
  );
  into.style.cssText += META;
  const dot2 = exact('·', 12, '#6b5a40');
  dot2.style.position = 'relative';
  meta.append(dot2, into);
  root.appendChild(meta);

  if (yard.session?.permissions) {
    const flag = box({ right: edge, top: HEAD.aside }, FLAG);
    flag.textContent = yard.session.permissions;
    root.appendChild(flag);
  }

  const room = yard.session?.room;
  const about = [
    room === undefined ? undefined : `context ${Math.round(room * 100)}%`,
    yard.session?.model,
  ]
    .filter(Boolean)
    .join(' · ');
  if (about) {
    const it = box({ right: edge, top: HEAD.under });
    it.appendChild(exact(about, 12));
    root.appendChild(it);
  }

  root.appendChild(rule({ left: edge, right: edge, top: HEAD.rule }, true));
}

/** How many of something, said rather than counted at. */
function counted(many: number | undefined, one: string, more?: string): string | undefined {
  if (!many) return undefined;
  return many === 1 ? `1 ${one}` : `${many} ${more ?? one + 's'}`;
}

const META = ";font-family:'Courier Prime',monospace;font-size:12px;position:relative";

/** The last thing in a path, which is the only part worth the room. */
function shortOf(path: string): string {
  return path.replace(/\/+$/, '').split('/').at(-1) ?? path;
}

const TITLE = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:22px',
  'font-weight:600',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#f4e3c0',
  'text-shadow:2px 2px 0 #120d07',
  'white-space:nowrap',
].join(';');

const FLAG = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.18em',
  'text-transform:uppercase',
  'color:#ff9a6a',
  'white-space:nowrap',
].join(';');

/* ── what you asked ────────────────────────────────────────────────────────
   A gatepost with your notes on it. The newest is on parchment and slightly
   crooked, because somebody pinned it there; the ones under it have been up
   long enough to have weathered into the post. Under the whole column, a
   glance at the other sessions that want something. */
function asked(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  cramped: boolean,
  does: Doings
): void {
  root.appendChild(label('what you asked', { left: at.x, top: HEAD.label }));

  /* The glance at the other sessions sits at the foot of the column, so the
     post and the notes on it get everything above that and no more. */
  const under = elsewhere(root, at, yard, floor, does);
  const room = under - 20 - HEAD.top;

  /* The post is only as long as what is nailed to it, plus a little bare wood
     under the last note. A post running the height of the window with nothing
     on it is a stripe, not a gatepost. */
  const post = box(
    { left: at.x, top: HEAD.top - 2, width: 12, height: room },
    'background:linear-gradient(90deg,#54391e,#3a2712)'
  );
  root.appendChild(post);

  const notes = yard.session?.notes ?? [];
  const [newest, ...older] = notes;
  if (!newest) {
    post.style.height = '120px';
    return;
  }

  const card = pinned(newest, { left: at.x + 22, top: HEAD.top, width: at.wide - 60 });
  root.appendChild(card);
  post.style.height = `${Math.min(room, card.offsetHeight + 60)}px`;

  if (!older.length || cramped) return;
  /* The card is as tall as whatever was written on it, which nothing knows
     until it is in, so the rest of the post is placed off its real height. */
  const below = HEAD.top + card.offsetHeight + 22;
  const list = stack(
    { left: at.x + 22, top: below, width: at.wide - 60, height: Math.max(0, under - 20 - below) },
    14
  );
  list.style.overflow = 'hidden';
  for (const note of older) list.appendChild(weathered(note));
  const tail = said('', '#a89272');
  tail.style.fontSize = '10px';
  list.appendChild(tail);
  root.appendChild(list);

  const dropped = trim(list, under - 20 - below);
  const many = (yard.session?.olderNotes ?? 0) + dropped;
  tail.textContent = many ? `${many} older notes further down the post` : '';
  post.style.height = `${Math.min(room, below + list.scrollHeight - HEAD.top + 40)}px`;
}

/** The newest note: on parchment, pinned, and not quite straight. */
function pinned(note: Note, where: { left: number; top: number; width: number }): HTMLElement {
  const card = box(where, CARD);
  const tack = box(
    { left: 14, top: -6, width: 10, height: 10 },
    'background:#d8863a;box-shadow:1px 1px 0 #120d07'
  );
  card.appendChild(tack);
  const meta = said(
    `newest · ${note.when} · ${note.answered ? 'answered' : 'unanswered'}`,
    '#b3651f'
  );
  meta.style.display = 'block';
  meta.style.marginBottom = '5px';
  card.appendChild(meta);
  card.appendChild(document.createTextNode(note.said));
  return card;
}

const CARD = [
  'background:#fff4d4',
  'color:#2c2013',
  'padding:12px 14px',
  'box-shadow:5px 5px 0 rgba(0,0,0,.5)',
  'transform:rotate(-.7deg)',
  "font-family:'Caveat',cursive",
  'font-size:19px',
  'line-height:1.25',
].join(';');

/** A note that has been on the post a while. */
function weathered(note: Note): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:3px';
  it.appendChild(said(`${note.when} · ${note.standing ? 'standing' : answered(note)}`));
  const body = document.createElement('span');
  body.style.cssText = "font-family:'Caveat',cursive;font-size:17px;line-height:1.25;color:#cbb491";
  body.textContent = note.said;
  it.appendChild(body);
  return it;
}

function answered(note: Note): string {
  return note.answered ? 'answered' : 'unanswered';
}

/**
 * Everything else going on in this project, as three lines and no more.
 *
 * Not the roster: that is the rail along the bottom, and this is the glance
 * you take without looking down. Returns the top of the block, which is where
 * the gatepost above it has to stop.
 */
function elsewhere(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): number {
  const others = yard.rail.filter((one) => !one.here).slice(0, 3);
  const tall = 30 + others.length * 23 + 34;
  const top = floor - tall;
  root.appendChild(rule({ left: at.x, top: top - 20, width: at.wide - 20 }));
  root.appendChild(label(`elsewhere in ${yard.project.name.toLowerCase()}`, { left: at.x, top }));

  const list = stack({ left: at.x, top: top + 30, width: at.wide }, 9);
  list.style.fontSize = '14px';
  list.style.fontFamily = "'Josefin Sans',sans-serif";
  for (const one of others) {
    const line = row(10);
    line.appendChild(
      box({ width: 8, height: 8 }, `background:${TONE[one.posture]};position:relative`)
    );
    const text = document.createElement('span');
    text.style.color = one.posture === 'wants-you' ? '#ff9a6a' : '#dcc8a0';
    text.textContent = `${one.name} · ${one.saying}`;
    line.appendChild(text);
    list.appendChild(line);
  }
  root.appendChild(list);

  /* The one thing this board offers about the project rather than about the
     work in it, at the very bottom, under everything, because forgetting a
     place is not something you should meet on your way into it. */
  const go = box({ left: at.x, top: top + 30 + others.length * 23 + 14 });
  go.appendChild(
    astop(
      twice('forget this project', yard.project.costs ?? 'it goes', {
        while: 'forgetting',
        run: does.forget,
      }),
      'forget'
    )
  );
  root.appendChild(go);
  return top;
}

/* ── what it is thinking ───────────────────────────────────────────────────
   The plan it posted at the start sits at the top and stays there, because it
   is the thing everything since is measured against. Under it, how many
   thoughts went by that you are not being shown, then the last few, each one
   a little brighter and a little larger than the one above it. The live one is
   at the bottom and is the only thing on this screen set large. */
function thinking(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): void {
  root.appendChild(
    rule({ left: at.x - GUTTER / 2, top: HEAD.rule + 12, width: 1, height: floor - HEAD.rule - 12 })
  );
  if (yard.asking) {
    gate(root, at, yard.asking, does);
    return;
  }

  root.appendChild(label('what it is thinking', { left: at.x, top: HEAD.label }));

  const thoughts = yard.session?.thoughts ?? [];
  const posted = yard.session?.plan ?? [];
  let top = HEAD.top;

  /* What it said it was going to do stays at the top and everything since
     scrolls under it, because the plan is what all of it is being measured
     against and scrolling away from it loses the measure. Only when it has
     actually posted one: the first thing an agent says is not a plan. */
  if (posted.length) {
    const said = box({ left: at.x, top, width: at.wide }, "font-family:'Josefin Sans',sans-serif");
    said.appendChild(label('what it means to do', {}));
    const list = stack({}, 4);
    list.style.position = 'relative';
    list.style.marginTop = '8px';
    for (const step of posted) {
      const line = row(10);
      const mark = document.createElement('span');
      mark.style.cssText = `width:14px;flex:none;color:${STEP[step.state]}`;
      mark.textContent = step.state === 'done' ? '·' : step.state === 'doing' ? '›' : ' ';
      const text = document.createElement('span');
      text.style.cssText = `font-size:14px;color:${STEP[step.state]}`;
      text.textContent = step.said;
      line.append(mark, text);
      list.appendChild(line);
    }
    said.appendChild(list);
    root.appendChild(said);
    top += said.offsetHeight + 20;
  }

  if (!thoughts.length) return;

  const room = Math.max(60, floor - top);
  const stream = stack({ left: at.x, top, width: at.wide, height: room }, 20);
  stream.style.cssText +=
    ";font-family:'Cormorant Garamond',serif;overflow-y:auto;pointer-events:auto";

  const older = yard.session?.olderThoughts ?? 0;
  if (older) stream.appendChild(exact(`\u25b8 ${older} more before these`, 12, '#8a7452'));

  /* Oldest first and dimmest first, so the column brightens as it comes down
     to what is happening now. The last one is set large and is the only thing
     on this screen that is. */
  thoughts.forEach((one, i) => {
    const far = thoughts.length - 1 - i;
    if (!far) {
      const it = document.createElement('div');
      it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
      it.appendChild(said(`now${one.at ? ` \u00b7 ${one.at} at this` : ''}`, '#ffc98a'));
      const body = document.createElement('span');
      body.style.cssText =
        'font-size:21px;line-height:1.35;color:#ffdca4;text-shadow:0 2px 10px rgba(0,0,0,.9)';
      body.textContent = one.said;
      it.appendChild(body);
      stream.appendChild(it);
      return;
    }
    stream.appendChild(
      thought(one, far > 2 ? 15 : 16, far > 2 ? 'rgba(244,227,192,.46)' : 'rgba(244,227,192,.62)')
    );
  });

  root.appendChild(stream);
  /* And it opens at the live edge, because what is happening now is what you
     came to read. */
  stream.scrollTop = stream.scrollHeight;
}

/** What a step of a posted plan looks like, behind them, under their hands, or ahead. */
const STEP: Record<string, string> = {
  done: 'rgba(244,227,192,.42)',
  doing: '#ffdca4',
  ahead: '#a89272',
};

/**
 * Somebody standing at the gate with a question.
 *
 * It takes the whole middle of the board, because whatever it was thinking
 * stopped when it came to ask and nothing under that matters until you answer.
 * A number key answers it; so does pressing the line, because a line you can
 * press by hand and not by key is only half there and the other way round is
 * no better.
 */
function gate(root: HTMLElement, at: { x: number; wide: number }, asking: Ask, does: Doings): void {
  root.appendChild(label('it is asking', { left: at.x, top: HEAD.label }));
  const said = box({ left: at.x, top: HEAD.top, width: at.wide }, ASKED);
  said.textContent = asking.said;
  root.appendChild(said);

  const answers = stack({ left: at.x, top: HEAD.top + 90, width: at.wide }, 12);
  for (const [i, answer] of asking.answers.entries()) {
    const line = row(12);
    const key = document.createElement('span');
    key.style.cssText = KEY;
    key.textContent = String(i + 1);
    line.appendChild(key);
    const press = astop(
      pressing(answer.said, () => does.answer(answer.id)),
      `answer:${answer.id}`
    );
    press.style.cssText += "font-family:'Josefin Sans',sans-serif;font-size:16px";
    line.appendChild(press);
    answers.appendChild(line);
  }
  root.appendChild(answers);
}

const ASKED = [
  "font-family:'Cormorant Garamond',serif",
  'font-size:21px',
  'line-height:1.35',
  'color:#ffdca4',
  'text-shadow:0 2px 10px rgba(0,0,0,.9)',
].join(';');

const KEY = [
  "font-family:'Courier Prime',monospace",
  'font-size:12px',
  'color:#482510',
  'background:#a89272',
  'padding:1px 6px',
  'flex:none',
].join(';');

function thought(one: Thought, size: number, ink: string, name?: string): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
  it.appendChild(said(name ? `${name} · ${one.when}` : one.when));
  const body = document.createElement('span');
  body.style.cssText = `font-size:${size}px;line-height:1.4;color:${ink}`;
  body.textContent = one.said;
  it.appendChild(body);
  return it;
}

/* ── what it made, what it did, and the ground ─────────────────────────────
   The cart at the top with whatever came out of the session on it, then the
   steps it took to get there with a prop from the kit standing for each, and
   at the foot of the column the yard itself: the fire, and everybody it sent
   out, placed by what they are doing rather than listed. */
function made(root: HTMLElement, at: { x: number; wide: number }, yard: Yard, floor: number): void {
  root.appendChild(
    rule({ left: at.x - GUTTER / 2, top: HEAD.rule + 12, width: 1, height: floor - HEAD.rule - 12 })
  );
  root.appendChild(label('what it made', { left: at.x, top: HEAD.label }));

  /* The ground is the foot of this column whatever happened above it, so
     everything else in here gets the room between the header and the yard and
     not one pixel more. In a short window that means the cart loses its
     itinerary and then what it did loses its beginning, in that order, rather
     than either of them being written over the ground. */
  const patch = floor - YARD_BOX.tall;
  const room = Math.max(0, patch - 44 - HEAD.top);
  const above = box({ left: at.x, top: HEAD.top, width: at.wide, height: room }, 'overflow:hidden');
  root.appendChild(above);

  const session = yard.session;
  const output = session?.made[0];
  let y = 0;
  if (output) {
    y = cart(above, at.wide, output);
  } else {
    /* An empty cart, said rather than drawn: a heading over nothing reads as
       something failing to load. */
    const empty = box({ left: 0, top: 8, width: at.wide }, EMPTY);
    empty.textContent = session ? 'nothing has come off the cart yet.' : '';
    above.appendChild(empty);
    y = 36;
  }

  above.appendChild(rule({ left: 0, top: y + 10, width: at.wide }));
  above.appendChild(label('what it did', { left: 0, top: y + 30 }));

  const top = y + 60;
  const left = Math.max(0, room - top);
  const steps = stack({ left: 0, top, width: at.wide, height: left }, 10);
  steps.style.cssText +=
    ";font-size:14px;line-height:1.3;font-family:'Josefin Sans',sans-serif;overflow:hidden";
  const earlier = session?.olderSteps;
  const count = exact('', 12, '#8a7452');
  steps.appendChild(count);
  for (const one of session?.steps ?? []) steps.appendChild(did(one));
  above.appendChild(steps);

  /* Appended first and counted after, because how many fit is a thing only the
     browser knows once the sprites in them have a height. */
  const dropped = trim(steps, left, 1);
  const many = (earlier?.many ?? 0) + dropped;
  count.textContent = many
    ? `\u25b8 ${many} earlier steps${earlier ? ` \u00b7 ${earlier.over}` : ''}`
    : '';

  ground(root, at, yard, floor);
}

/** The billboard and what is nailed to it. Returns where the next thing goes. */
function cart(root: HTMLElement, wide: number, output: Made): number {
  const board = sprite(KIT_NAMES.billboard, 2);
  board.style.cssText += ';left:0;top:-4px;filter:brightness(1.35)';
  root.appendChild(board);

  const beside = stack({ left: 148, top: 4, width: wide - 148, height: 104 }, 4);
  beside.style.overflow = 'hidden';
  const name = document.createElement('span');
  name.style.cssText =
    "font-family:'Caveat',cursive;font-size:22px;color:#f4e3c0;text-shadow:1px 2px 0 #120d07";
  name.textContent = output.what;
  beside.appendChild(name);
  const when = said(output.when, '#a8c469');
  when.style.cssText += ';font-size:12px;letter-spacing:.14em';
  beside.appendChild(when);
  if (output.warning) {
    const warn = document.createElement('span');
    warn.style.cssText = 'font-size:13px;color:#ff9a6a;margin-top:4px';
    warn.textContent = output.warning;
    beside.appendChild(warn);
  }
  root.appendChild(beside);
  /* What is nailed beside the board is the name, then when, then what is wrong
     with it, in that order of importance, and a board with no room for the
     third says two things rather than two and a half. */
  while (beside.scrollHeight > 104 && beside.children.length > 1) beside.lastChild?.remove();

  const lines = stack({ left: 0, top: 120, width: wide }, 6);
  for (const said of output.lines) {
    const line = document.createElement('span');
    line.style.cssText =
      "font-family:'Josefin Sans',sans-serif;font-size:14px;line-height:1.45;color:#dcc8a0";
    line.textContent = said;
    lines.appendChild(line);
  }
  root.appendChild(lines);
  return 120 + output.lines.length * 26 + 10;
}

/** One thing it did, with the prop that stands for it in a fixed slot. */
function did(one: Step): HTMLElement {
  const line = row(10);
  const slot = document.createElement('span');
  slot.style.cssText = 'width:44px;display:flex;justify-content:center;flex:none;position:relative';
  if (one.running) {
    /* Nothing spins in this village. Something happening now is a light that
       goes on and off, which is what a fire does. */
    slot.appendChild(
      box(
        { width: 11, height: 11 },
        'position:relative;border-radius:50%;background:#ff8a4a;box-shadow:0 0 0 5px rgba(255,138,74,.22);animation:yard-blink 700ms steps(1,end) infinite'
      )
    );
  } else {
    const prop = sprite(one.prop, 1);
    prop.style.position = 'relative';
    slot.appendChild(prop);
  }
  line.appendChild(slot);
  const text = document.createElement('span');
  text.style.color = one.running ? '#ffc98a' : '#f4e3c0';
  text.textContent = one.note ? `${one.did} · ${one.note}` : one.did;
  line.appendChild(text);
  return line;
}

/**
 * The ground, and everybody on it.
 *
 * A patch rather than a list. The fire is the session, and where somebody is
 * standing is what they are doing: in the light with their face to you means
 * back with an answer, out in the dark with their back turned means still
 * working, and the further out the longer they have been gone. Only the ones
 * that need you get named; everybody else is a body, and a count says the rest.
 */
function ground(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number
): void {
  const hands = yard.session?.agents ?? [];
  const top = floor - YARD_BOX.tall;
  root.appendChild(rule({ left: at.x, top: top - 36, width: at.wide }));

  const head = box({ left: at.x, top: top - 22, width: at.wide }, HEAD_ROW);
  const name = label('the yard', {});
  name.style.position = 'relative';
  head.appendChild(name);
  const back = hands.filter((one) => one.where === 'in-light').length;
  head.appendChild(
    exact(`${hands.length} hands · ${back} back · ${hands.length - back} out`, 11, '#bfa476')
  );
  root.appendChild(head);

  const patch = box(
    { left: at.x, top, width: at.wide, height: YARD_BOX.tall },
    'overflow:hidden;background:#181410;border:2px solid #3a2712'
  );
  patch.style.position = 'absolute';

  /* The fire sits a little below and left of centre, and its light is the only
     thing telling you where the middle of this place is. */
  const fireX = Math.round(at.wide / 2) - 23;
  const fireY = 117;
  const strength =
    burningOf(yard) === 'lit'
      ? 0.34
      : burningOf(yard) === 'banked'
        ? 0.2
        : burningOf(yard) === 'embers'
          ? 0.12
          : 0.04;
  patch.appendChild(
    firelight({ left: fireX - 147, top: fireY - 104, width: 340, height: 240 }, strength, false)
  );
  /* The fire is the session. Lit is somebody working, banked is somebody who
     has stopped and is standing at the gate, embers is finished, and out is
     nobody home. Only a lit fire breathes; a banked one is still. */
  const burning = yard.session?.fire ?? 'out';
  const fire = sprite(burning === 'out' ? KIT_NAMES.fireOut : KIT_NAMES.fire, 1);
  fire.style.cssText += `;left:${fireX}px;top:${fireY}px`;
  if (burning === 'lit') {
    fire.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
  }
  if (burning === 'banked') fire.style.filter = 'brightness(.62)';
  if (burning === 'embers') fire.style.filter = 'brightness(.45) saturate(.8)';
  patch.appendChild(fire);

  for (const [i, hand] of hands.entries()) patch.appendChild(standing(hand, i, at.wide));

  const here = yard.session;
  if (here) {
    const under = exact(
      `${here.agent}${here.thoughts.find((t) => t.live)?.at ? ` · ${here.thoughts.find((t) => t.live)?.at}` : ''}`,
      11,
      '#dcc8a0'
    );
    const at2 = box({ left: fireX - 20, top: fireY + 37 });
    at2.appendChild(under);
    patch.appendChild(at2);
  }

  root.appendChild(patch);
}

const EMPTY = ["font-family:'Josefin Sans',sans-serif", 'font-size:14px', 'color:#a89272'].join(
  ';'
);

const HEAD_ROW =
  'display:flex;align-items:baseline;justify-content:space-between;white-space:nowrap';

/** How the fire is burning, which the light in the yard follows. */
function burningOf(yard: Yard): string {
  return yard.session?.fire ?? 'out';
}

/** One agent, standing where their state puts them. */
function standing(hand: Hand, i: number, wide: number): HTMLElement {
  const out = hand.where === 'out';
  /* In the light they cluster round the fire; out in the dark they are off to
     the side, and further off the longer they have been gone. */
  const near = [
    { left: Math.round(wide / 2) - 50, top: 70, flip: true },
    { left: Math.round(wide / 2) + 32, top: 72, flip: false },
    { left: Math.round(wide / 2) - 10, top: 102, flip: false },
  ];
  const spot = out
    ? { left: wide - 38 - (i % 2) * 16, top: 30 + (i % 3) * 28, flip: false }
    : (near[i % near.length] ?? near[0]!);

  const it = box({ left: spot.left, top: spot.top, width: 28, height: 54 });
  const figure = folk(out ? 'back' : 'front', { left: 0, top: 0 });
  figure.style.filter = out ? 'brightness(.5) saturate(.6)' : 'brightness(.95)';
  if (out) figure.style.animation = 'yard-step 800ms steps(2,end) infinite';
  if (spot.flip) figure.style.transform = 'scaleX(-1)';
  /* Identity, never status: an agent keeps its colour for the life of the
     session, so you can follow the same one across the yard. */
  figure.style.mixBlendMode = 'normal';
  it.appendChild(figure);

  if (out) {
    it.appendChild(
      box(
        { left: -6, top: -8, width: 8, height: 8 },
        'border-radius:50%;background:#ff8a4a;animation:yard-blink 700ms steps(1,end) infinite'
      )
    );
    const name = box({ left: -66, top: 52 });
    name.appendChild(exact(`${hand.errand} · out ${hand.gone ?? ''}`.trim(), 11, '#ffc98a'));
    it.appendChild(name);
  }
  return it;
}

/**
 * What is in your hands, beside the line.
 *
 * A picture is the one thing an agent can be shown, and it cannot be drawn on
 * the board, because the board is writing. So what the board says is that you
 * have it: it waits here until you say something and then goes with what you
 * said, and pressing it puts it down again.
 */
function carried(hands: HTMLElement, yard: Yard, does: Doings): void {
  hands.replaceChildren();
  for (const one of yard.session?.carrying ?? []) {
    const held = astop(
      pressing(`▣ ${one.name}`, () => does.press(`putdown:${one.id}`)),
      `carrying:${one.id}`
    );
    held.style.cssText += "font-family:'Courier Prime',monospace;font-size:12px";
    hands.appendChild(held);
  }
}

/* ── the one place you write ───────────────────────────────────────────────
   One line, no box, no hint, and a cursor that is the only thing on this
   screen saying the app is awake. */
/**
 * What you said while somebody was busy and they have not heard yet.
 *
 * It waits in the open above the line rather than disappearing into a queue,
 * because a thing you said that has not happened yet is a thing you might want
 * back, and pressing one takes it back.
 */
function still(root: HTMLElement, yard: Yard, edge: number, does: Doings): void {
  const waiting = yard.session?.waiting ?? [];
  if (!waiting.length) return;
  const at = stack({ left: edge, right: edge, bottom: 196 }, 4);
  at.appendChild(label('still to say, press to take one back', {}));
  for (const one of waiting) {
    const press = astop(
      pressing(one.said, () => does.press(`unsay:${one.id}`)),
      `unsay:${one.id}`
    );
    press.style.cssText += "font-family:'Caveat',cursive;font-size:18px";
    at.appendChild(press);
  }
  root.appendChild(at);
}

function said_line(root: HTMLElement, edge: number): void {
  root.appendChild(rule({ left: edge, right: edge, bottom: 186 }, true));
}

/* ── the rail ──────────────────────────────────────────────────────────────
   One lantern per session, hung off a beam. Lit means somebody is awake in
   there; dark is resting, still being cut, or broken. The one you are standing
   in hangs lowest and brightest, and the one that wants you flickers. */
function rail(root: HTMLElement, yard: Yard, cramped: boolean, edge: number, does: Doings): void {
  const beam = box({
    left: edge,
    right: edge,
    bottom: 0,
    height: cramped ? RAIL_BARE : RAIL_TALL,
  });
  beam.appendChild(box({ left: 0, right: 0, top: 0, height: 3 }, 'background:#3a2712'));

  /* Evenly along whatever beam there is, never wider apart than the designs
     hang them and never so close that two names touch. Past that the beam
     scrolls sideways rather than the lanterns getting any nearer. */
  const room = window.innerWidth - edge * 2;
  /* One more hook than there are lanterns, because the end of the rail is
     where a new session gets hung. */
  const step = Math.min(LANTERN_STEP, Math.floor(room / (yard.rail.length + 1)));
  const bare = cramped || step < 140;

  for (const [i, one] of yard.rail.entries()) {
    const x = i * step;
    const cord = one.here ? LANTERN.cordHere : LANTERN.cord;
    const top = 3 + cord;
    beam.appendChild(box({ left: x + 10, top: 3, width: 3, height: cord }, 'background:#3a2712'));

    if (one.lit) {
      const strength = one.here ? 0.3 : one.posture === 'wants-you' ? 0.16 : 0;
      if (strength) {
        beam.appendChild(
          firelight({ left: x - 34, top: top - 24, width: 90, height: 90 }, strength)
        );
      }
    }

    const lamp = sprite(one.lit ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 2);
    lamp.style.cssText += `;left:${x}px;top:${top}px`;
    const dimmed = one.here ? '' : 'brightness(.75)';
    lamp.style.filter = dimmed;
    if (one.posture === 'wants-you') {
      lamp.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
    }
    beam.appendChild(lamp);

    /* The one place in this app where a pressable thing is not gold.
       Everywhere else gold means "press me" and nothing else is gold; the rail
       keeps its posture tints because the rail's whole job is telling you, from
       across the room and without reading, which session wants you. Six gold
       names in a row would say nothing at all. What says it is pressable is the
       lantern: a physical object hanging there, lighting under your hand. */
    const hung = box({ left: x, top, width: bare ? 44 : Math.max(step, 120), height: 58 });
    hung.style.pointerEvents = one.here ? 'none' : 'auto';
    hung.style.cursor = 'default';

    /* A short window keeps the lanterns and gives up the words beside them:
       lit, dark, flickering and hanging lowest still say which is which. */
    if (!bare) {
      const name = box({ left: 34, top: 2 });
      const written = exact(one.name, one.here ? 13 : 12, one.here ? '#ffdca4' : TONE[one.posture]);
      /* The keyboard stands on the name rather than on the whole lantern,
         because the mark it leaves is a fill and a fill the size of a lantern
         is a slab of gold across the bottom of the screen. */
      if (!one.here) astop(written, `rail:${one.id}`);
      name.appendChild(written);
      hung.appendChild(name);
      const under = box({ left: 34, top: 20 });
      under.appendChild(exact(one.saying, 11, one.here ? '#dcc8a0' : '#a89272'));
      hung.appendChild(under);
    }

    if (!one.here) {
      if (bare) astop(lamp, `rail:${one.id}`);
      hung.addEventListener('mousedown', (event) => event.preventDefault());
      hung.addEventListener('click', () => does.open(one.id));
      hung.addEventListener('pointerenter', () => (lamp.style.filter = 'brightness(1.15)'));
      hung.addEventListener('pointerleave', () => (lamp.style.filter = dimmed));
    }
    beam.appendChild(hung);
  }

  /* An empty hook at the end of the rail. Pressing it asks what is going to
     happen in the new session, which is the only question a session starts
     with and the only one it needs. */
  const spare = yard.rail.length * step;
  beam.appendChild(box({ left: spare + 10, top: 3, width: 3, height: LANTERN.cord }, HOOK));
  const start = astop(
    pressing('hang a new one', () => does.press('new')),
    'rail:new'
  );
  start.style.cssText += "font-family:'Courier Prime',monospace;font-size:12px";
  const at = box({ left: spare + 34, top: 3 + LANTERN.cord + 2 });
  at.appendChild(start);
  beam.appendChild(at);
  root.appendChild(beam);
}

const HOOK = 'background:#3a2712';
